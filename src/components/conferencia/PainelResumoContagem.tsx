import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck,
  Eye,
  Wrench,
  FileWarning
} from "lucide-react";
import { useConferenciaStore, type ContagemSessao } from "@/stores/conferenciaStore";
import { STATUS_LABELS, ACOES_LABELS } from "@/config/inventario";

interface PainelResumoContagemProps {
  sessao: ContagemSessao;
}

export function PainelResumoContagem({ sessao }: PainelResumoContagemProps) {
  const { 
    getDivergenciasPorSessao, 
    getAjustesPorSessao,
    getTarefasPorSessao,
    resumoAjustes 
  } = useConferenciaStore();
  
  const divergencias = getDivergenciasPorSessao(sessao.id);
  const ajustes = getAjustesPorSessao(sessao.id);
  const tarefas = getTarefasPorSessao(sessao.id);
  const resumo = resumoAjustes(sessao.id);

  // Cálculos dos KPIs
  const totalItens = divergencias.length;
  const divergenciasComDelta = divergencias.filter(d => d.delta !== 0);
  const itensProcessados = divergencias.filter(d => d.status !== 'PENDENTE').length;
  const itensInvestigacao = divergencias.filter(d => d.status === 'EM_INVESTIGACAO').length;
  const ajustesPositivos = divergencias.filter(d => d.delta > 0 && d.acao === 'AJUSTAR_ESTOQUE').length;
  const ajustesNegativos = divergencias.filter(d => d.delta < 0 && d.acao === 'AJUSTAR_ESTOQUE').length;
  const baixasPatrimoniais = divergencias.filter(d => d.acao === 'BAIXA_PATRIMONIAL').length;
  const itensComAprovacao = divergencias.filter(d => d.exigeAprovacao).length;
  const percentualComAprovacao = totalItens > 0 ? Math.round((itensComAprovacao / totalItens) * 100) : 0;
  
  // Totais por valor (mock)
  const valorTotalPositivo = divergencias
    .filter(d => d.delta > 0)
    .reduce((acc, d) => acc + (d.delta * 1000), 0); // Mock: R$ 1000 por unidade
  
  const valorTotalNegativo = Math.abs(divergencias
    .filter(d => d.delta < 0)
    .reduce((acc, d) => acc + (d.delta * 1000), 0));

  // Agrupamento por ação
  const acoesSummary = Object.entries(ACOES_LABELS).map(([acao, label]) => {
    const count = divergencias.filter(d => d.acao === acao).length;
    return { acao, label, count };
  }).filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-foreground">{itensProcessados}</div>
            <p className="text-sm text-muted-foreground">Processados</p>
            <div className="text-xs text-muted-foreground mt-1">
              de {totalItens} total
            </div>
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
            <div className="text-xs text-green-600 mt-1">
              R$ {valorTotalPositivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div className="text-2xl font-bold text-red-600">-{ajustesNegativos}</div>
            </div>
            <p className="text-sm text-muted-foreground">Ajustes (-)</p>
            <div className="text-xs text-red-600 mt-1">
              R$ {valorTotalNegativo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
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

      {/* KPI de Aprovação */}
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

      {/* Resumo por Ação */}
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

      {/* Totais Financeiros (mock) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Impacto Financeiro Estimado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-700">
                R$ {valorTotalPositivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-green-600">Valor Positivo</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-lg font-bold text-red-700">
                R$ {valorTotalNegativo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-600">Valor Negativo</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg font-bold text-blue-700">
                R$ {Math.abs(valorTotalPositivo - valorTotalNegativo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-blue-600">
                Diferença {valorTotalPositivo > valorTotalNegativo ? 'Positiva' : 'Negativa'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}