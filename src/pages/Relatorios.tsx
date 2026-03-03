import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, Calendar, FileText, DollarSign, TrendingUp, ExternalLink, Wrench, Users, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clienteStorage, equipamentoStorage, contratoStorage, faturaStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { UtilizacaoTab } from "@/components/relatorios/UtilizacaoTab";
import { useRelatorioUtilizacaoStore } from "@/stores/relatorioUtilizacaoStore";
import { useNavigate } from "react-router-dom";
import { FaturasFilters } from "@/components/relatorios/FaturasFilters";
import { FaturasPreview } from "@/components/relatorios/FaturasPreview";
import { useSupabaseFaturasRelatorio } from "@/hooks/useSupabaseFaturas";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast as sonnerToast } from "sonner";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { gerarPDFRelatorioFaturas } from "@/utils/faturas-pdf";
import { gerarCSVRelatorioFaturas } from "@/utils/faturas-csv";

// Helper para formatar datas sem conversão UTC (preserva timezone local)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Relatorios() {
  const { lojaAtual, lojasPermitidas } = useMultiunidade();
  
  const [dateRange, setDateRange] = useState({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fim: new Date().toISOString().split('T')[0]
  });
  const [activeEquipTab, setActiveEquipTab] = useState('resumo');
  const [activeFinanceiroTab, setActiveFinanceiroTab] = useState('resumo');
  
  // Estados para filtros de faturas
  const [faturasDateRange, setFaturasDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [faturasLojaId, setFaturasLojaId] = useState<string>(
    lojaAtual?.id || lojasPermitidas[0]?.id || ""
  );
  const [faturasClienteId, setFaturasClienteId] = useState<string>("");
  const [faturasTipo, setFaturasTipo] = useState<string>("");
  const [faturasFormaPagamento, setFaturasFormaPagamento] = useState<string>("");
  
  // Estado de loading para feedback visual do botão
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  
  // Estado local para controlar os dados exibidos
  const [displayedFaturasData, setDisplayedFaturasData] = useState<{
    faturas: any[];
    totalFaturas: number;
    totalValor: number;
  } | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getCsvData, getPdfData } = useRelatorioUtilizacaoStore();
  
  // Hook para buscar faturas com filtros
  const { data: faturasData, refetch: refetchFaturas, isLoading: isLoadingFaturas } = useSupabaseFaturasRelatorio({
    lojaId: faturasLojaId === 'todas' ? undefined : faturasLojaId,
    clienteId: faturasClienteId === 'todos' ? undefined : faturasClienteId,
    dataInicio: faturasDateRange?.from ? formatLocalDate(faturasDateRange.from) : undefined,
    dataFim: faturasDateRange?.to ? formatLocalDate(faturasDateRange.to) : undefined,
    tipo: faturasTipo === 'todos' ? undefined : faturasTipo,
    formaPagamento: faturasFormaPagamento === 'todas' ? undefined : faturasFormaPagamento,
  });
  
  // ✅ Sincronizar estado inicial com dados do hook
  useEffect(() => {
    if (faturasData && !displayedFaturasData) {
      setDisplayedFaturasData({
        faturas: faturasData.faturas || [],
        totalFaturas: faturasData.totalFaturas || 0,
        totalValor: faturasData.totalValor || 0,
      });
    }
  }, [faturasData, displayedFaturasData]);

  const handleApplyFaturasFilters = async () => {
    // ✅ Validação de segurança
    if (!faturasLojaId || faturasLojaId === '') {
      sonnerToast.error('Selecione uma unidade antes de aplicar os filtros');
      return;
    }
    
    setIsApplyingFilters(true); // ✅ Ativar loading
    
    console.log('🔍 Filtros aplicados:', {
      lojaId: faturasLojaId,
      clienteId: faturasClienteId,
      dataInicio: faturasDateRange?.from ? formatLocalDate(faturasDateRange.from) : undefined,
      dataFim: faturasDateRange?.to ? formatLocalDate(faturasDateRange.to) : undefined,
      tipo: faturasTipo,
      formaPagamento: faturasFormaPagamento,
    });
    
    try {
      const result = await refetchFaturas(); // ✅ Forçar refetch EXPLÍCITO
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      if (result.data) {
        setDisplayedFaturasData({
          faturas: result.data.faturas || [],
          totalFaturas: result.data.totalFaturas || 0,
          totalValor: result.data.totalValor || 0,
        });
      }
      
      console.log('✅ Faturas carregadas:', result.data?.totalFaturas || 0);
      
      // ✅ Feedback visual diferenciado
      if (result.data?.totalFaturas === 0) {
        sonnerToast.info('Nenhuma fatura encontrada para os filtros selecionados');
      } else {
        sonnerToast.success(
          `${result.data?.totalFaturas} fatura(s) encontrada(s)`,
          {
            description: `Total: R$ ${(result.data?.totalValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            duration: 3000,
          }
        );
      }
    } finally {
      setIsApplyingFilters(false); // ✅ Desativar loading (sempre)
    }
  };

  const handleClearFaturasFilters = () => {
    setFaturasDateRange({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    });
    setFaturasLojaId(lojaAtual?.id || lojasPermitidas[0]?.id || "");
    setFaturasClienteId("");
    setFaturasTipo("");
    setFaturasFormaPagamento("");
  };

  const handleGenerateFaturasPDF = async () => {
    if (!displayedFaturasData || displayedFaturasData.totalFaturas === 0) {
      sonnerToast.error("Nenhuma fatura encontrada para gerar o relatório");
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      const faturasPDF = displayedFaturasData.faturas.map((f) => ({
        numero: f.numero || 'S/N',
        emissao: f.emissao,
        cliente: f.clientes?.nome || f.clientes?.razao_social || 'Sem cliente',
        contrato: f.contratos?.numero || 'S/N',
        tipo: f.tipo === 'FISCAL_MOCK' ? 'Fiscal' : 'Demonstrativo',
        forma: f.forma_preferida || 'N/A',
        total: f.total || 0,
      }));

      await gerarPDFRelatorioFaturas(faturasPDF, {
        periodo: faturasDateRange ? {
          inicio: format(faturasDateRange.from!, 'yyyy-MM-dd'),
          fim: format(faturasDateRange.to!, 'yyyy-MM-dd')
        } : undefined,
        loja: faturasLojaId ? lojasPermitidas.find(l => l.id === faturasLojaId)?.nome || 'Todas as unidades' : 'Todas as unidades',
        totalFaturas: displayedFaturasData.totalFaturas,
        totalValor: displayedFaturasData.totalValor,
      });

      sonnerToast.success("PDF gerado com sucesso!", {
        description: "O arquivo foi baixado automaticamente",
        duration: 3000,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      sonnerToast.error("Erro ao gerar PDF", {
        description: "Tente novamente ou contate o suporte",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateFaturasExcel = async () => {
    if (!displayedFaturasData || displayedFaturasData.totalFaturas === 0) {
      sonnerToast.error("Nenhuma fatura encontrada para gerar o relatório");
      return;
    }

    setIsGeneratingExcel(true);
    
    try {
      const faturasCSV = displayedFaturasData.faturas.map((f) => ({
        numero: f.numero || 'S/N',
        emissao: f.emissao,
        cliente: f.clientes?.nome || f.clientes?.razao_social || 'Sem cliente',
        contrato: f.contratos?.numero || 'S/N',
        tipo: f.tipo === 'FISCAL_MOCK' ? 'Fiscal' : 'Demonstrativo',
        forma: f.forma_preferida || 'N/A',
        total: f.total || 0,
      }));

      gerarCSVRelatorioFaturas(faturasCSV, {
        periodo: faturasDateRange ? {
          inicio: format(faturasDateRange.from!, 'yyyy-MM-dd'),
          fim: format(faturasDateRange.to!, 'yyyy-MM-dd')
        } : undefined,
        loja: faturasLojaId ? lojasPermitidas.find(l => l.id === faturasLojaId)?.nome || 'Todas as unidades' : 'Todas as unidades',
        totalFaturas: displayedFaturasData.totalFaturas,
        totalValor: displayedFaturasData.totalValor,
      });

      sonnerToast.success("Excel gerado com sucesso!", {
        description: "O arquivo foi baixado automaticamente",
        duration: 3000,
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      sonnerToast.error("Erro ao gerar Excel", {
        description: "Tente novamente ou contate o suporte",
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const generateReport = (tipo: string, formato: 'PDF' | 'Excel' = 'PDF') => {
    // Se estivermos na aba Utilização do card de equipamentos, usar dados específicos
    if (tipo === 'Relatório de Equipamentos' && activeEquipTab === 'utilizacao') {
      if (formato === 'Excel') {
        const csvData = getCsvData();
        if (csvData.length === 0) {
          toast({
            title: "Nenhum dado para exportar",
            description: "Não há dados de utilização para o período selecionado.",
            variant: "destructive"
          });
          return;
        }
        
        // Simular export CSV
        const csvContent = [
          Object.keys(csvData[0]).join(';'),
          ...csvData.map(row => Object.values(row).join(';'))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `utilizacao-equipamentos-${dateRange.inicio}-${dateRange.fim}.csv`;
        link.click();
        
        toast({
          title: "Excel gerado",
          description: "O relatório de utilização foi exportado em CSV.",
        });
        return;
      } else {
        // PDF
        const pdfData = getPdfData();
        console.log('Gerando PDF com dados:', pdfData);
        
        toast({
          title: "PDF gerado",
          description: "O relatório de utilização foi gerado em PDF.",
        });
        return;
      }
    }
    
    // Lógica original para outros relatórios
    toast({
      title: `${formato} gerado`,
      description: `O relatório de ${tipo} foi gerado e será baixado em instantes.`,
    });
  };

  const relatoriosDisponiveis = [
    {
      id: 'contratos',
      titulo: 'Relatório de Contratos',
      descricao: 'Lista completa de contratos por período, cliente ou status',
      icone: FileText,
      cor: 'bg-blue-500',
    },
    {
      id: 'equipamentos',
      titulo: 'Relatório de Equipamentos',
      descricao: 'Status dos equipamentos, histórico de locações e utilização',
      icone: BarChart3,
      cor: 'bg-green-500',
    },
    {
      id: 'financeiro',
      titulo: 'Relatório Financeiro',
      descricao: 'Faturas, recebimentos, inadimplência e fluxo de caixa',
      icone: DollarSign,
      cor: 'bg-yellow-500',
    },
    {
      id: 'clientes',
      titulo: 'Relatório de Clientes',
      descricao: 'Cadastro de clientes, histórico e análise de crédito',
      icone: TrendingUp,
      cor: 'bg-purple-500',
    },
  ];

  const estatisticas = {
    totalContratos: contratoStorage.getAll().length,
    contratosAtivos: contratoStorage.getAll().filter(c => c.status === 'ATIVO' || c.status === 'AGENDADO' || c.status === 'AGUARDANDO_ENTREGA').length,
    totalEquipamentos: equipamentoStorage.getAll().length,
    equipamentosDisponiveis: equipamentoStorage.getAll().filter(e => e.status === 'Disponível').length,
    totalFaturas: faturaStorage.getAll().length,
    faturasPendentes: faturaStorage.getAll().filter(f => f.status === 'Em aberto').length,
    totalClientes: clienteStorage.getAll().length,
    clientesAtivos: clienteStorage.getAll().filter(c => c.statusCredito === 'Ativo').length,
  };

  return (
    <div className="space-y-6">
      {/* Header compacto com gradiente */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análises e exportações do sistema</p>
          </div>
        </div>
        
        {/* Filtro de período inline */}
        <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border/50">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={dateRange.inicio}
            onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
            className="bg-transparent text-sm text-foreground border-none outline-none w-[130px]"
          />
          <span className="text-muted-foreground text-xs">até</span>
          <input
            type="date"
            value={dateRange.fim}
            onChange={(e) => setDateRange(prev => ({ ...prev, fim: e.target.value }))}
            className="bg-transparent text-sm text-foreground border-none outline-none w-[130px]"
          />
        </div>
      </div>

      {/* Estatísticas Rápidas - Redesign com ícones coloridos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">{estatisticas.contratosAtivos}</div>
              <div className="text-xs text-muted-foreground truncate">Contratos Ativos</div>
              <div className="text-[10px] text-muted-foreground/60">{estatisticas.totalContratos} total</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">{estatisticas.equipamentosDisponiveis}</div>
              <div className="text-xs text-muted-foreground truncate">Equip. Disponíveis</div>
              <div className="text-[10px] text-muted-foreground/60">{estatisticas.totalEquipamentos} total</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">{estatisticas.faturasPendentes}</div>
              <div className="text-xs text-muted-foreground truncate">Faturas Pendentes</div>
              <div className="text-[10px] text-muted-foreground/60">{estatisticas.totalFaturas} total</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">{estatisticas.clientesAtivos}</div>
              <div className="text-xs text-muted-foreground truncate">Clientes Ativos</div>
              <div className="text-[10px] text-muted-foreground/60">{estatisticas.totalClientes} total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de período mobile */}
      <div className="md:hidden">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Período</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Início</label>
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
                <input
                  type="date"
                  value={dateRange.fim}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fim: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm text-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios Disponíveis - Cards modernos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {relatoriosDisponiveis.map((relatorio) => (
          <Card key={relatorio.id} className="border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-200 group">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${relatorio.cor} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <relatorio.icone className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{relatorio.titulo}</h3>
                    {relatorio.id === 'equipamentos' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/equipamentos/agenda-disponibilidade')}
                        className="text-primary hover:text-primary/80 ml-auto h-7 text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Disponibilidade
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{relatorio.descricao}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {relatorio.id === 'equipamentos' ? (
                <Tabs value={activeEquipTab} onValueChange={setActiveEquipTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-3 h-8">
                    <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
                    <TabsTrigger value="utilizacao" className="text-xs">Utilização</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="resumo" className="space-y-3 mt-0">
                    <p className="text-xs text-muted-foreground">
                      Período: {new Date(dateRange.inicio).toLocaleDateString('pt-BR')} — {new Date(dateRange.fim).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'PDF')}>
                        <Download className="w-3 h-3 mr-1.5" /> PDF
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'Excel')}>
                        <Download className="w-3 h-3 mr-1.5" /> Excel
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="utilizacao" className="space-y-3 mt-0">
                    <UtilizacaoTab periodo={dateRange} />
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'PDF')}>
                        <Download className="w-3 h-3 mr-1.5" /> PDF
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'Excel')}>
                        <Download className="w-3 h-3 mr-1.5" /> Excel
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : relatorio.id === 'financeiro' ? (
                <Tabs value={activeFinanceiroTab} onValueChange={setActiveFinanceiroTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-3 h-8">
                    <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
                    <TabsTrigger value="faturas" className="text-xs">Faturas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="resumo" className="space-y-3 mt-0">
                    <p className="text-xs text-muted-foreground">
                      Período: {new Date(dateRange.inicio).toLocaleDateString('pt-BR')} — {new Date(dateRange.fim).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'PDF')}>
                        <Download className="w-3 h-3 mr-1.5" /> PDF
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'Excel')}>
                        <Download className="w-3 h-3 mr-1.5" /> Excel
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="faturas" className="space-y-4 mt-0">
                    <FaturasFilters
                      dateRange={faturasDateRange}
                      onDateRangeChange={setFaturasDateRange}
                      lojaId={faturasLojaId}
                      onLojaChange={setFaturasLojaId}
                      clienteId={faturasClienteId}
                      onClienteChange={setFaturasClienteId}
                      tipo={faturasTipo}
                      onTipoChange={setFaturasTipo}
                      formaPagamento={faturasFormaPagamento}
                      onFormaPagamentoChange={setFaturasFormaPagamento}
                      onApplyFilters={handleApplyFaturasFilters}
                      onClearFilters={handleClearFaturasFilters}
                      isApplying={isApplyingFilters}
                    />
                    <FaturasPreview
                      faturas={displayedFaturasData?.faturas || []}
                      totalFaturas={displayedFaturasData?.totalFaturas || 0}
                      totalValor={displayedFaturasData?.totalValor || 0}
                      isLoading={isApplyingFilters}
                      onGeneratePDF={handleGenerateFaturasPDF}
                      onGenerateExcel={handleGenerateFaturasExcel}
                      isGeneratingPDF={isGeneratingPDF}
                      isGeneratingExcel={isGeneratingExcel}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Período: {new Date(dateRange.inicio).toLocaleDateString('pt-BR')} — {new Date(dateRange.fim).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'PDF')}>
                      <Download className="w-3 h-3 mr-1.5" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => generateReport(relatorio.titulo, 'Excel')}>
                      <Download className="w-3 h-3 mr-1.5" /> Excel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Relatório Personalizado - Visual compacto */}
      <Card className="border-border/50 border-dashed hover:border-primary/30 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Relatório Personalizado</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure campos, filtros e agrupamentos sob medida
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fonte de Dados</label>
              <Select defaultValue="contratos">
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratos">Contratos</SelectItem>
                  <SelectItem value="equipamentos">Equipamentos</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="faturas">Faturas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Formato</label>
              <Select defaultValue="pdf">
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Agrupamento</label>
              <Select defaultValue="none">
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem agrupamento</SelectItem>
                  <SelectItem value="cliente">Por Cliente</SelectItem>
                  <SelectItem value="equipamento">Por Equipamento</SelectItem>
                  <SelectItem value="status">Por Status</SelectItem>
                  <SelectItem value="mes">Por Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button size="sm" className="h-9" onClick={() => generateReport("Personalizado")}>
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Gerar Relatório
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}