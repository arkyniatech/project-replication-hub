import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Send, 
  CalendarIcon,
  Eye,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  QrCode,
  CheckCircle2,
  Loader2
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
import { supabase } from "@/integrations/supabase/client";
import { generateNumber } from "@/lib/numeracao";

interface TituloGerado {
  id: string;
  numero: string;
  valor: number;
  vencimento: string;
  clienteNome: string;
  clienteCpfCnpj: string;
}

export function FaturamentoCarrinho() {
  const { lojaAtual } = useMultiunidade();
  const { 
    lancamentosFaturaveis, 
    kpis,
    config,
    addException,
    addTimelineEvent,
    enviarFatura
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
  
  // Post-emission state
  const [showBolePixDialog, setShowBolePixDialog] = useState(false);
  const [titulosGerados, setTitulosGerados] = useState<TituloGerado[]>([]);
  const [isEmitindoBolePix, setIsEmitindoBolePix] = useState(false);
  const [bolePixProgress, setBolePixProgress] = useState({ done: 0, total: 0 });
  
  const itensSelecionados = lancamentosFaturaveis.filter(l => l.selecionado);
  const clientesSelecionados = [...new Set(itensSelecionados.map(l => l.clienteId))];
  
  const totais = {
    base: itensSelecionados.reduce((sum, item) => sum + item.subtotal, 0),
    descontos: 0,
    impostos: 0,
    total: itensSelecionados.reduce((sum, item) => sum + item.subtotal, 0),
    itensSelecionados: itensSelecionados.length
  };

  const podeEmitir = itensSelecionados.length > 0 && vencimento && clientesSelecionados.length === 1;
  const clienteSelecionado = clientesSelecionados.length === 1 
    ? itensSelecionados[0] 
    : null;

  const handleEmitirFatura = async () => {
    if (!clienteSelecionado || !lojaAtual) {
      toast.error("Selecione itens de apenas um cliente para faturamento");
      return;
    }

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
      const user = (await supabase.auth.getUser()).data.user;
      const faturaNumero = generateNumber('fatura', lojaAtual.id);
      
      // 1. Create fatura in Supabase
      const { data: faturaData, error: faturaError } = await (supabase as any)
        .from('faturas')
        .insert({
          numero: faturaNumero,
          loja_id: lojaAtual.id,
          cliente_id: clienteSelecionado.clienteId,
          contrato_id: itensSelecionados[0]?.contratoId || null,
          tipo: 'LOCACAO',
          forma_preferida: formaPagamento,
          vencimento: new Date(vencimento).toISOString(),
          emissao: new Date().toISOString(),
          total: totais.total,
          observacoes: observacoes || null,
          itens: itensSelecionados.map(item => ({
            descricao: item.itemDescricao,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
            contratoId: item.contratoId,
            contratoNumero: item.contratoNumero,
            periodo: item.periodo,
          })),
          created_by: user?.id,
        })
        .select()
        .single();

      if (faturaError) throw faturaError;

      // 2. Create titulo(s) in Supabase linked to fatura
      const tituloNumero = generateNumber('titulo', lojaAtual.id);
      const { data: tituloData, error: tituloError } = await (supabase as any)
        .from('titulos')
        .insert({
          numero: tituloNumero,
          loja_id: lojaAtual.id,
          cliente_id: clienteSelecionado.clienteId,
          contrato_id: itensSelecionados[0]?.contratoId || null,
          fatura_id: faturaData.id,
          categoria: 'LOCACAO',
          emissao: new Date().toISOString().split('T')[0],
          vencimento: vencimento,
          valor: totais.total,
          pago: 0,
          saldo: totais.total,
          forma: formaPagamento,
          status: 'PENDENTE',
          origem: 'FATURA',
          observacoes: observacoes || `Fatura ${faturaNumero}`,
          timeline: [{
            tipo: 'EMISSAO',
            descricao: `Título gerado via fatura ${faturaNumero}`,
            usuario: user?.email || 'sistema',
            timestamp: new Date().toISOString()
          }]
        })
        .select('*, cliente:clientes(id, nome, razao_social, cpf, cnpj)')
        .single();

      if (tituloError) throw tituloError;

      // Store generated titulos for BolePix dialog
      const gerados: TituloGerado[] = [{
        id: tituloData.id,
        numero: tituloData.numero,
        valor: tituloData.valor,
        vencimento: tituloData.vencimento,
        clienteNome: tituloData.cliente?.nome || tituloData.cliente?.razao_social || clienteSelecionado.clienteNome,
        clienteCpfCnpj: tituloData.cliente?.cpf || tituloData.cliente?.cnpj || '',
      }];

      setTitulosGerados(gerados);

      toast.success("Fatura emitida com sucesso!", {
        description: `Fatura ${faturaNumero} + Título ${tituloNumero} criados no Supabase`,
      });

      // 3. If PIX/BOLETO, offer BolePix emission
      if (formaPagamento !== 'OUTRO') {
        setShowBolePixDialog(true);
      }

    } catch (error: any) {
      console.error('Erro ao emitir fatura:', error);
      toast.error("Erro ao emitir fatura", {
        description: error.message || "Erro desconhecido"
      });
    } finally {
      setIsEmitindo(false);
    }
  };

  const handleEmitirBolePix = async () => {
    if (!lojaAtual || titulosGerados.length === 0) return;

    setIsEmitindoBolePix(true);
    setBolePixProgress({ done: 0, total: titulosGerados.length });

    const adapter = new BackendInterAdapter(lojaAtual.id);
    let successCount = 0;

    for (const titulo of titulosGerados) {
      try {
        const result = await adapter.emitCharge({
          valor: titulo.valor,
          vencimento: titulo.vencimento,
          sacado: {
            nome: titulo.clienteNome,
            cpfCnpj: titulo.clienteCpfCnpj,
            email: '',
          },
          pixHabilitado: formaPagamento === 'PIX',
          idempotencyKey: `TIT-${titulo.id}-${Date.now()}`,
          seuNumero: titulo.numero,
        });

        // Save to cobrancas_inter
        await createCobranca.mutateAsync({
          titulo_id: titulo.id,
          loja_id: lojaAtual.id,
          status: result.status,
          idempotency_key: `TIT-${titulo.id}-${Date.now()}`,
          codigo_solicitacao: result.codigoSolicitacao,
          history: [{
            tsISO: new Date().toISOString(),
            event: 'EMITIDO_VIA_FATURAMENTO',
            payloadSummary: { valor: titulo.valor, vencimento: titulo.vencimento },
          }],
        });

        successCount++;
        setBolePixProgress(prev => ({ ...prev, done: prev.done + 1 }));
      } catch (error: any) {
        console.error(`Erro ao emitir BolePix para título ${titulo.numero}:`, error);
        toast.error(`Erro no título ${titulo.numero}`, { description: error.message });
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} BolePix emitido(s) com sucesso!`, {
        description: "Cobranças vinculadas aos títulos da fatura"
      });
    }

    setIsEmitindoBolePix(false);
    setShowBolePixDialog(false);
    setTitulosGerados([]);
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

        {/* Actions - Unified flow */}
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

          {/* Single "Emitir Fatura" button - persists to Supabase + offers BolePix */}
          <Button
            className="w-full"
            onClick={handleEmitirFatura}
            disabled={!podeEmitir || isEmitindo || !can('financeiro', 'emitirFatura')}
          >
            {isEmitindo ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Emitindo...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" />Emitir Fatura</>
            )}
          </Button>

          {formaPagamento !== 'OUTRO' && (
            <p className="text-xs text-muted-foreground text-center">
              Após emitir, você poderá gerar BolePix automaticamente
            </p>
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

      {/* Post-emission BolePix Dialog */}
      <Dialog open={showBolePixDialog} onOpenChange={setShowBolePixDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Fatura emitida com sucesso!
            </DialogTitle>
            <DialogDescription>
              Deseja emitir BolePix (Banco Inter) para os títulos gerados?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {titulosGerados.map(titulo => (
              <div key={titulo.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{titulo.numero}</p>
                  <p className="text-xs text-muted-foreground">{titulo.clienteNome}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium">{formatCurrency(titulo.valor)}</p>
                  <p className="text-xs text-muted-foreground">
                    Venc: {format(new Date(titulo.vencimento), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {isEmitindoBolePix && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Emitindo {bolePixProgress.done}/{bolePixProgress.total}...
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBolePixDialog(false);
                setTitulosGerados([]);
              }}
              disabled={isEmitindoBolePix}
            >
              Pular
            </Button>
            <Button
              onClick={handleEmitirBolePix}
              disabled={isEmitindoBolePix}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {isEmitindoBolePix ? "Emitindo..." : "Emitir BolePix"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
