import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useRbac } from '@/hooks/useRbac';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useSupabaseTitulos } from '@/hooks/useSupabaseTitulos';
import { useSupabaseRecebimentos } from '@/hooks/useSupabaseRecebimentos';
import { useSupabaseTitulosPagar } from '@/hooks/useSupabaseTitulosPagar';
import { useSupabaseMovimentosPagar } from '@/hooks/useSupabaseMovimentosPagar';
import { useSupabaseCategoriasN2 } from '@/hooks/useSupabaseCategoriasN2';
import {
  agregarDRE,
  competenciasDisponiveis,
  competenciaAtual as competenciaDoMes,
  exportarDRECSV,
  formatPeriodoDisplay,
  type RegimeDRE,
  type LinhaDRE,
} from '@/lib/dre-agregacao';
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Settings,
  Shield,
  Lock,
  UnlockIcon,
  Wallet,
  Receipt,
  Scale
} from 'lucide-react';
import { FechamentoMensalDrawer } from '@/components/contas-pagar/FechamentoMensalDrawer';
import { FechamentoDREModal } from '@/components/dre/FechamentoDREModal';
import { ReabrirCompetenciaModal } from '@/components/dre/ReabrirCompetenciaModal';
import {
  isDREFechado,
  getFechamentoInfo,
  getSnapshotForPeriod
} from '@/lib/dre-fechamento-utils';
import { getLockInfo } from '@/lib/fechamento-utils';

/** Colunas de `recebimentos` usadas aqui; o hook devolve a linha crua. */
interface LinhaRecebimento {
  data?: string | null;
  valor_liquido?: number | null;
  loja_id?: string | null;
}

interface LinhaDREProps {
  linha: LinhaDRE;
  destaque?: boolean;
}

function LinhaDREView({ linha, destaque }: LinhaDREProps) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-border hover:bg-muted/50">
      <div className="flex-1">
        <span className={destaque ? 'font-semibold' : 'font-medium'}>{linha.nome}</span>
      </div>
      <div className="w-40 text-right">
        <span className="font-semibold tabular-nums">{formatCurrency(linha.valor)}</span>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'danger';
  subtitle?: string;
}

