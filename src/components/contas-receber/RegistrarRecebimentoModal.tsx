import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useSupabaseRecebimentos } from "@/hooks/useSupabaseRecebimentos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";
import ProximoPassoSnackbar from "@/components/modals/ProximoPassoSnackbar";

interface RegistrarRecebimentoModalProps {
  titulo: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function RegistrarRecebimentoModal({
  titulo,
  open,
  onOpenChange,
  onSuccess,
}: RegistrarRecebimentoModalProps) {
  const [valorReceber, setValorReceber] = useState(titulo.saldo?.toString() || "0");
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
  const [forma, setForma] = useState<'Boleto' | 'PIX' | 'Cartão' | 'Dinheiro' | 'Transferência'>('PIX');
  const [desconto, setDesconto] = useState("0");
  const [jurosMulta, setJurosMulta] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [gerarRecibo, setGerarRecibo] = useState(false);
  const [notificarCliente, setNotificarCliente] = useState(false);
  const [showProximoPasso, setShowProximoPasso] = useState(false);
  const [tituloAtualizado, setTituloAtualizado] = useState<any>(null);
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  const { updateTitulo } = useSupabaseTitulos(lojaAtual?.id);
  const { createRecebimento } = useSupabaseRecebimentos(lojaAtual?.id);

  const valorReceberNum = parseFloat(valorReceber) || 0;
  const descontoNum = parseFloat(desconto) || 0;
  const jurosMultaNum = parseFloat(jurosMulta) || 0;
  const valorLiquido = valorReceberNum - descontoNum + jurosMultaNum;

  const handleSubmit = async () => {
    if (valorReceberNum <= 0) {
      toast({
        title: "Erro",
        description: "O valor a receber deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    if (valorLiquido > (titulo.saldo || 0)) {
      toast({
        title: "Erro",
        description: "O valor líquido não pode ser maior que o saldo do título.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Criar o recebimento
      await createRecebimento.mutateAsync({
        titulo_id: titulo.id,
        loja_id: lojaAtual?.id,
        data: dataRecebimento,
        forma,
        valor_bruto: valorReceberNum,
        desconto: descontoNum,
        juros_multa: jurosMultaNum,
        valor_liquido: valorLiquido,
        usuario: 'Admin',
        observacoes,
      });

      // Atualizar o título
      const novoPago = (titulo.pago || 0) + valorLiquido;
      const novoSaldo = Math.max(0, (titulo.valor || 0) - novoPago);
      let novoStatus = titulo.status;
      
      if (novoSaldo === 0) {
        novoStatus = 'QUITADO';
      } else if (novoPago > 0) {
        novoStatus = 'PARCIAL';
      }

      // Adicionar evento à timeline
      const novoEvento = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        tipo: 'recebimento' as const,
        descricao: novoSaldo === 0 ? 'Recebimento total - título quitado' : 'Recebimento parcial',
        usuario: 'Admin',
        meta: {
          valor: valorReceberNum,
          forma,
          desconto: descontoNum,
          juros: jurosMultaNum,
          valorLiquido,
        }
      };

      const timelineAtualizada = [...(titulo.timeline || []), novoEvento];

      await updateTitulo.mutateAsync({
        id: titulo.id,
        pago: novoPago,
        saldo: novoSaldo,
        status: novoStatus,
        timeline: timelineAtualizada,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Recebimento registrado",
        description: `Recebimento de R$ ${valorLiquido.toLocaleString('pt-BR')} registrado com sucesso.${novoSaldo === 0 ? ' Título quitado!' : ''}`,
        duration: 2000
      });

      if (gerarRecibo) {
        toast({
          title: "Recibo gerado",
          description: "Recibo de pagamento foi gerado (mock).",
          duration: 1500
        });
      }

      if (notificarCliente) {
        toast({
          title: "Cliente notificado",
          description: "Cliente foi notificado sobre o recebimento (mock).",
          duration: 1500
        });
      }

      // Se é recebimento parcial, mostrar snackbar de próximo passo
      if (novoSaldo > 0) {
        const tituloAtualizadoCompleto = { ...titulo, pago: novoPago, saldo: novoSaldo, status: novoStatus };
        setTituloAtualizado(tituloAtualizadoCompleto);
        setShowProximoPasso(true);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao registrar recebimento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o recebimento.",
        variant: "destructive"
      });
    }
  };

  const handleGerar2aVia = () => {
    setShowProximoPasso(false);
    onOpenChange(false);
    
    toast({
      title: "2ª via gerada",
      description: "Segunda via do saldo foi gerada (mock).",
      duration: 2000
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do título */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Cliente:</p>
                  <p>{titulo.cliente?.nome || titulo.cliente?.razao_social || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Título:</p>
                  <p>{titulo.numero}</p>
                </div>
                <div>
                  <p className="font-medium">Valor Original:</p>
                  <p>R$ {(titulo.valor || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="font-medium">Saldo Atual:</p>
                  <p className="font-bold text-primary">R$ {(titulo.saldo || 0).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de recebimento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valorReceber">Valor a Receber *</Label>
              <Input
                id="valorReceber"
                type="number"
                step="0.01"
                value={valorReceber}
                onChange={(e) => setValorReceber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dataRecebimento">Data do Recebimento *</Label>
              <Input
                id="dataRecebimento"
                type="date"
                value={dataRecebimento}
                onChange={(e) => setDataRecebimento(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="forma">Forma de Recebimento *</Label>
              <select
                id="forma"
                value={forma}
                onChange={(e) => setForma(e.target.value as any)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground mt-1"
              >
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>
            <div>
              <Label htmlFor="desconto">Desconto</Label>
              <Input
                id="desconto"
                type="number"
                step="0.01"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="jurosMulta">Juros/Multa</Label>
              <Input
                id="jurosMulta"
                type="number"
                step="0.01"
                value={jurosMulta}
                onChange={(e) => setJurosMulta(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="valorLiquido">Valor Líquido</Label>
              <Input
                id="valorLiquido"
                type="text"
                value={`R$ ${valorLiquido.toLocaleString('pt-BR')}`}
                readOnly
                className="mt-1 bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="gerarRecibo"
                checked={gerarRecibo}
                onChange={(e) => setGerarRecibo(e.target.checked)}
              />
              <Label htmlFor="gerarRecibo">Gerar Recibo (mock)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notificarCliente"
                checked={notificarCliente}
                onChange={(e) => setNotificarCliente(e.target.checked)}
              />
              <Label htmlFor="notificarCliente">Notificar cliente (mock)</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Registrar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {showProximoPasso && (
      <ProximoPassoSnackbar 
        tipo="recebimento-parcial"
        dados={{ titulo: tituloAtualizado }}
        onAction={handleGerar2aVia}
      />
    )}
    </>
  );
}