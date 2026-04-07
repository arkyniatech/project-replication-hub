import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, 
  Send, 
  CreditCard, 
  CalendarIcon,
  Eye,
  Download,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  QrCode
} from "lucide-react";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { FaturamentoPreviewModal } from "./FaturamentoPreviewModal";
import { FaturaPreviewDrawer } from "./FaturamentoTimelineDrawer";
import { formatCurrency, cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { BackendInterAdapter } from "@/services/bolepix/BackendInterAdapter";
import { useSupabaseCobrancasInter } from "@/hooks/useSupabaseCobrancasInter";

export function FaturamentoCarrinho() {
  const { lojaAtual } = useMultiunidade();
  const { 
    lancamentosFaturaveis, 
    kpis,
    config,
    emitirFatura, 
    gerarCobranca, 
    enviarFatura,
    addException
  } = useFaturamentoStore();
  
  const { can } = usePermissions();
  const { createCobranca } = useSupabaseCobrancasInter(lojaAtual?.id);
  
  const [vencimento, setVencimento] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [formaPagamento, setFormaPagamento] = useState<'PIX' | 'BOLETO' | 'OUTRO'>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [instrucoesCobranca, setInstrucoesCobranca] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isEmitindo, setIsEmitindo] = useState(false);
  const [isGerandoCobranca, setIsGerandoCobranca] = useState(false);
  const [isEmitindoInter, setIsEmitindoInter] = useState(false);
  
  const itensSelecionados = lancamentosFaturaveis.filter(l => l.selecionado);
  const clientesSelecionados = [...new Set(itensSelecionados.map(l => l.clienteId))];
  
  const totais = {
    base: itensSelecionados.reduce((sum, item) => sum + item.subtotal, 0),
    descontos: 0,
    impostos: 0, // placeholder
    total: itensSelecionados.reduce((sum, item) => sum + item.subtotal, 0),
    itensSelecionados: itensSelecionados.length
  };

  const podeEmitir = itensSelecionados.length > 0 && vencimento && clientesSelecionados.length === 1;
  const clienteSelecionado = clientesSelecionados.length === 1 
    ? itensSelecionados[0] 
    : null;

  const handleEmitirFatura = async () => {
    if (!clienteSelecionado) {
      toast.error("Selecione itens de apenas um cliente para faturamento");
      return;
    }

    // Check inadimplência
    if (config.bloqueioInadimplencia && kpis.emAtraso > 0) {
      addException({
        tipo: 'INADIMPLENCIA_BLOQUEADA',
        titulo: 'Cliente com pendências em atraso',
        descricao: `O cliente possui R$ ${formatCurrency(kpis.emAtraso)} em atraso. Justificativa necessária para prosseguir.`,
        acaoRequerida: 'JUSTIFICATIVA'
      });
      return;
    }

    setIsEmitindo(true);
    
    try {
      const faturaId = emitirFatura({
        unidadeId: lojaAtual?.id || 'loja1',
        clienteId: clienteSelecionado.clienteId,
        clienteNome: clienteSelecionado.clienteNome,
        vencimento,
        formaPagamento,
        observacoes,
        instrucoesCobranca
      });

      toast.success("Fatura emitida com sucesso!", {
        description: `Fatura gerada para ${clienteSelecionado.clienteNome}`,
        action: {
          label: "Ver Timeline",
          onClick: () => setShowTimeline(true)
        }
      });

      // Auto-gerar cobrança se PIX/Boleto
      if (formaPagamento !== 'OUTRO') {
        setTimeout(() => handleGerarCobranca(faturaId), 1000);
      }

    } catch (error) {
      toast.error("Erro ao emitir fatura", {
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    } finally {
      setIsEmitindo(false);
    }
  };

  const handleGerarCobranca = async (faturaId?: string) => {
    if (!faturaId && !clienteSelecionado) return;
    
    setIsGerandoCobranca(true);
    
    try {
      const result = await gerarCobranca(faturaId || 'temp');
      
      if (result.success) {
        toast.success("Cobrança gerada com sucesso!", {
          description: "PIX e boleto disponíveis para envio"
        });
      } else {
        toast.error("Erro ao gerar cobrança", {
          description: result.error
        });
      }
    } catch (error) {
      toast.error("Erro na comunicação com o banco");
    } finally {
      setIsGerandoCobranca(false);
    }
  };

  const handleEnviarFatura = (canal: 'EMAIL' | 'WHATSAPP') => {
    if (!clienteSelecionado) return;
    
    const destinatario = canal === 'EMAIL' 
      ? 'cliente@exemplo.com' 
      : '+55 11 99999-9999';
    
    enviarFatura('temp_fatura_id', canal, destinatario);
    
    toast.success(`Fatura enviada via ${canal}`, {
      description: `Enviado para ${destinatario}`
    });
  };

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Carrinho de Faturamento
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Totais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Totais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Itens selecionados:</span>
                <Badge variant="outline">{totais.itensSelecionados}</Badge>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Base:</span>
                <span className="font-mono">{formatCurrency(totais.base)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Descontos:</span>
                <span className="font-mono">-{formatCurrency(totais.descontos)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Impostos (est.):</span>
                <span className="font-mono">{formatCurrency(totais.impostos)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-semibold">
                <span>Total a faturar:</span>
                <span className="font-mono text-primary">
                  {formatCurrency(totais.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cliente Info */}
          {clientesSelecionados.length > 1 && (
            <Card className="border-warning bg-warning/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-warning-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Múltiplos clientes selecionados. Selecione itens de apenas um cliente.
                </div>
              </CardContent>
            </Card>
          )}

          {clienteSelecionado && (
            <Card>
              <CardContent className="p-3">
                <div className="text-sm">
                  <div className="font-medium">{clienteSelecionado.clienteNome}</div>
                  <div className="text-muted-foreground">
                    Em atraso: {formatCurrency(kpis.emAtraso)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campos da Fatura */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados da Fatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vencimento */}
              <div className="space-y-2">
                <Label htmlFor="vencimento">Vencimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !vencimento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {vencimento ? format(new Date(vencimento), "dd/MM/yyyy") : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={vencimento ? new Date(vencimento) : undefined}
                      onSelect={(date) => setVencimento(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="forma">Forma de Pagamento</Label>
                <Select value={formaPagamento} onValueChange={(v: any) => setFormaPagamento(v)}>
                  <SelectTrigger id="forma">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="obs">Observações</Label>
                <Textarea
                  id="obs"
                  placeholder="Observações que aparecerão na fatura..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Instruções */}
              {formaPagamento !== 'OUTRO' && (
                <div className="space-y-2">
                  <Label htmlFor="instrucoes">Instruções de Cobrança</Label>
                  <Textarea
                    id="instrucoes"
                    placeholder="Instruções específicas para o boleto..."
                    value={instrucoesCobranca}
                    onChange={(e) => setInstrucoesCobranca(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="border-t p-4 space-y-3">
          {/* Preview */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowPreview(true)}
            disabled={!podeEmitir}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview da Fatura
          </Button>

          {/* Emitir */}
          <Button
            className="w-full"
            onClick={handleEmitirFatura}
            disabled={!podeEmitir || isEmitindo || !can('financeiro', 'emitirFatura')}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isEmitindo ? "Emitindo..." : "Emitir Fatura"}
          </Button>

          {/* Cobrança */}
          {formaPagamento !== 'OUTRO' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleGerarCobranca()}
              disabled={!podeEmitir || isGerandoCobranca || !can('financeiro', 'emitirFatura')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isGerandoCobranca ? "Gerando..." : "Gerar Cobrança"}
            </Button>
          )}

          {/* Emitir BolePix Inter */}
          {formaPagamento !== 'OUTRO' && (
            <Button
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
              onClick={async () => {
                if (!clienteSelecionado || !lojaAtual) return;
                setIsEmitindoInter(true);
                try {
                  const adapter = new BackendInterAdapter(lojaAtual.id);
                  const result = await adapter.emitCharge({
                    valor: totais.total,
                    vencimento,
                    sacado: {
                      nome: clienteSelecionado.clienteNome,
                      cpfCnpj: '',
                      email: '',
                    },
                    pixHabilitado: formaPagamento === 'PIX',
                    idempotencyKey: `FAT-${Date.now()}`,
                  });
                  toast.success("BolePix Inter emitido!", {
                    description: `Código: ${result.codigoSolicitacao}`
                  });
                } catch (error: any) {
                  toast.error("Erro ao emitir BolePix", { description: error.message });
                } finally {
                  setIsEmitindoInter(false);
                }
              }}
              disabled={!podeEmitir || isEmitindoInter}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {isEmitindoInter ? "Emitindo Inter..." : "Emitir BolePix Inter"}
            </Button>
          )}

          {/* Envios */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleEnviarFatura('EMAIL')}
              disabled={!can('financeiro', 'emitirFatura')}
            >
              <Send className="mr-1 h-3 w-3" />
              E-mail
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleEnviarFatura('WHATSAPP')}
              disabled={!can('financeiro', 'emitirFatura')}
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              WhatsApp
            </Button>
          </div>

          {/* Timeline */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowTimeline(true)}
          >
            Ver Timeline
          </Button>
        </div>
      </div>

      {/* Modals */}
      <FaturamentoPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        itens={itensSelecionados}
        totais={totais}
        vencimento={vencimento}
        observacoes={observacoes}
      />

      <FaturaPreviewDrawer
        open={showTimeline}
        onOpenChange={setShowTimeline}
      />
    </>
  );
}