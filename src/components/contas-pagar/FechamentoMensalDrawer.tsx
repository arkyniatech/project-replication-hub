import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/usePermissions';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { toast } from 'sonner';
import { useSupabaseFechamentoCP } from '@/hooks/useSupabaseFechamentoCP';
import { 
  Calendar, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  Download,
  Shield,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface FechamentoMensalDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const FechamentoMensalDrawer = ({ open, onClose }: FechamentoMensalDrawerProps) => {
  const { can } = usePermissions();
  const { lojas, lojaAtual } = useMultiunidade();
  const { fechamentos, isLoading, fecharPeriodo, reabrirPeriodo } = useSupabaseFechamentoCP(lojaAtual?.id);
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<string[]>([]);
  const [checklist, setChecklist] = useState({
    extratosConciliados: false,
    parcelasQuitadas: false,
    transferenciasConferidas: false,
    dreRevisado: false
  });
  const [motivoReabertura, setMotivoReabertura] = useState('');
  const [showReaberturaForm, setShowReaberturaForm] = useState(false);

  const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (lojaAtual) {
      setUnidadesSelecionadas([lojaAtual.id]);
    }
  }, [lojaAtual]);

  const canFechar = can('financeiro', 'gerirConfiguracoes') || can('configuracoes', 'gerirConfiguracoes');
  const canReabrir = can('configuracoes', 'gerirConfiguracoes'); // Só Admin

  const handleFecharMes = async () => {
    if (unidadesSelecionadas.length === 0) {
      toast.error("Selecione pelo menos uma unidade");
      return;
    }

    try {
      for (const lojaId of unidadesSelecionadas) {
        await fecharPeriodo.mutateAsync({
          periodo: periodoSelecionado,
          loja_id: lojaId,
          checklist
        });
      }

      toast.success(`Mês ${periodoSelecionado} fechado para ${unidadesSelecionadas.length} unidade(s)`);

      setChecklist({
        extratosConciliados: false,
        parcelasQuitadas: false,
        transferenciasConferidas: false,
        dreRevisado: false
      });
    } catch (error) {
      console.error('Erro ao fechar mês:', error);
      toast.error("Falha ao fechar o mês");
    }
  };

  const handleReabrirMes = async () => {
    if (!motivoReabertura.trim()) {
      toast.error("Motivo da reabertura é obrigatório");
      return;
    }

    try {
      for (const lojaId of unidadesSelecionadas) {
        const fechamento = fechamentos.find(f => f.periodo === periodoSelecionado && f.loja_id === lojaId);
        if (fechamento) {
          await reabrirPeriodo.mutateAsync({
            id: fechamento.id,
            motivo: motivoReabertura
          });
        }
      }

      toast.success(`Mês ${periodoSelecionado} reaberto`);

      setMotivoReabertura('');
      setShowReaberturaForm(false);
    } catch (error) {
      console.error('Erro ao reabrir mês:', error);
      toast.error("Falha ao reabrir o mês");
    }
  };

  const exportarPDF = () => {
    toast.info("PDF do fechamento exportado com sucesso (mock)");
  };

  const getStatusUnidade = (unidadeId: string, periodo: string) => {
    const fechamento = fechamentos.find(f => f.loja_id === unidadeId && f.periodo === periodo);
    return fechamento;
  };

  const isAlgumFechado = unidadesSelecionadas.some(id => {
    const lock = getStatusUnidade(id, periodoSelecionado);
    return lock?.fechado;
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Fechamento Mensal
          </SheetTitle>
          <SheetDescription>
            Controle de fechamento de períodos para bloqueio de alterações retroativas
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Seleção de Período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="periodo">Mês/Ano</Label>
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ultimos6Meses.map(periodo => {
                      const d = new Date(periodo + '-01');
                      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return (
                        <SelectItem key={periodo} value={periodo}>
                          {label.charAt(0).toUpperCase() + label.slice(1)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Unidades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Unidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lojas.map(loja => {
                const lock = getStatusUnidade(loja.id, periodoSelecionado);
                const isSelected = unidadesSelecionadas.includes(loja.id);
                
                return (
                  <div key={loja.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUnidadesSelecionadas(prev => [...prev, loja.id]);
                          } else {
                            setUnidadesSelecionadas(prev => prev.filter(id => id !== loja.id));
                          }
                        }}
                      />
                      <div>
                        <div className="font-medium">{loja.nome}</div>
                        <div className="text-sm text-muted-foreground">{loja.codigo}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {lock?.fechado ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Fechado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          Aberto
                        </Badge>
                      )}
                      
                      {lock?.fechado && lock.fechado_em && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(lock.fechado_em).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Checklist de Conferência */}
          {!isAlgumFechado && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Checklist de Conferência
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Itens informativos - não bloqueiam o fechamento
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="extratos"
                    checked={checklist.extratosConciliados}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, extratosConciliados: !!checked }))
                    }
                  />
                  <Label htmlFor="extratos">Extratos bancários conciliados</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parcelas"
                    checked={checklist.parcelasQuitadas}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, parcelasQuitadas: !!checked }))
                    }
                  />
                  <Label htmlFor="parcelas">Parcelas vencidas quitadas ou reprogramadas</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="transferencias"
                    checked={checklist.transferenciasConferidas}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, transferenciasConferidas: !!checked }))
                    }
                  />
                  <Label htmlFor="transferencias">Transferências entre contas conferidas</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dre"
                    checked={checklist.dreRevisado}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, dreRevisado: !!checked }))
                    }
                  />
                  <Label htmlFor="dre">DRE do período revisado</Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Reabertura */}
          {isAlgumFechado && showReaberturaForm && canReabrir && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Reabertura de Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="motivo">Motivo da Reabertura *</Label>
                    <Textarea
                      id="motivo"
                      value={motivoReabertura}
                      onChange={(e) => setMotivoReabertura(e.target.value)}
                      placeholder="Descreva o motivo da reabertura..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico dos Últimos 6 Meses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Histórico dos Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ultimos6Meses.map(periodo => {
                  const d = new Date(periodo + '-01');
                  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  
                  return (
                    <div key={periodo} className="flex items-center justify-between p-2 border rounded">
                      <div className="font-medium">{label.charAt(0).toUpperCase() + label.slice(1)}</div>
                      <div className="flex gap-2">
                        {unidadesSelecionadas.map(unidadeId => {
                          const loja = lojas.find(l => l.id === unidadeId);
                          const fechamento = getStatusUnidade(unidadeId, periodo);
                          
                          return (
                            <div key={unidadeId} className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">{loja?.codigo}</span>
                              {fechamento?.fechado ? (
                                <Badge variant="secondary" className="text-xs">
                                  <Lock className="w-2 h-2 mr-1" />
                                  Fechado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Unlock className="w-2 h-2 mr-1" />
                                  Aberto
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex gap-2 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          
          <Button variant="outline" onClick={exportarPDF}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          
          {isAlgumFechado ? (
            <>
              {canReabrir && (
                <>
                  {!showReaberturaForm ? (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowReaberturaForm(true)}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Reabrir Mês
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      onClick={handleReabrirMes}
                      disabled={!motivoReabertura.trim()}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Confirmar Reabertura
                    </Button>
                  )}
                </>
              )}
            </>
          ) : (
            canFechar && (
              <Button onClick={handleFecharMes} disabled={unidadesSelecionadas.length === 0}>
                <Lock className="w-4 h-4 mr-2" />
                Fechar Mês
              </Button>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};