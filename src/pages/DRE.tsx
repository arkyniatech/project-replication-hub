import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { useRbac } from '@/hooks/useRbac';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getCCForSelect, findCCPath, mapRealByN2AndCC } from '@/lib/centro-custo-utils';
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  Download,
  FileText,
  Settings,
  Filter,
  Shield,
  Lock,
  UnlockIcon
} from 'lucide-react';
import { BudgetManager } from '@/components/contas-pagar/BudgetManager';
import { FechamentoMensalDrawer } from '@/components/contas-pagar/FechamentoMensalDrawer';
import { FechamentoDREModal } from '@/components/dre/FechamentoDREModal';
import { ReabrirCompetenciaModal } from '@/components/dre/ReabrirCompetenciaModal';
import { 
  isDREFechado, 
  getFechamentoInfo,
  getSnapshotForPeriod,
  exportDREData,
  formatPeriodoDisplay
} from '@/lib/dre-fechamento-utils';
import { getLockInfo } from '@/lib/fechamento-utils';

// Mock data for DRE
const expensesData = [
  {
    codigo: 'A5.01',
    descricao: 'Combustível',
    real: 28500.00,
    meta: 25000.00
  },
  {
    codigo: 'A5.02', 
    descricao: 'Manutenção e Reparos',
    real: 23400.00,
    meta: 30000.00
  },
  {
    codigo: 'A5.03',
    descricao: 'Peças e Materiais', 
    real: 31200.00,
    meta: 28000.00
  },
  {
    codigo: 'A5.04',
    descricao: 'Serviços de Terceiros',
    real: 18900.00,
    meta: 20000.00
  },
  {
    codigo: 'A5.05',
    descricao: 'Logística e Transporte',
    real: 23430.00,
    meta: 22000.00
  }
];

interface ExpenseLineProps {
  categoria: {
    codigo: string;
    descricao: string;
    real: number;
    meta: number;
  };
  showMeta: boolean;
}

