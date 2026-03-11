import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";
import { gerarContratoPDFBase64, downloadContratoPDF } from "@/utils/contrato-pdf";
import { supabase } from "@/integrations/supabase/client";

interface ContratoRascunho {
  cliente: {
    nomeRazao: string;
    documento: string;
    endereco: any;
    email?: string;
    telefone?: string;
  };
  itens: Array<{
    equipamento: {
      nome: string;
      codigo: string;
    };
    quantidade: number;
    periodoEscolhido: string;
    valorUnitario: number;
    subtotal: number;
  }>;
  entrega: {
    data: string;
    janela: string;
    observacoes?: string;
  };
  pagamento: {
    forma: string;
    vencimentoISO: string;
  };
  valorTotal: number;
  contratoId?: string;
}

interface ContratoResumoPreviewProps {
  open: boolean;
  onClose: () => void;
  contrato: ContratoRascunho;
  onEnviarAssinatura: () => void;
}

const formatarPeriodo = (periodo: string) => {
  const periodos: Record<string, string> = {
    'DIARIA': 'Diária', 'SEMANA': 'Semanal', 'QUINZENA': 'Quinzenal',
    '21DIAS': '21 Dias', 'MES': 'Mensal'
  };
  return periodos[periodo] || periodo;
};

const formatarForma = (forma: string) => {
  const formas: Record<string, string> = {
    'BOLETO': 'Boleto Bancário', 'PIX': 'PIX', 'CARTAO': 'Cartão', 'DINHEIRO': 'Dinheiro'
  };
  return formas[forma] || forma;
};

export function ContratoResumoPreview({ 
  open, onClose, contrato, onEnviarAssinatura
}: ContratoResumoPreviewProps) {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);

  const handleBaixarPDF = () => {
    try {
      const pdfData = {
        cliente: {
          nomeRazao: contrato.cliente.nomeRazao || '',
          documento: contrato.cliente.documento || '',
          endereco: contrato.cliente.endereco,
        },
        itens: (contrato.itens || []).map(item => ({
          equipamento: {
            nome: item.equipamento?.nome || '',
            codigo: item.equipamento?.codigo || '',
          },
          quantidade: item.quantidade || 1,
          periodoEscolhido: item.periodoEscolhido || '',
          valorUnitario: item.valorUnitario || 0,
          subtotal: item.subtotal || 0,
        })),
        entrega: {
          data: contrato.entrega?.data || new Date().toISOString(),
          janela: contrato.entrega?.janela || 'MANHA',
          observacoes: contrato.entrega?.observacoes,
        },
        pagamento: {
          forma: contrato.pagamento?.forma || '',
          vencimentoISO: contrato.pagamento?.vencimentoISO || new Date().toISOString(),
        },
        valorTotal: contrato.valorTotal || 0,
      };
      downloadContratoPDF(pdfData, `contrato-${(contrato.cliente.nomeRazao || 'cliente').replace(/\s+/g, '-')}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast({ title: "Erro ao gerar PDF", description: String(err), variant: "destructive" });
    }
  };

  const handleEnviarAssinatura = async () => {
    if (!contrato.contratoId) {
      toast({ title: "Salve o contrato antes de enviar para assinatura", variant: "destructive" });
      return;
    }

    setEnviando(true);
    try {
      const pdfBase64 = gerarContratoPDFBase64(contrato);

      const { data, error } = await supabase.functions.invoke('zapsign-enviar', {
        body: {
          pdf_base64: pdfBase64,
          nome_documento: `Contrato - ${contrato.cliente.nomeRazao}`,
          signatario: {
            nome: contrato.cliente.nomeRazao,
            email: contrato.cliente.email || '',
            telefone: contrato.cliente.telefone || '',
          },
          contrato_id: contrato.contratoId,
        },
      });

      if (error) throw error;

      if (data?.sign_url) {
        window.open(data.sign_url, '_blank');
      }

      toast({ title: "Contrato enviado para assinatura!" });
      onEnviarAssinatura();
      onClose();
    } catch (err: any) {
      console.error('Erro ao enviar para assinatura:', err);
      toast({ 
        title: "Erro ao enviar para assinatura", 
        description: err?.message || 'Tente novamente',
        variant: "destructive" 
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <DialogTitle>Contrato de Locação - Resumo</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cabeçalho da Empresa */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-primary">{APP_CONFIG.company.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              CNPJ: {APP_CONFIG.company.cnpj} • IE: {APP_CONFIG.company.ie}
            </p>
            <p className="text-sm text-muted-foreground">
              {APP_CONFIG.company.address.street} - {APP_CONFIG.company.address.district}, {APP_CONFIG.company.address.city}/{APP_CONFIG.company.address.state} • WhatsApp: {APP_CONFIG.company.contact.phone}
            </p>
          </div>

          {/* Dados do Cliente */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Dados do Cliente</h3>
              <div className="space-y-1">
                <p><strong>{contrato.cliente.nomeRazao}</strong></p>
                <p className="text-sm text-muted-foreground">{contrato.cliente.documento}</p>
                {contrato.cliente.endereco && (
                  <p className="text-sm text-muted-foreground">
                    {contrato.cliente.endereco.logradouro}, {contrato.cliente.endereco.numero} - 
                    {contrato.cliente.endereco.bairro}, {contrato.cliente.endereco.cidade}/{contrato.cliente.endereco.uf}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Entrega</h3>
              <div className="space-y-1">
                <p><strong>Data:</strong> {new Date(contrato.entrega.data).toLocaleDateString('pt-BR')}</p>
                <p><strong>Período:</strong> {contrato.entrega.janela === 'MANHA' ? 'Manhã' : 'Tarde'}</p>
                {contrato.entrega.observacoes && (
                  <p className="text-sm text-muted-foreground">{contrato.entrega.observacoes}</p>
                )}
              </div>
            </div>
          </div>

          {/* Equipamentos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Equipamentos Locados</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Equipamento</th>
                    <th className="p-3 font-medium text-center">Qtd</th>
                    <th className="p-3 font-medium text-center">Período</th>
                    <th className="p-3 font-medium text-right">Valor Unit.</th>
                    <th className="p-3 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {contrato.itens.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{item.equipamento.nome}</p>
                          <p className="text-sm text-muted-foreground">{item.equipamento.codigo}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">{item.quantidade}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">{formatarPeriodo(item.periodoEscolhido)}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        R$ {item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right">
                        R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-primary/10">
                  <tr>
                    <td colSpan={4} className="p-3 font-semibold text-right">Total Geral:</td>
                    <td className="p-3 font-bold text-right text-primary">
                      R$ {contrato.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-primary">Condições de Pagamento</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <p><strong>Forma:</strong> {formatarForma(contrato.pagamento.forma)}</p>
              <p><strong>Vencimento:</strong> {new Date(contrato.pagamento.vencimentoISO).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Assinatura */}
          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            <p>Este documento representa um resumo do contrato de locação.</p>
            <p>O PDF completo será gerado e enviado para assinatura digital via ZapSign.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar Preview
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleBaixarPDF}>
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button 
            onClick={handleEnviarAssinatura}
            disabled={enviando}
            className="gap-2 flex-1"
          >
            <Send className="h-4 w-4" />
            {enviando ? 'Enviando...' : 'Enviar p/ Assinatura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
