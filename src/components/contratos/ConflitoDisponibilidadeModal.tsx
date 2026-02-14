import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Clock, Wrench, Truck, Calculator, CheckCircle } from "lucide-react";
import { DisponibilidadeResultado, DisponibilidadeConflito } from "@/types/disponibilidade-rt";

interface ConflitoDisponibilidadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultado: DisponibilidadeResultado;
  equipamentoNome: string;
  onIgnorarConflito?: () => void;
  onUsarAlternativa?: (alternativa: any) => void;
  onCancelar?: () => void;
}

export function ConflitoDisponibilidadeModal({
  open,
  onOpenChange,
  resultado,
  equipamentoNome,
  onIgnorarConflito,
  onUsarAlternativa,
  onCancelar
}: ConflitoDisponibilidadeModalProps) {
  const [selectedTab, setSelectedTab] = useState("conflitos");

  const getConflictIcon = (tipo: DisponibilidadeConflito['tipo']) => {
    switch (tipo) {
      case 'RESERVA':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'MANUTENCAO':
        return <Wrench className="w-4 h-4 text-red-500" />;
      case 'TRANSFERENCIA':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'CONTAGEM_CEGA':
        return <Calculator className="w-4 h-4 text-purple-500" />;
      case 'LOCADO':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const conflitosBloquentes = resultado.conflitos.filter(c => c.gravidade === 'BLOQUEANTE');
  const conflitosAviso = resultado.conflitos.filter(c => c.gravidade === 'AVISO');
  const temAlternativas = resultado.alternativas && (
    (resultado.alternativas.outrasQuantidades && resultado.alternativas.outrasQuantidades.length > 0) ||
    (resultado.alternativas.outrosPeriodos && resultado.alternativas.outrosPeriodos.length > 0) ||
    (resultado.alternativas.outrosSeries && resultado.alternativas.outrosSeries.length > 0)
  );

  const handleClose = () => {
    onOpenChange(false);
    setSelectedTab("conflitos");
  };

  const handleIgnorar = () => {
    onIgnorarConflito?.();
    handleClose();
  };

  const handleCancelar = () => {
    onCancelar?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Conflito de Disponibilidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O equipamento <strong>{equipamentoNome}</strong> possui conflitos que podem impedir sua utilização no período selecionado.
            </AlertDescription>
          </Alert>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conflitos">
                Conflitos ({resultado.conflitos.length})
              </TabsTrigger>
              <TabsTrigger value="alternativas" disabled={!temAlternativas}>
                Alternativas {temAlternativas ? `(${
                  (resultado.alternativas?.outrasQuantidades?.length || 0) +
                  (resultado.alternativas?.outrosPeriodos?.length || 0) +
                  (resultado.alternativas?.outrosSeries?.length || 0)
                })` : '(0)'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conflitos" className="space-y-4">
              {conflitosBloquentes.length > 0 && (
                <div>
                  <h3 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Conflitos Bloqueantes
                  </h3>
                  <div className="space-y-2">
                    {conflitosBloquentes.map((conflito, index) => (
                      <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                        <div className="flex items-start gap-3">
                          {getConflictIcon(conflito.tipo)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{conflito.tipo.replace('_', ' ')}</span>
                              <Badge variant="destructive" className="text-xs">Bloqueante</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{conflito.detalhes}</p>
                            <p className="text-xs text-gray-500">Origem: {conflito.origem}</p>
                            {conflito.periodo && (
                              <p className="text-xs text-gray-500">
                                Período: {new Date(conflito.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(conflito.periodo.fim).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {conflitosAviso.length > 0 && (
                <div>
                  <h3 className="font-medium text-orange-600 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Avisos
                  </h3>
                  <div className="space-y-2">
                    {conflitosAviso.map((conflito, index) => (
                      <div key={index} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                        <div className="flex items-start gap-3">
                          {getConflictIcon(conflito.tipo)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{conflito.tipo.replace('_', ' ')}</span>
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Aviso</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{conflito.detalhes}</p>
                            <p className="text-xs text-gray-500">Origem: {conflito.origem}</p>
                            {conflito.periodo && (
                              <p className="text-xs text-gray-500">
                                Período: {new Date(conflito.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(conflito.periodo.fim).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="alternativas" className="space-y-4">
              {resultado.alternativas?.outrasQuantidades && resultado.alternativas.outrasQuantidades.length > 0 && (
                <div>
                  <h3 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Quantidades Disponíveis
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {resultado.alternativas.outrasQuantidades.map((qtd, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => onUsarAlternativa?.({ tipo: 'quantidade', valor: qtd })}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        {qtd} unidade{qtd > 1 ? 's' : ''}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {resultado.alternativas?.outrosPeriodos && resultado.alternativas.outrosPeriodos.length > 0 && (
                <div>
                  <h3 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Períodos Alternativos
                  </h3>
                  <div className="text-sm text-gray-600">
                    Períodos disponíveis serão calculados com base nos conflitos identificados.
                  </div>
                </div>
              )}

              {resultado.alternativas?.outrosSeries && resultado.alternativas.outrosSeries.length > 0 && (
                <div>
                  <h3 className="font-medium text-purple-600 mb-2 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Equipamentos Alternativos
                  </h3>
                  <div className="text-sm text-gray-600">
                    Outros equipamentos do mesmo grupo disponíveis.
                  </div>
                </div>
              )}

              {!temAlternativas && (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma alternativa disponível no momento.</p>
                  <p className="text-sm">Tente ajustar a quantidade ou o período manualmente.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancelar}>
            Cancelar
          </Button>
          
          {conflitosBloquentes.length === 0 && (
            <Button variant="outline" onClick={handleIgnorar} className="text-orange-600 border-orange-300">
              Ignorar Avisos
            </Button>
          )}
          
          {conflitosBloquentes.length > 0 && (
            <Button variant="outline" onClick={handleIgnorar} className="text-red-600 border-red-300">
              Forçar Mesmo Assim
              <span className="text-xs ml-1">(Admin)</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}