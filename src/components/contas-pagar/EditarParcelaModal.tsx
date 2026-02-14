import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { useSupabaseContasFinanceiras } from '@/hooks/useSupabaseContasFinanceiras';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { Calendar, Edit3, Save, Plus } from 'lucide-react';

interface EditarParcelaModalProps {
  open: boolean;
  onClose: () => void;
  parcelaId: string | null;
  onSuccess: () => void;
}

export function EditarParcelaModal({ open, onClose, parcelaId, onSuccess }: EditarParcelaModalProps) {
  const { parcelas, updateParcela } = useSupabaseParcelasPagar();
  const { lojaAtual } = useMultiunidade();
  const { contas } = useSupabaseContasFinanceiras(lojaAtual?.id);
  
  const [parcela, setParcela] = useState<any>(null);

  useEffect(() => {
    if (parcelaId && parcelas.length > 0) {
      const found = parcelas.find(p => p.id === parcelaId);
      setParcela(found || null);
    }
  }, [parcelaId, parcelas]);

  if (!open || !parcelaId || !parcela) return null;
  
  const [vencimento, setVencimento] = useState(parcela.vencimento);
  const [valor, setValor] = useState(parcela.valor.toString());
  const [contaPreferencial, setContaPreferencial] = useState(parcela.contaPreferencial);
  const [observacao, setObservacao] = useState(parcela.observacao);
  const [motivo, setMotivo] = useState('');
  const [aplicarTodas, setAplicarTodas] = useState(false);

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
      const updates: any = {
        vencimento,
        valor: parseFloat(valor),
        conta_preferencial_id: contaPreferencial || null,
        observacoes: observacao,
      };

      // Registrar reprogramação se houve mudança de data
      if (houveMudancaData) {
        const reprogramacao = {
          de: vencimentoOriginal,
          para: vencimento,
          motivo: motivo || 'Ajuste de vencimento',
          usuario: 'Admin',
          timestamp: new Date().toISOString()
        };

        const reprogramacoesAtuais = Array.isArray(parcela.reprogramacoes) ? parcela.reprogramacoes : [];
        updates.reprogramacoes = [...reprogramacoesAtuais, reprogramacao];
      }

      await updateParcela.mutateAsync({ id: parcelaId, ...updates });

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
                      Data original: {new Date(vencimentoOriginal).toLocaleDateString('pt-BR')}
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

              <div>
                <Label htmlFor="conta">Conta Preferencial</Label>
                <Select value={contaPreferencial} onValueChange={setContaPreferencial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map(conta => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="obs">Observação</Label>
                <Textarea
                  id="obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações sobre a parcela..."
                  rows={2}
                />
              </div>
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

          {/* Histórico de Reprogramações */}
          {parcela && Array.isArray(parcela.reprogramacoes) && parcela.reprogramacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Reprogramações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parcela.reprogramacoes.map((repr: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {new Date(repr.de).toLocaleDateString('pt-BR')} → 
                          {new Date(repr.para).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-muted-foreground">{repr.motivo}</p>
                        <p className="text-xs text-muted-foreground">por {repr.usuario}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(repr.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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