function ExpenseLine({ categoria, showMeta }: ExpenseLineProps) {
  const delta = categoria.real - categoria.meta;
  const deltaPercentual = categoria.meta > 0 ? (delta / categoria.meta) * 100 : null;
  
  const getSemaforo = () => {
    if (!showMeta || categoria.meta === 0) return null;
    
    if (categoria.real <= categoria.meta) {
      return 'text-green-700 bg-green-100';
    } else if (categoria.real <= categoria.meta * 1.1) {
      return 'text-yellow-700 bg-yellow-100';
    } else {
      return 'text-red-700 bg-red-100';
    }
  };

  const getProgressPercentage = () => {
    if (!showMeta || categoria.meta === 0) return 0;
    return Math.min((categoria.real / categoria.meta) * 100, 100);
  };

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-border hover:bg-muted/50">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {categoria.codigo}
          </span>
          <span className="font-medium">{categoria.descricao}</span>
        </div>
      </div>
      
      <div className="w-32 text-right">
        <span className="font-semibold">{formatCurrency(categoria.real)}</span>
      </div>
      
      {showMeta && (
        <>
          <div className="w-32 text-right">
            <span className="text-muted-foreground">{formatCurrency(categoria.meta)}</span>
          </div>
          
          <div className="w-24 text-right">
            <span className={delta >= 0 ? 'text-red-600' : 'text-green-600'}>
              {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
            </span>
          </div>
          
          <div className="w-16 text-right">
            {deltaPercentual !== null && (
              <span className={delta >= 0 ? 'text-red-600' : 'text-green-600'}>
                {delta >= 0 ? '+' : ''}{deltaPercentual.toFixed(1)}%
              </span>
            )}
          </div>
          
          <div className="w-8">
            {getSemaforo() && (
              <Badge className={getSemaforo() + ' w-3 h-3 rounded-full p-0'}>
                <span className="sr-only">Status</span>
              </Badge>
            )}
          </div>
          
          <div className="w-32">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface KPICardProps {
  title: string;
  real: number;
  meta?: number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function KPICard({ title, real, meta, icon: Icon, variant = 'default' }: KPICardProps) {
  const delta = meta ? real - meta : null;
  const deltaPercentual = meta && meta > 0 ? (delta! / meta) * 100 : null;
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning': 
        return 'border-yellow-200 bg-yellow-50';
      case 'danger':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-border bg-card';
    }
  };

  return (
    <Card className={getVariantStyles()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(real)}</div>
        {meta && (
          <div className="text-xs text-muted-foreground mt-1">
            Meta: {formatCurrency(meta)}
          </div>
        )}
        {delta !== null && deltaPercentual !== null && (
          <div className="flex items-center space-x-1 mt-2">
            {delta >= 0 ? (
              <TrendingUp className="w-3 h-3 text-red-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-500" />
            )}
            <span className={`text-xs ${delta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {delta >= 0 ? '+' : ''}{deltaPercentual.toFixed(1)}% vs meta
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DRE() {
  const { can } = usePermissions();
  const { can: rbacCan } = useRbac();
  const { lojaAtual, lojasPermitidas } = useMultiunidade();
  const { toast } = useToast();
  
  const [showFechamento, setShowFechamento] = useState(false);
  const [showFechamentoDRE, setShowFechamentoDRE] = useState(false);
  const [showReabrirDRE, setShowReabrirDRE] = useState(false);
  
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedLojas, setSelectedLojas] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCCs, setSelectedCCs] = useState<string[]>([]);
  const [showRealVsMeta, setShowRealVsMeta] = useState(true);
  const [competenciaMode, setCompetenciaMode] = useState(false);
  const [quebrarPorCC, setQuebrarPorCC] = useState(false);
  
  // Inicializar com a loja atual
  useEffect(() => {
    if (lojaAtual && selectedLojas.length === 0) {
      setSelectedLojas([lojaAtual.id]);
    }
  }, [lojaAtual, selectedLojas.length]);
  
  // Verificar fechamento DRE
  const competenciaAtual = selectedPeriod;
  const lojasAtivas = selectedLojas.length > 0 ? selectedLojas : [lojaAtual?.id].filter(Boolean);
  const isDRECompetenciaFechada = isDREFechado(competenciaAtual, lojasAtivas as string[]);
  const fechamentoInfo = getFechamentoInfo(competenciaAtual, lojasAtivas as string[]);
  const snapshot = getSnapshotForPeriod(competenciaAtual, lojasAtivas as string[]);
  
  // Verificar se alguma loja do período está fechada (legacy CP)
  const periodoAtual = selectedDate.toISOString().substring(0, 7);
  const isAlgumPeriodoFechado = selectedLojas.some(lojaId => {
    const lock = getLockInfo(lojaId, periodoAtual);
    return lock?.fechado;
  });
  
  // Verificar permissões
  const hasAccess = can('financeiro', 'ver');
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar o DRE.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMultiLoja = lojasPermitidas.length > 1;

  // Cálculos dos KPIs
  const data = snapshot ? snapshot.porCategoria : expensesData;
  const totalReal = data.reduce((sum, item) => sum + item.real, 0);
  const totalMeta = data.reduce((sum, item) => sum + item.meta, 0);
  const deltaTotal = totalReal - totalMeta;
  const deltaPercentualTotal = totalMeta > 0 ? (deltaTotal / totalMeta) * 100 : 0;

  // Top desvios
  const topDesvios = data
    .map(item => ({
      ...item,
      delta: item.real - item.meta,
      deltaPercentual: item.meta > 0 ? ((item.real - item.meta) / item.meta) * 100 : 0
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  const handleExportCSV = () => {
    const csvData = exportDREData(snapshot, expensesData, showRealVsMeta);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dre_${competenciaAtual}_${Date.now()}.csv`;
    link.click();
    
    toast({
      title: "Dados exportados",
      description: isDRECompetenciaFechada ? "Exportação com dados selados" : "Exportação concluída"
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Gerando relatório", 
      description: isDRECompetenciaFechada ? "PDF com dados selados" : "PDF será criado com os dados filtrados"
    });
  };

  const handleFechamentoComplete = () => {
    // Force re-render by updating a state that triggers snapshot reload
    const newTimestamp = Date.now();
    setSelectedPeriod(competenciaAtual); // This will trigger useEffect and reload data
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Banner de status fechado */}
      {isDRECompetenciaFechada && fechamentoInfo && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  FECHADO em {new Date(fechamentoInfo.fechadoEmISO!).toLocaleDateString('pt-BR')} 
                  por {fechamentoInfo.fechadoPor} — Versão {fechamentoInfo.versaoMeta}
                </span>
                <div className="flex gap-1 ml-2">
                  {fechamentoInfo.lojas.map(lojaId => {
                    const loja = lojasPermitidas.find(l => l.id === lojaId);
                    return loja ? (
                      <Badge key={lojaId} variant="secondary" className="text-xs">
                        {loja.nome}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              {rbacCan('dre:reabrir') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowReabrirDRE(true)}
                  className="text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  <UnlockIcon className="w-3 h-3 mr-1" />
                  Reabrir Competência
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                DRE & Relatórios
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Demonstrativo de Resultado do Exercício
                {isDRECompetenciaFechada && (
                  <span className="ml-2 text-amber-600">• Visualizando snapshot fechado</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-01">Janeiro 2024</SelectItem>
                  <SelectItem value="2024-02">Fevereiro 2024</SelectItem>
                  <SelectItem value="2024-03">Março 2024</SelectItem>
                  <SelectItem value="2024-04">Abril 2024</SelectItem>
                  <SelectItem value="2024-05">Maio 2024</SelectItem>
                  <SelectItem value="2024-06">Junho 2024</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              
              {rbacCan('dre:fechar') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFechamentoDRE(true)}
                  className={isDRECompetenciaFechada ? "border-amber-500 text-amber-600" : ""}
                  disabled={isDRECompetenciaFechada}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {isDRECompetenciaFechada ? (
                    <>
                      <Lock className="w-3 h-3 mr-1" />
                      DRE Fechado
                    </>
                  ) : (
                    "Fechamento DRE"
                  )}
                </Button>
              )}
              
              {(can('financeiro', 'gerirConfiguracoes') || can('configuracoes', 'gerirConfiguracoes')) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFechamento(true)}
                  className={isAlgumPeriodoFechado ? "border-amber-500 text-amber-600" : ""}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {isAlgumPeriodoFechado ? (
                    <>
                      <Lock className="w-3 h-3 mr-1" />
                      Mês Fechado
                    </>
                  ) : (
                    "Fechamento CP"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="dre" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="metas">Metas (Budget)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dre" className="space-y-6">
            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações de Visualização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-meta"
                        checked={showRealVsMeta}
                        onCheckedChange={setShowRealVsMeta}
                      />
                      <Label htmlFor="show-meta">Mostrar Real vs Meta</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="competencia"
                        checked={competenciaMode}
                        onCheckedChange={setCompetenciaMode}
                      />
                      <Label htmlFor="competencia">Competência (Accrual)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="quebrar-cc"
                        checked={quebrarPorCC}
                        onCheckedChange={setQuebrarPorCC}
                      />
                      <Label htmlFor="quebrar-cc">Quebrar por CC</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Filtro de Centros de Custo */}
                    <Select>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Filtrar por Centro de Custo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os CCs</SelectItem>
                        <SelectItem value="sem_cc">Sem Centro de Custo</SelectItem>
                        {getCCForSelect()
                          .filter(cc => cc.ativo)
                          .map(cc => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {cc.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    {isMultiLoja && (
                      <Select>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Selecionar lojas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as lojas</SelectItem>
                          {lojasPermitidas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>
                              {loja.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            {showRealVsMeta && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <KPICard
                    title="Despesa vs Meta (Total)"
                    real={totalReal}
                    meta={totalMeta}
                    icon={Target}
                    variant={deltaTotal > totalMeta * 0.1 ? 'danger' : deltaTotal > 0 ? 'warning' : 'success'}
                  />
                </div>
                
                {topDesvios.slice(0, 2).map((item, index) => (
                  <KPICard
                    key={item.codigo}
                    title={`Top Desvio ${index + 1}`}
                    real={item.real}
                    meta={item.meta}
                    icon={item.delta > 0 ? TrendingUp : TrendingDown}
                    variant={item.delta > item.meta * 0.1 ? 'danger' : item.delta > 0 ? 'warning' : 'success'}
                  />
                ))}
              </div>
            )}

            {/* Top Desvios */}
            {showRealVsMeta && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Desvios por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topDesvios.map((item, index) => (
                        <div 
                          key={item.codigo}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{item.descricao}</p>
                            <p className="text-sm text-muted-foreground">{item.codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${item.delta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {item.delta >= 0 ? '+' : ''}{formatCurrency(item.delta)}
                            </p>
                            <p className={`text-xs ${item.delta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {item.delta >= 0 ? '+' : ''}{item.deltaPercentual.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Insights do Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Atenção requerida</p>
                            <p className="text-sm text-muted-foreground">
                              {topDesvios.filter(item => item.delta > 0).length} categorias acima da meta
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-green-50">
                        <div className="flex items-start gap-3">
                          <TrendingDown className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">Economia realizada</p>
                            <p className="text-sm text-green-600">
                              {formatCurrency(Math.abs(topDesvios.filter(item => item.delta < 0).reduce((sum, item) => sum + item.delta, 0)))} economizados
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* DRE Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  DRE Detalhado
                  {isDRECompetenciaFechada && snapshot && (
                    <Badge variant="secondary" className="ml-2">
                      Snapshot v{snapshot.versaoMeta}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 border-b font-medium text-sm">
                    <div className="flex-1">Categoria</div>
                    <div className="w-32 text-right">Real</div>
                    {showRealVsMeta && (
                      <>
                        <div className="w-32 text-right">Meta</div>
                        <div className="w-24 text-right">Δ</div>
                        <div className="w-16 text-right">Δ%</div>
                        <div className="w-8"></div>
                        <div className="w-32 text-right">Progresso</div>
                      </>
                    )}
                  </div>
                  {data.map(categoria => (
                    <ExpenseLine 
                      key={categoria.codigo}
                      categoria={categoria}
                      showMeta={showRealVsMeta}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="metas" className="space-y-6">
            <BudgetManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <FechamentoMensalDrawer 
        open={showFechamento} 
        onClose={() => setShowFechamento(false)} 
      />
      
      <FechamentoDREModal
        open={showFechamentoDRE}
        onClose={() => setShowFechamentoDRE(false)}
        competencia={competenciaAtual}
        lojas={lojasPermitidas.filter(l => lojasAtivas.includes(l.id))}
        expensesData={expensesData}
        onFechamentoComplete={handleFechamentoComplete}
      />

      <ReabrirCompetenciaModal
        open={showReabrirDRE}
        onClose={() => setShowReabrirDRE(false)}
        competencia={competenciaAtual}
        lojas={lojasPermitidas.filter(l => lojasAtivas.includes(l.id))}
        onReaberturaComplete={handleFechamentoComplete}
      />
    </div>
  );
}