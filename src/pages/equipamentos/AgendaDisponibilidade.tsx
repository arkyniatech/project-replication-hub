import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  ArrowLeft,
  Search,
  Download,
  Printer,
  RefreshCw,
  Calendar,
  User,
  FileText,
  Shield,
  MessageSquare
} from "lucide-react";
import { useAgendaDisponibilidadeStore } from "@/stores/agendaDisponibilidadeStore";
import { useContratosStore } from "@/stores/contratosStore";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { usePermissions } from "@/hooks/usePermissions";
import { addDays, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { AgendaDia, LinhaAgenda } from "@/types/disponibilidade";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";

export default function AgendaDisponibilidade() {
  const navigate = useNavigate();
  const { session } = useMultiunidade();
  const { can } = usePermissions();
  
  const {
    filtros,
    setFiltros,
    buildAgenda,
    exportarCSV,
    exportarPDF
  } = useAgendaDisponibilidadeStore();
  
  const { syncFromStorage } = useContratosStore();
  
  // Fetch data from Supabase
  const { equipamentos } = useSupabaseEquipamentos(session.lojaAtivaId);
  const { grupos } = useSupabaseGrupos();
  const { modelos } = useSupabaseModelos();
  const { contratos } = useSupabaseContratos(session.lojaAtivaId);

  const [linhas, setLinhas] = useState<LinhaAgenda[]>([]);
  const [selectedCelula, setSelectedCelula] = useState<{
    linha: LinhaAgenda;
    dia: AgendaDia;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initialize data
  useEffect(() => {
    if (session.lojaAtivaId && equipamentos.length > 0 && grupos.length > 0 && modelos.length > 0) {
      if (filtros.lojaId !== session.lojaAtivaId) {
        setFiltros({ lojaId: session.lojaAtivaId });
      }
      syncFromStorage();
      const agendaData = buildAgenda(session.lojaAtivaId, equipamentos, grupos, modelos, contratos);
      setLinhas(agendaData);
    }

    // Initialize contract integrations
    import('@/utils/contract-integrations').then(({ initializeContractIntegrations }) => {
      initializeContractIntegrations();
    });
  }, [session.lojaAtivaId, equipamentos, grupos, modelos, contratos, filtros.lojaId, setFiltros, syncFromStorage, buildAgenda]);

  // Generate date columns (30 days)
  const hoje = startOfDay(new Date());
  const colunasDias = Array.from({ length: 30 }, (_, i) => {
    const data = addDays(hoje, i);
    return {
      data: format(data, 'yyyy-MM-dd'),
      label: format(data, 'dd/MM', { locale: ptBR }),
      isToday: i === 0,
      isWeekend: data.getDay() === 0 || data.getDay() === 6
    };
  });

  // Handlers
  const handleBack = () => navigate('/equipamentos');
  
  const handleSearch = (value: string) => {
    setFiltros({ busca: value || undefined });
    // Re-filter lines based on search
    if (session.lojaAtivaId && equipamentos.length > 0) {
      const agendaData = buildAgenda(session.lojaAtivaId, equipamentos, grupos, modelos, contratos);
      const filtered = agendaData.filter(linha => {
        if (!value) return true;
        const searchLower = value.toLowerCase();
        return linha.display.toLowerCase().includes(searchLower) ||
               linha.grupo.toLowerCase().includes(searchLower) ||
               linha.modelo.toLowerCase().includes(searchLower);
      });
      setLinhas(filtered);
    }
  };

  const handleExportCSV = () => {
    if (!can('equipamentos', 'ver')) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para exportar relatórios.",
        variant: "destructive",
      });
      return;
    }
    exportarCSV(linhas, filtros);
    toast({
      description: "Relatório CSV exportado com sucesso!",
    });
  };

  const handleExportPDF = () => {
    if (!can('equipamentos', 'ver')) {
      toast({
        title: "Acesso negado", 
        description: "Você não tem permissão para exportar relatórios.",
        variant: "destructive",
      });
      return;
    }
    exportarPDF(linhas, filtros);
    toast({
      description: "Relatório PDF exportado com sucesso!",
    });
  };

  const handleCelulaClick = (linha: LinhaAgenda, dia: AgendaDia) => {
    setSelectedCelula({ linha, dia });
    setDrawerOpen(true);
  };

  const handleReservar = () => {
    if (!can('contratos', 'create')) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar reservas.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      description: "Reserva criada!",
    });
    setDrawerOpen(false);
  };

  const handleAvisarComercial = () => {
    toast({
      description: "Aviso enviado ao comercial!",
    });
    setDrawerOpen(false);
  };

  const handleRefreshData = () => {
    if (session.lojaAtivaId && equipamentos.length > 0) {
      syncFromStorage();
      const agendaData = buildAgenda(session.lojaAtivaId, equipamentos, grupos, modelos, contratos);
      setLinhas(agendaData);
      toast({
        description: "Dados atualizados com sucesso!",
      });
    }
  };

  // KPIs
  const totalLinhas = linhas.length;
  const totalDisponiveis = linhas.reduce((sum, linha) => 
    sum + linha.dias.filter(dia => dia.status === 'DISPONIVEL').length, 0);
  const totalLocados = linhas.reduce((sum, linha) => 
    sum + linha.dias.filter(dia => dia.status === 'LOCADO').length, 0);
  const totalReservados = linhas.reduce((sum, linha) => 
    sum + linha.dias.filter(dia => dia.status === 'RESERVADO').length, 0);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {(can('equipamentos', 'ver') || can('contratos', 'ver')) && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Printer className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* Filters & KPIs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, equipamento, grupo ou modelo..."
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select 
              value={filtros.tipo || 'AMBOS'} 
              onValueChange={(value) => setFiltros({ tipo: value as any })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AMBOS">Todos</SelectItem>
                <SelectItem value="SERIE">Série</SelectItem>
                <SelectItem value="SALDO">Saldo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* KPIs */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Total:</span>
              <Badge variant="outline">{totalLinhas} linhas</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-200"></div>
              <span>Disponível: {totalDisponiveis}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200"></div>
              <span>Locado: {totalLocados}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-200"></div>
              <span>Reservado: {totalReservados}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Legenda:</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Disponível
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Reservado
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Locado
          </Badge>
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            Em Revisão
          </Badge>
        </div>
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header */}
              <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                <div className="w-80 min-w-[320px] p-3 font-medium border-r sticky left-0 bg-muted/50 z-20">Equipamento/Modelo</div>
                {colunasDias.map((dia) => (
                  <div 
                    key={dia.data} 
                    className={`w-12 min-w-[48px] p-1 text-center font-medium border-r text-xs ${
                      dia.isToday ? 'bg-primary/10 text-primary' : ''
                    } ${dia.isWeekend ? 'bg-muted/30' : ''}`}
                  >
                    {dia.label}
                    {dia.isToday && (
                      <div className="text-xs opacity-60">Hoje</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {linhas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum equipamento encontrado</p>
                  <p className="text-sm">Ajuste os filtros ou atualize os dados</p>
                </div>
              ) : (
                <TooltipProvider>
                  {linhas.map((linha) => (
                    <div key={linha.id} className="flex border-b hover:bg-muted/30 h-10">
                      <div className="w-80 min-w-[320px] p-2 border-r flex items-center sticky left-0 bg-background z-10">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{linha.display}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {linha.grupo} • {linha.tipo}
                          </div>
                        </div>
                      </div>
                      {colunasDias.map((dia) => {
                        const diaData = linha.dias.find(d => d.dateISO === dia.data);
                        const status = diaData?.status || 'DISPONIVEL';
                        
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'DISPONIVEL': return 'bg-green-100 hover:bg-green-200 border-green-200';
                            case 'RESERVADO': return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200';
                            case 'LOCADO': return 'bg-orange-100 hover:bg-orange-200 border-orange-200';
                            case 'REVISAO': return 'bg-slate-100 hover:bg-slate-200 border-slate-200';
                            default: return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
                          }
                        };

                        const isOcupado = status !== 'DISPONIVEL' && diaData?.contratoNumero;

                        return (
                          <Tooltip key={dia.data}>
                            <TooltipTrigger asChild>
                              <div 
                                className={`w-12 min-w-[48px] h-full border-r border-b cursor-pointer ${getStatusColor(status)} ${
                                  dia.isWeekend ? 'opacity-75' : ''
                                } ${isOcupado ? 'cursor-pointer' : ''}`}
                                onClick={() => diaData && handleCelulaClick(linha, diaData)}
                              >
                                <div className="w-full h-full flex items-center justify-center">
                                  {status !== 'DISPONIVEL' && (
                                    <div className="text-xs font-medium">
                                      {status.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <div>
                                <div className="font-medium">{linha.display}</div>
                                <div className="text-muted-foreground">{format(new Date(dia.data), 'dd/MM/yyyy', { locale: ptBR })}</div>
                                <div className="font-medium">Status: {status}</div>
                                {diaData?.clienteNome && (
                                  <>
                                    <div>Cliente: {diaData.clienteNome}</div>
                                    <div>Contrato: {diaData.contratoNumero}</div>
                                  </>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cell Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle>Resumo do Dia</DrawerTitle>
          </DrawerHeader>
          {selectedCelula && (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data
                  </h3>
                  <p className="font-medium">{format(new Date(selectedCelula.dia.dateISO), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Equipamento/Modelo
                  </h3>
                  <p className="font-medium">{selectedCelula.linha.display}</p>
                  <p className="text-sm text-muted-foreground">{selectedCelula.linha.grupo}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Status</h3>
                  <Badge 
                    variant="outline"
                    className={
                      selectedCelula.dia.status === 'LOCADO'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : selectedCelula.dia.status === 'RESERVADO'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : selectedCelula.dia.status === 'REVISAO'
                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }
                  >
                    {selectedCelula.dia.status}
                  </Badge>
                </div>

                {selectedCelula.dia.contratoNumero && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Cliente
                      </h3>
                      <p className="font-medium">{selectedCelula.dia.clienteNome}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Contrato</h3>
                      <p className="font-medium">{selectedCelula.dia.contratoNumero}</p>
                    </div>
                  </>
                )}
              </div>

              {can('contratos', 'create') && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleReservar} className="flex-1">
                    <Shield className="h-4 w-4 mr-2" />
                    Reservar
                  </Button>
                  <Button variant="outline" onClick={handleAvisarComercial} className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Avisar Comercial
                  </Button>
                </div>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}