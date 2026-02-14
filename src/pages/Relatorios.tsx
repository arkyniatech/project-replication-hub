import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, Calendar, FileText, DollarSign, TrendingUp, ExternalLink } from "lucide-react";
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Gere relatórios customizáveis e análises do sistema</p>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{estatisticas.contratosAtivos}</div>
            <div className="text-sm text-muted-foreground">Contratos Ativos</div>
            <div className="text-xs text-muted-foreground">de {estatisticas.totalContratos} total</div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{estatisticas.equipamentosDisponiveis}</div>
            <div className="text-sm text-muted-foreground">Equipamentos Disponíveis</div>
            <div className="text-xs text-muted-foreground">de {estatisticas.totalEquipamentos} total</div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{estatisticas.faturasPendentes}</div>
            <div className="text-sm text-muted-foreground">Faturas Pendentes</div>
            <div className="text-xs text-muted-foreground">de {estatisticas.totalFaturas} total</div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{estatisticas.clientesAtivos}</div>
            <div className="text-sm text-muted-foreground">Clientes Ativos</div>
            <div className="text-xs text-muted-foreground">de {estatisticas.totalClientes} total</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de Período */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Período para Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground block mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.inicio}
                onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground block mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.fim}
                onChange={(e) => setDateRange(prev => ({ ...prev, fim: e.target.value }))}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {relatoriosDisponiveis.map((relatorio) => (
          <Card key={relatorio.id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${relatorio.cor} flex items-center justify-center`}>
                  <relatorio.icone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{relatorio.titulo}</h3>
                    {relatorio.id === 'equipamentos' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/equipamentos/agenda-disponibilidade')}
                        className="text-primary hover:text-primary/80 ml-auto"
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Disponibilidade (30 dias)
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{relatorio.descricao}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatorio.id === 'equipamentos' ? (
                <Tabs value={activeEquipTab} onValueChange={setActiveEquipTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="resumo">Resumo</TabsTrigger>
                    <TabsTrigger value="utilizacao">Utilização</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="resumo" className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Status dos equipamentos, histórico de locações e manutenção no período selecionado.
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Período: {new Date(dateRange.inicio).toLocaleDateString('pt-BR')} até {new Date(dateRange.fim).toLocaleDateString('pt-BR')}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => generateReport(relatorio.titulo, 'PDF')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Gerar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => generateReport(relatorio.titulo, 'Excel')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Gerar Excel
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="utilizacao" className="space-y-3">
                    <UtilizacaoTab periodo={dateRange} />
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1"
                        onClick={() => generateReport(relatorio.titulo, 'PDF')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Gerar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => generateReport(relatorio.titulo, 'Excel')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Gerar Excel
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : relatorio.id === 'financeiro' ? (
                <Tabs value={activeFinanceiroTab} onValueChange={setActiveFinanceiroTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="resumo">Resumo</TabsTrigger>
                    <TabsTrigger value="faturas">Faturas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="resumo" className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Período selecionado: {new Date(dateRange.inicio).toLocaleDateString('pt-BR')} até {new Date(dateRange.fim).toLocaleDateString('pt-BR')}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => generateReport(relatorio.titulo, 'PDF')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Gerar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => generateReport(relatorio.titulo, 'Excel')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Gerar Excel
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="faturas" className="space-y-4">
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
                  <div className="text-sm text-muted-foreground">
                    Período selecionado: {new Date(dateRange.inicio).toLocaleDateString('pt-BR')} até {new Date(dateRange.fim).toLocaleDateString('pt-BR')}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => generateReport(relatorio.titulo, 'PDF')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Gerar PDF
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => generateReport(relatorio.titulo, 'Excel')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Gerar Excel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Relatórios Personalizados */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Relatório Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Configure campos específicos, filtros avançados e agrupamentos para criar relatórios sob medida.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Fonte de Dados
                </label>
                <select className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input">
                  <option value="contratos">Contratos</option>
                  <option value="equipamentos">Equipamentos</option>
                  <option value="clientes">Clientes</option>
                  <option value="faturas">Faturas</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Formato de Saída
                </label>
                <select className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Agrupamento
                </label>
                <select className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input">
                  <option value="">Sem agrupamento</option>
                  <option value="cliente">Por Cliente</option>
                  <option value="equipamento">Por Equipamento</option>
                  <option value="status">Por Status</option>
                  <option value="mes">Por Mês</option>
                </select>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="w-full md:w-auto"
              onClick={() => generateReport("Personalizado")}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Gerar Relatório Personalizado
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}