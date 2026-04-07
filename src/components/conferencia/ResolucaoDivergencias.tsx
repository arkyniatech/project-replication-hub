import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Equal, ArrowLeft, ClipboardCheck, Loader2
} from "lucide-react";
import { useSupabaseConferencia, type ContagemSessao } from "@/hooks/useSupabaseConferencia";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";
import { STATUS_LABELS } from "@/config/inventario";
import { PainelResumoContagem } from "./PainelResumoContagem";

interface ResolucaoDivergenciasProps {
  sessao: ContagemSessao;
}

export function ResolucaoDivergencias({ sessao }: ResolucaoDivergenciasProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { useDivergenciasPorSessao, canEdit } = useSupabaseConferencia();
  const { lojas } = useMultiunidade();
  
  const { data: divergencias = [], isLoading } = useDivergenciasPorSessao(sessao.id);
  const loja = lojas.find(l => l.id === sessao.lojaId);

  const [showOnlyDivergent, setShowOnlyDivergent] = useState(true);

  const filteredDivergencias = useMemo(() => {
    return showOnlyDivergent 
      ? divergencias.filter(d => d.delta !== 0)
      : divergencias;
  }, [divergencias, showOnlyDivergent]);

  const isReadOnly = !canEdit();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/equipamentos/conferencia')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resolução de Divergências</h1>
            <p className="text-muted-foreground">
              {loja?.nome} - {sessao.displayNo || sessao.id}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid">Lista de Divergências</TabsTrigger>
          <TabsTrigger value="resumo">Painel Resumo</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <PainelResumoContagem sessao={sessao} />
        </TabsContent>

        <TabsContent value="grid" className="space-y-6">
          {/* Filtros */}
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-only-divergent"
                  checked={showOnlyDivergent}
                  onCheckedChange={(checked) => setShowOnlyDivergent(checked === true)}
                />
                <label htmlFor="show-only-divergent" className="text-sm">
                  Mostrar apenas itens com divergência
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Divergências ({filteredDivergencias.length} itens)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredDivergencias.map((divergencia) => (
                  <div 
                    key={divergencia.itemId}
                    className={`p-3 border rounded-lg ${
                      divergencia.delta !== 0 
                        ? divergencia.delta > 0 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                        : 'border-border'
                    }`}
                  >
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {divergencia.codigo}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{divergencia.descricao}</div>
                      </div>
                      <div className="text-center">
                        <span className="font-mono text-sm">{divergencia.qtdSistema}</span>
                      </div>
                      <div className="text-center">
                        <span className="font-mono text-sm">{divergencia.qtdContada}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 font-mono text-sm">
                          {divergencia.delta > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : divergencia.delta < 0 ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : (
                            <Equal className="w-4 h-4 text-gray-600" />
                          )}
                          {divergencia.delta > 0 ? '+' : ''}{divergencia.delta}
                        </div>
                      </div>
                      <div>
                        <Badge className="text-xs">
                          {STATUS_LABELS[divergencia.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredDivergencias.length === 0 && (
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma divergência encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
