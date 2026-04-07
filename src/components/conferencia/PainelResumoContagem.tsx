import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, ShieldCheck, Eye, Wrench, FileWarning, Loader2
} from "lucide-react";
import { useSupabaseConferencia, type ContagemSessao } from "@/hooks/useSupabaseConferencia";
import { ACOES_LABELS } from "@/config/inventario";

interface PainelResumoContagemProps {
  sessao: ContagemSessao;
}

export function PainelResumoContagem({ sessao }: PainelResumoContagemProps) {
  const { useDivergenciasPorSessao, useAjustesPorSessao, getResumoAjustes } = useSupabaseConferencia();
  
  const { data: divergencias = [], isLoading: loadingDiv } = useDivergenciasPorSessao(sessao.id);
  const { data: ajustes = [], isLoading: loadingAj } = useAjustesPorSessao(sessao.id);
  const resumo = getResumoAjustes(ajustes);

  if (loadingDiv || loadingAj) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalItens = divergencias.length;
  const itensProcessados = divergencias.filter(d => d.status !== 'PENDENTE').length;
  const itensInvestigacao = divergencias.filter(d => d.status === 'EM_INVESTIGACAO').length;
  const ajustesPositivos = divergencias.filter(d => d.delta > 0 && d.acao === 'AJUSTAR_ESTOQUE').length;
  const ajustesNegativos = divergencias.filter(d => d.delta < 0 && d.acao === 'AJUSTAR_ESTOQUE').length;
  const baixasPatrimoniais = divergencias.filter(d => d.acao === 'BAIXA_PATRIMONIAL').length;
  const itensComAprovacao = divergencias.filter(d => d.exigeAprovacao).length;
  const percentualComAprovacao = totalItens > 0 ? Math.round((itensComAprovacao / totalItens) * 100) : 0;

  const acoesSummary = Object.entries(ACOES_LABELS).map(([acao, label]) => {
    const count = divergencias.filter(d => d.acao === acao).length;
    return { acao, label, count };
  }).filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-foreground">{itensProcessados}</div>
            <p className="text-sm text-muted-foreground">Processados</p>
            <div className="text-xs text-muted-foreground mt-1">de {totalItens} total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{itensInvestigacao}</div>
            </div>
            <p className="text-sm text-muted-foreground">Em Investigação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div className="text-2xl font-bold text-green-600">+{ajustesPositivos}</div>
            </div>
            <p className="text-sm text-muted-foreground">Ajustes (+)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div className="text-2xl font-bold text-red-600">-{ajustesNegativos}</div>
            </div>
            <p className="text-sm text-muted-foreground">Ajustes (-)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <FileWarning className="w-5 h-5 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{baixasPatrimoniais}</div>
            </div>
            <p className="text-sm text-muted-foreground">Baixas</p>
          </CardContent>
        </Card>
      </div>

      {itensComAprovacao > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="font-medium text-orange-800">
                    {itensComAprovacao} itens requerem aprovação
                  </div>
                  <div className="text-sm text-orange-600">
                    {percentualComAprovacao}% do total acima dos limites estabelecidos
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {percentualComAprovacao}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {acoesSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Ação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {acoesSummary.map(({ acao, label, count }) => (
                <div key={acao} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {acao === 'AJUSTAR_ESTOQUE' && <Wrench className="w-4 h-4 text-blue-600" />}
                    {acao === 'INVESTIGAR' && <Eye className="w-4 h-4 text-yellow-600" />}
                    {acao === 'BAIXA_PATRIMONIAL' && <FileWarning className="w-4 h-4 text-red-600" />}
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
