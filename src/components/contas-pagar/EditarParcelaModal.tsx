import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { formatDateBR } from '@/lib/date-utils';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { Calendar, Edit3, Save } from 'lucide-react';

interface EditarParcelaModalProps {
  open: boolean;
  onClose: () => void;
  parcelaId: string | null;
  onSuccess: () => void;
}

export function EditarParcelaModal({ open, onClose, parcelaId, onSuccess }: EditarParcelaModalProps) {
  const { parcelas, updateParcela } = useSupabaseParcelasPagar();

  const [parcela, setParcela] = useState<any>(null);
  const [vencimento, setVencimento] = useState('');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [aplicarTodas, setAplicarTodas] = useState(false);
  // preserva edições do usuário quando o react-query refaz o fetch da lista
  const parcelaCarregadaId = useRef<string | null>(null);

  // fechar o modal descarta a edição abandonada — reabrir a MESMA parcela
  // repopula do banco (o modal fica montado no pai, o ref sobreviveria)
  useEffect(() => {
    if (!open) parcelaCarregadaId.current = null;
  }, [open]);

  useEffect(() => {
    const found = parcelaId ? parcelas.find(p => p.id === parcelaId) || null : null;
    setParcela(found);
    if (!found) {
      parcelaCarregadaId.current = null;
      return;
    }
    if (found.id !== parcelaCarregadaId.current) {
      parcelaCarregadaId.current = found.id;
      setVencimento(found.vencimento);
      setValor(found.valor.toString());
      setMotivo('');
      setAplicarTodas(false);
    }
  }, [parcelaId, parcelas]);

  if (!open || !parcelaId || !parcela) return null;

  const vencimentoOriginal = parcela.vencimento;
  const valorOriginal = parcela.valor;
  const houveMudancaData = vencimento !== vencimentoOriginal;
  const houveMudancaValor = parseFloat(valor) !== valorOriginal;
  const parcelaVencida = new Date(vencimentoOriginal) < new Date();

  const adicionarDias = (dias: number) => {
    const novaData = new Date(vencimento);
    novaData.setDate(novaData.getDate() + dias);
    setVencimento(novaData.toISOString().split('T')[0]);
  };

  const proximoDiaUtil = () => {
    // Mock: apenas adiciona 1 dia (em produção, lógica de dias úteis)
    adicionarDias(1);
    toast.info("Data ajustada para o próximo dia útil");
  };

  const handleSalvar = async () => {
    if (!vencimento || !valor) {
      toast.error("Campos obrigatórios", {
        description: "Preencha vencimento e valor"
      });
      return;
    }

    if (houveMudancaData && parcelaVencida && !motivo.trim()) {
      toast.error("Justificativa obrigatória", {
        description: "Informe o motivo da reprogramação de parcela vencida"
      });
      return;
    }

    try {
      // parcelas_pagar só tem vencimento e valor entre os campos editáveis
      // aqui. conta_preferencial_id, observacoes e reprogramacoes nunca
      // existiram na tabela — o update falhava no PostgREST. Ver relay 61.
      await updateParcela.mutateAsync({
        id: parcelaId,
        vencimento,
        valor: parseFloat(valor),
      });

      toast.success(houveMudancaData ? "Parcela reprogramada" : "Parcela atualizada");

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast.error("Erro ao atualizar parcela");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Editar Parcela #{parcela.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados da Parcela */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Parcela</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vencimento">Vencimento *</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                  />
                  {houveMudancaData && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Data original: {formatDateBR(vencimentoOriginal)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="valor">Valor *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                  {houveMudancaValor && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor original: {formatCurrency(valorOriginal)}
                    </p>
                  )}
                </div>
              </div>

              {/* Botões rápidos para datas */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ajustes rápidos:</span>
                <Button size="sm" variant="outline" onClick={() => adicionarDias(7)}>
                  +7d
                </Button>
                <Button size="sm" variant="outline" onClick={() => adicionarDias(15)}>
                  +15d
                </Button>
                <Button size="sm" variant="outline" onClick={() => adicionarDias(30)}>
                  +30d
                </Button>
                <Button size="sm" variant="outline" onClick={proximoDiaUtil}>
                  Próx. dia útil
                </Button>
              </div>

              {/* Sem "Conta Preferencial" nem "Observação": parcelas_pagar não
                  tem essas colunas. Continuavam na tela sugerindo que o dado
                  era guardado, e o update quebrava. A conta é escolhida no
                  momento do pagamento (movimentos_pagar.conta_id). Relay 61. */}
            </CardContent>
          </Card>

          {/* Reprogramação */}
          {houveMudancaData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Reprogramação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {parcelaVencida && (
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠️ Parcela vencida - justificativa obrigatória
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="motivo">
                    Motivo da reprogramação {parcelaVencida && '*'}
                  </Label>
                  <Textarea
                    id="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Informe o motivo da alteração de data..."
                    rows={2}
                    required={parcelaVencida}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="aplicar-todas"
                    checked={aplicarTodas}
                    onChange={(e) => setAplicarTodas(e.target.checked)}
                  />
                  <Label htmlFor="aplicar-todas" className="text-sm">
                    Aplicar alteração de data a todas as próximas parcelas
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sem "Histórico de Reprogramações": parcelas_pagar não tem coluna
              `reprogramacoes`, então o bloco nunca chegou a aparecer. O motivo
              digitado acima continua sendo exigido para parcela vencida, como
              trava de processo — só não é persistido. Relay 61. */}

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}