function KPICard({ title, value, icon: Icon, variant = 'default', subtitle }: KPICardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50';
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
        <div className="text-2xl font-bold tabular-nums">{formatCurrency(value)}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
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

  // O seletor antigo tinha seis opções fixas de 2024 e default no mês corrente,
  // valor que não estava na lista: abria em branco. Agora a lista é gerada.
  const hoje = useMemo(() => new Date(), []);
  const periodosDisponiveis = useMemo(() => competenciasDisponiveis(hoje, 18), [hoje]);
  const [selectedPeriod, setSelectedPeriod] = useState(() => competenciaDoMes(hoje));

  const [lojaFiltro, setLojaFiltro] = useState<string>('all');
  const [regime, setRegime] = useState<RegimeDRE>('COMPETENCIA');

  // A loja atual entra como filtro inicial; 'all' só quando o usuário escolhe.
  useEffect(() => {
    if (lojaAtual?.id) {
      setLojaFiltro(prev => (prev === 'all' ? lojaAtual.id : prev));
    }
  }, [lojaAtual?.id]);

  const lojaIdConsulta = lojaFiltro === 'all' ? undefined : lojaFiltro;

  const { titulos, isLoading: loadingTitulos } = useSupabaseTitulos(lojaIdConsulta);
  const { recebimentos, isLoading: loadingRecebimentos } = useSupabaseRecebimentos(lojaIdConsulta);
  const { titulos: titulosPagar, isLoading: loadingPagar } = useSupabaseTitulosPagar(lojaIdConsulta);
  const { movimentos, isLoading: loadingMovimentos } = useSupabaseMovimentosPagar();
  const { categorias, isLoadingTodas, categoriasTodas } = useSupabaseCategoriasN2();

  const isLoading =
    loadingTitulos || loadingRecebimentos || loadingPagar || loadingMovimentos || isLoadingTodas;

  const dre = useMemo(
    () =>
      agregarDRE({
        competencia: selectedPeriod,
        regime,
        lojaId: lojaIdConsulta,
        titulos: titulos.map(t => ({
          emissao: t.emissao,
          vencimento: t.vencimento,
          valor: t.valor,
          lojaId: t.lojaId
        })),
        // useSupabaseRecebimentos devolve a linha crua do PostgREST (snake_case).
        recebimentos: (recebimentos as LinhaRecebimento[]).map(r => ({
          data: r.data,
          valorLiquido: r.valor_liquido,
          lojaId: r.loja_id
        })),
        titulosPagar: titulosPagar.map(t => ({
          id: t.id,
          emissao: t.emissao,
          vencimento: t.vencimento,
          valor: t.valor,
          categoria: t.categoria,
          lojaId: t.loja_id
        })),
        movimentosPagar: movimentos.map(m => ({
          tituloId: m.titulo_id,
          dataPagamento: m.data_pagamento,
          valorLiquido: m.valor_liquido,
          lojaId: m.loja_id
        })),
        // categoriasTodas inclui inativas: título antigo com categoria já
        // inativada continua rotulado, em vez de cair em "Sem categoria".
        categorias: (categoriasTodas.length ? categoriasTodas : categorias).map(c => ({
          nome: c.nome,
          tipo: c.tipo
        }))
      }),
    [selectedPeriod, regime, lojaIdConsulta, titulos, recebimentos, titulosPagar, movimentos, categorias, categoriasTodas]
  );

  // Fechamento continua em localStorage, mas agora sela o DRE real.
  const competenciaSelecionada = selectedPeriod;
  const lojasAtivas = (lojaIdConsulta ? [lojaIdConsulta] : lojasPermitidas.map(l => l.id)).filter(Boolean);
  const isDRECompetenciaFechada = isDREFechado(competenciaSelecionada, lojasAtivas);
  const fechamentoInfo = getFechamentoInfo(competenciaSelecionada, lojasAtivas);
  const snapshot = getSnapshotForPeriod(competenciaSelecionada, lojasAtivas);

  const isAlgumPeriodoFechado = lojasAtivas.some(lojaId => {
    const lock = getLockInfo(lojaId, competenciaSelecionada);
    return lock?.fechado;
  });

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

  const handleExportCSV = () => {
    const csvData = exportarDRECSV(dre);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dre_${competenciaSelecionada}.csv`;
    link.click();

    toast({
      title: "Dados exportados",
      description: `DRE de ${formatPeriodoDisplay(competenciaSelecionada)} exportado`
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Gerando relatório",
      description: "PDF será criado com os dados filtrados"
    });
  };

  const handleFechamentoComplete = () => {
    setSelectedPeriod(competenciaSelecionada);
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
                  {' '}por {fechamentoInfo.fechadoPor}
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
                  <span className="ml-2 text-amber-600">• Competência fechada</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodosDisponiveis.map(periodo => (
                    <SelectItem key={periodo} value={periodo}>
                      {formatPeriodoDisplay(periodo)}
                    </SelectItem>
                  ))}
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

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Visualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="regime-caixa"
                  checked={regime === 'CAIXA'}
                  onCheckedChange={checked => setRegime(checked ? 'CAIXA' : 'COMPETENCIA')}
                />
                <Label htmlFor="regime-caixa">
                  {regime === 'CAIXA' ? 'Regime de Caixa' : 'Competência (Accrual)'}
                </Label>
              </div>

              {isMultiLoja && (
                <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Selecionar loja" />
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
            <p className="text-xs text-muted-foreground mt-3">
              {regime === 'CAIXA'
                ? 'Caixa: recebimentos e pagamentos efetivados no período.'
                : 'Competência: títulos emitidos no período, pagos ou não.'}
            </p>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Receita"
            value={dre.totalReceita}
            icon={Wallet}
            subtitle={formatPeriodoDisplay(selectedPeriod)}
          />
          <KPICard
            title="Despesa"
            value={dre.totalDespesa}
            icon={Receipt}
            subtitle={`${dre.despesa.length} categoria(s) com lançamento`}
          />
          <KPICard
            title="Resultado"
            value={dre.resultado}
            icon={dre.resultado >= 0 ? TrendingUp : TrendingDown}
            variant={dre.resultado >= 0 ? 'success' : 'danger'}
            subtitle="Receita − Despesa"
          />
        </div>

        {/* DRE Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5" />
              DRE Detalhado
              {isDRECompetenciaFechada && snapshot && (
                <Badge variant="secondary" className="ml-2">Competência fechada</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Carregando lançamentos...
              </p>
            ) : (
              <div className="rounded-lg border">
                <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 border-b font-medium text-sm">
                  <div className="flex-1">Linha</div>
                  <div className="w-40 text-right">Valor</div>
                </div>

                <div className="px-4 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Receita
                </div>
                {dre.receita.map(linha => (
                  <LinhaDREView key={`receita-${linha.nome}`} linha={linha} />
                ))}

                <div className="px-4 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Despesa
                </div>
                {dre.despesa.length === 0 ? (
                  <div className="flex items-center gap-4 py-3 px-4 border-b border-border">
                    <div className="flex-1 text-muted-foreground">
                      Nenhuma despesa lançada no período
                    </div>
                    <div className="w-40 text-right font-semibold tabular-nums">
                      {formatCurrency(0)}
                    </div>
                  </div>
                ) : (
                  dre.despesa.map(linha => (
                    <LinhaDREView key={`despesa-${linha.nome}`} linha={linha} />
                  ))
                )}

                <div className="flex items-center gap-4 py-4 px-4 bg-muted/50 border-t-2">
                  <div className="flex-1 font-bold">RESULTADO</div>
                  <div className="w-40 text-right">
                    <span
                      className={`font-bold text-lg tabular-nums ${
                        dre.resultado >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {formatCurrency(dre.resultado)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funcionalidades ausentes — não existe fonte de dado no banco. */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Funcionalidades ausentes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Metas e orçamento (budget)</strong> — não há tabela de metas no banco.
              Sem fonte, as colunas Meta, Δ e o semáforo mostrariam toda categoria como
              100% estourada.
            </p>
            <p>
              <strong>Quebra por centro de custo</strong> — nenhum lançamento financeiro tem
              vínculo com centro de custo no modelo atual.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <FechamentoMensalDrawer
        open={showFechamento}
        onClose={() => setShowFechamento(false)}
      />

      <FechamentoDREModal
        open={showFechamentoDRE}
        onClose={() => setShowFechamentoDRE(false)}
        competencia={competenciaSelecionada}
        lojas={lojasPermitidas.filter(l => lojasAtivas.includes(l.id))}
        dre={dre}
        onFechamentoComplete={handleFechamentoComplete}
      />

      <ReabrirCompetenciaModal
        open={showReabrirDRE}
        onClose={() => setShowReabrirDRE(false)}
        competencia={competenciaSelecionada}
        lojas={lojasPermitidas.filter(l => lojasAtivas.includes(l.id))}
        onReaberturaComplete={handleFechamentoComplete}
      />
    </div>
  );
}
