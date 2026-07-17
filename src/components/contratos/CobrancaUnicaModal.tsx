import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, DollarSign, AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useMultiunidade } from "@/hooks/useMultiunidade";

interface TituloAberto {
  id: string;
  numero: string;
  contratoNumero: string;
  lojaId: string;
  emissao: string;
  vencimento: string;
  valor: number;
  saldo: number;
  vencido: boolean;
  origem: string;
}

interface CobrancaUnicaModalProps {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
  clienteDoc: string;
  clientePolitica?: 'P0' | 'P1' | 'P2';
}

export function CobrancaUnicaModal({
  open,
  onClose,
  clienteId,
  clienteNome,
  clienteDoc,
  clientePolitica
}: CobrancaUnicaModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lojaAtual } = useMultiunidade();
  const [titulosSelecionados, setTitulosSelecionados] = useState<string[]>([]);
  const [vencimento, setVencimento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'BOLETO' | 'PIX' | 'CARTAO'>('BOLETO');
  const [observacoes, setObservacoes] = useState('');
  const [gerando, setGerando] = useState(false);

  // Exibir info da política se aplicável
  const infoPolitica = useMemo(() => {
    if (!clientePolitica) return null;

    const politicaNome = clientePolitica === 'P0' ? 'P0 — 5% desconto' :
                        clientePolitica === 'P1' ? 'P1 — 10% desconto' :
                        'P2 — 15% desconto';

    return { id: clientePolitica, nome: politicaNome };
  }, [clientePolitica]);

  // Títulos REAIS em aberto do cliente (antes eram dados de demonstração
  // hardcoded — ticket #39). Fonte: tabela titulos, a mesma de Contas a Receber.
  const { titulos: titulosDoCliente = [], isLoading: carregandoTitulos } =
    useSupabaseTitulos(undefined, clienteId);

  const titulosAbertos: TituloAberto[] = useMemo(() => {
    const hoje = new Date();
    return (titulosDoCliente as any[])
      .filter(t => (t.status === 'EM_ABERTO' || t.status === 'PARCIAL') && Number(t.saldo) > 0)
      .map(t => ({
        id: t.id,
        numero: t.numero,
        contratoNumero: t.contrato?.numero ? `Nº ${t.contrato.numero}` : (t.categoria || '—'),
        lojaId: t.lojaId,
        emissao: t.emissao,
        vencimento: t.vencimento,
        valor: Number(t.valor),
        saldo: Number(t.saldo),
        vencido: new Date(`${t.vencimento}T12:00:00`) < hoje,
        origem: t.origem || 'CONTRATO',
      }));
  }, [titulosDoCliente]);

  const titulosVencidos = titulosAbertos.filter(t => t.vencido);
  const hasVencidos = titulosVencidos.length > 0;

  const totalSelecionado = useMemo(() => {
    return titulosAbertos
      .filter(t => titulosSelecionados.includes(t.id))
      .reduce((sum, t) => sum + t.saldo, 0);
  }, [titulosSelecionados]);

  const handleSelectAll = () => {
    if (titulosSelecionados.length === titulosAbertos.length) {
      setTitulosSelecionados([]);
    } else {
      setTitulosSelecionados(titulosAbertos.map(t => t.id));
    }
  };

  const handleSelectTitulo = (tituloId: string) => {
    setTitulosSelecionados(prev => 
      prev.includes(tituloId)
        ? prev.filter(id => id !== tituloId)
        : [...prev, tituloId]
    );
  };

  const handleGerarCobranca = async () => {
    if (titulosSelecionados.length === 0) {
      toast({
        title: "Nenhum título selecionado",
        description: "Selecione pelo menos um título para gerar a cobrança única.",
        variant: "destructive"
      });
      return;
    }

    if (!vencimento) {
      toast({
        title: "Vencimento obrigatório",
        description: "Defina o vencimento para a cobrança única.",
        variant: "destructive"
      });
      return;
    }

    const selecionados = titulosAbertos.filter(t => titulosSelecionados.includes(t.id));
    const lojaId = lojaAtual?.id || selecionados[0]?.lojaId;
    if (!lojaId) {
      toast({ title: "Erro", description: "Loja não identificada.", variant: "destructive" });
      return;
    }

    setGerando(true);
    try {
      const numeroFatura = `FAT-U-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-5)}`;
      const hojeIso = new Date().toISOString().split('T')[0];
      const listaNumeros = selecionados.map(t => t.numero).join(', ');

      // 1) Fatura agrupada
      const { data: fatura, error: faturaError } = await (supabase as any)
        .from('faturas')
        .insert({
          numero: numeroFatura,
          cliente_id: clienteId,
          loja_id: lojaId,
          contrato_id: null,
          tipo: 'COBRANCA_UNICA',
          emissao: hojeIso,
          vencimento,
          total: totalSelecionado,
          forma_preferida: formaPagamento,
          observacoes: [`Cobrança única agrupando: ${listaNumeros}`, observacoes].filter(Boolean).join(' — '),
          itens: selecionados.map(t => ({ titulo_id: t.id, numero: t.numero, saldo: t.saldo })),
        })
        .select('id')
        .single();
      if (faturaError) throw faturaError;

      // 2) Título único vinculado à fatura
      const { error: tituloError } = await (supabase as any)
        .from('titulos')
        .insert({
          numero: numeroFatura,
          cliente_id: clienteId,
          loja_id: lojaId,
          fatura_id: fatura.id,
          categoria: 'Locação',
          subcategoria: formaPagamento,
          emissao: hojeIso,
          vencimento,
          valor: totalSelecionado,
          saldo: totalSelecionado,
          pago: 0,
          status: 'EM_ABERTO',
          origem: 'COBRANCA_UNICA',
          forma: formaPagamento,
          observacoes: `Agrupa os títulos: ${listaNumeros}`,
        });
      if (tituloError) throw tituloError;

      // 3) Cancela os títulos originais (substituídos pela cobrança única)
      const { error: cancelError } = await (supabase as any)
        .from('titulos')
        .update({
          status: 'CANCELADO',
          observacoes: `Agrupado na cobrança única ${numeroFatura}`,
          updated_at: new Date().toISOString(),
        })
        .in('id', titulosSelecionados);
      if (cancelError) throw cancelError;

      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['faturas'] });

      toast({
        title: "Cobrança única gerada!",
        description: `Fatura ${numeroFatura} criada com ${selecionados.length} título(s) (${formatCurrency(totalSelecionado)}). Os títulos originais foram substituídos.`,
      });

      setTitulosSelecionados([]);
      onClose();
    } catch (error) {
      console.error('Erro ao gerar cobrança única:', error);
      const mensagem = error instanceof Error ? error.message : 'Tente novamente';
      toast({ title: "Erro ao gerar cobrança única", description: mensagem, variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(`${dateStr.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (vencido: boolean) => {
    return vencido
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary";
  };

  const getOrigemBadge = (origem: string) => {
    return origem === 'LOGISTICA' 
      ? "bg-orange-100 text-orange-700" 
      : "bg-blue-100 text-blue-700";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Cobrança Única do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nome/Razão:</span>
                <span className="text-sm font-medium">{clienteNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Documento:</span>
                <span className="text-sm font-medium">{clienteDoc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Títulos em aberto:</span>
                <span className="text-sm font-medium">{titulosAbertos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total geral:</span>
                <span className="text-sm font-medium">
                  {formatCurrency(titulosAbertos.reduce((sum, t) => sum + t.saldo, 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Alerta sobre títulos vencidos */}
          {hasVencidos && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este cliente possui {titulosVencidos.length} título(s) vencido(s). 
                A cobrança única pode ajudar na regularização.
              </AlertDescription>
            </Alert>
          )}

          {/* Info sobre política comercial */}
          {infoPolitica && (
            <Alert className="bg-green-50 border-green-200">
              <DollarSign className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Cliente com <strong>{infoPolitica.nome}</strong>. 
                A política será aplicada automaticamente na fatura agrupada.
              </AlertDescription>
            </Alert>
          )}

          {/* Seleção de Títulos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Títulos para Cobrança</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {titulosSelecionados.length === titulosAbertos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="border rounded-lg">
              <div className="max-h-64 overflow-y-auto">
                {carregandoTitulos ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando títulos do cliente...
                  </div>
                ) : titulosAbertos.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Este cliente não possui títulos em aberto.
                  </div>
                ) : titulosAbertos.map((titulo) => (
                  <div key={titulo.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0">
                    <Checkbox
                      checked={titulosSelecionados.includes(titulo.id)}
                      onCheckedChange={() => handleSelectTitulo(titulo.id)}
                    />
                    <div className="flex-1 grid grid-cols-5 gap-3 items-center">
                      <div>
                        <p className="text-sm font-medium">{titulo.numero}</p>
                        <p className="text-xs text-muted-foreground">Contrato {titulo.contratoNumero}</p>
                      </div>
                      <div className="text-xs">
                        <p>Emissão: {formatDate(titulo.emissao)}</p>
                        <p>Vencimento: {formatDate(titulo.vencimento)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(titulo.saldo)}</p>
                      </div>
                      <div>
                        <Badge className={getStatusBadge(titulo.vencido)}>
                          {titulo.vencido ? 'Vencido' : 'Em Aberto'}
                        </Badge>
                      </div>
                      <div>
                        <Badge className={getOrigemBadge(titulo.origem)}>
                          {titulo.origem === 'LOGISTICA' ? 'Taxa' : 'Locação'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {titulosSelecionados.length > 0 && (
              <div className="bg-primary/5 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {titulosSelecionados.length} título(s) selecionado(s)
                  </span>
                  <span className="text-sm font-bold text-primary">
                    Total: {formatCurrency(totalSelecionado)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Configurações da Cobrança */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={(value: 'BOLETO' | 'PIX' | 'CARTAO') => setFormaPagamento(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input
              id="observacoes"
              placeholder="Observações para a fatura..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGerarCobranca} disabled={titulosSelecionados.length === 0 || !vencimento || gerando}>
            {gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            {gerando ? 'Gerando...' : 'Gerar Cobrança Única'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}