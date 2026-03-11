import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Edit, Eye, FileText, RotateCcw, Calendar } from "lucide-react";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { IfPerm, PermButton } from "@/components/rbac";
import { usePermissionChecks } from "@/hooks/useRbacPermissions";
import RenovarContratoModal from "@/components/modals/RenovarContratoModal";
import { differenceInDays, parseISO, isToday, isTomorrow, startOfDay, isWithinInterval, format } from 'date-fns';

export default function Contratos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const { lojaAtual } = useMultiunidade();
  const { contratos: contratosSupabase, isLoading } = useSupabaseContratos(lojaAtual?.id);
  
  // Mapear contratos do Supabase para formato local
  const contratos = useMemo(() => {
    if (!contratosSupabase) return [];
    return contratosSupabase.map(c => ({
      id: c.id,
      numero: c.numero,
      clienteId: c.cliente_id,
      lojaId: c.loja_id,
      status: c.status,
      dataInicio: c.data_inicio,
      dataFim: c.data_fim || c.data_prevista_fim,
      valorTotal: Number(c.valor_total),
      itens: c.contrato_itens?.map(item => ({
        id: item.id,
        equipamentoId: item.equipamento_id,
        quantidade: item.quantidade,
        valorTotal: Number(item.preco_total),
      })) || [],
      cliente: {
        id: c.clientes?.id || c.cliente_id,
        nome: c.clientes?.nome || c.clientes?.razao_social || 'Cliente',
        nomeRazao: c.clientes?.nome || c.clientes?.razao_social || 'Cliente',
        documento: c.clientes?.cpf || c.clientes?.cnpj || '',
      },
      createdAt: c.created_at,
    }));
  }, [contratosSupabase]);
  
  const { canViewContratos, canCreateContratos, canEditContratos } = usePermissionChecks();

  // Estados para Renovações
  const [renovacaoFilter, setRenovacaoFilter] = useState<'HOJE' | 'AMANHA' | 'PROXIMOS_7' | 'ENCERRADOS' | 'TODOS_ATIVOS' | 'TODOS'>('TODOS_ATIVOS');
  const [renovarModo, setRenovarModo] = useState<'manter' | 'editar'>('editar');
  const [renovacaoDateRange, setRenovacaoDateRange] = useState<{ start: string; end: string } | null>(null);
  const [renovarModalOpen, setRenovarModalOpen] = useState(false);
  const [contratoParaRenovar, setContratoParaRenovar] = useState<any>(null);

  // Tab control
  const activeTab = searchParams.get('tab') || 'todos';

  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: 'todos' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Filtro principal (aba Todos)
  const filteredContratos = useMemo(() => {
    return contratos
      .filter((contrato) => {
        const matchesSearch = 
          contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contrato.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contrato.cliente.documento.includes(searchTerm);
        
        const matchesStatus = !statusFilter || contrato.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Ordenar do mais recente para o mais antigo usando parseISO
        const dateA = parseISO(a.createdAt || a.dataInicio).getTime();
        const dateB = parseISO(b.createdAt || b.dataInicio).getTime();
        return dateB - dateA; // Decrescente (mais recente primeiro)
      });
  }, [contratos, searchTerm, statusFilter]);

  // Filtro de renovações
  const contratosParaRenovacao = useMemo(() => {
    const hoje = startOfDay(new Date());
    
    return contratos
      .filter((contrato) => {
        // Apenas contratos ativos
        if (!['Ativo', 'ATIVO', 'EM_ANDAMENTO'].includes(contrato.status)) return false;
        if (!contrato.dataFim) return false;
        
        const dataFim = parseISO(contrato.dataFim);
        const diasRestantes = differenceInDays(dataFim, hoje);
        
        // Aplicar filtro de data customizado
        if (renovacaoDateRange) {
          const start = parseISO(renovacaoDateRange.start);
          const end = parseISO(renovacaoDateRange.end);
          return isWithinInterval(dataFim, { start, end });
        }
        
        // Filtros rápidos
        switch (renovacaoFilter) {
          case 'HOJE':
            return isToday(dataFim);
          case 'AMANHA':
            return isTomorrow(dataFim);
          case 'PROXIMOS_7':
            return diasRestantes >= 0 && diasRestantes <= 7;
          case 'ENCERRADOS':
            return diasRestantes < 0;
          case 'TODOS':
            return diasRestantes <= 30; // Próximos 30 dias ou já encerrados
          default:
            return true;
        }
      })
      .map((contrato) => {
        const dataFim = parseISO(contrato.dataFim);
        const diasRestantes = differenceInDays(dataFim, hoje);
        
        // Se o contrato está ATIVO mas data_fim passou, considerar como "precisa renovar"
        let criticidade;
        if (['ATIVO', 'Ativo', 'EM_ANDAMENTO'].includes(contrato.status) && diasRestantes < 0) {
          criticidade = 'RENOVACAO_PENDENTE';
        } else if (diasRestantes < 0) {
          criticidade = 'ATRASADO';
        } else if (diasRestantes === 0) {
          criticidade = 'HOJE';
        } else if (diasRestantes === 1) {
          criticidade = 'AMANHA';
        } else {
          criticidade = 'NORMAL';
        }
        
        return {
          ...contrato,
          diasRestantes,
          criticidade
        };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [contratos, renovacaoFilter, renovacaoDateRange]);

  // KPIs de renovação
  const renovacaoKPIs = useMemo(() => {
    const hoje = startOfDay(new Date());
    const todosAtivos = contratos.filter(c => 
      ['Ativo', 'ATIVO', 'EM_ANDAMENTO'].includes(c.status) && c.dataFim
    );
    
    return {
      hoje: todosAtivos.filter(c => isToday(parseISO(c.dataFim))).length,
      amanha: todosAtivos.filter(c => isTomorrow(parseISO(c.dataFim))).length,
      proximos7: todosAtivos.filter(c => {
        const dias = differenceInDays(parseISO(c.dataFim), hoje);
        return dias >= 0 && dias <= 7;
      }).length,
      atrasados: todosAtivos.filter(c => differenceInDays(parseISO(c.dataFim), hoje) < 0).length,
    };
  }, [contratos]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'Aguardando entrega': { label: 'Aguardando Entrega', color: 'info' as const },
      'Ativo': { label: 'Ativo', color: 'success' as const },
      'Finalizado': { label: 'Finalizado', color: 'secondary' as const },
      'Cancelado': { label: 'Cancelado', color: 'destructive' as const },
      'Em atraso': { label: 'Em Atraso', color: 'warning' as const },
    };
    return statusMap[status] || { label: status, color: 'secondary' as const };
  };

  const uniqueStatus = [...new Set(contratos.map(c => c.status))];

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      // Usar parseISO para evitar conversão de timezone
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const calcularDiasRestantes = (dataFim: string) => {
    // Usar startOfDay e parseISO para evitar conversão de timezone
    const hoje = startOfDay(new Date());
    const fim = parseISO(dataFim);
    return differenceInDays(fim, hoje);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
    // Reset filtros ao trocar de aba
    if (value === 'renovacoes') {
      setRenovacaoFilter('PROXIMOS_7');
      setRenovacaoDateRange(null);
    } else {
      setSearchTerm('');
      setStatusFilter('');
    }
  };

  const handleRenovarClick = (contrato: any) => {
    setContratoParaRenovar(contrato);
    setRenovarModalOpen(true);
  };

  const getCriticidadeBadge = (criticidade: string, diasRestantes: number, status: string) => {
    switch (criticidade) {
      case 'RENOVACAO_PENDENTE':
        return <Badge className="bg-purple-500 text-white hover:bg-purple-600">Renovação Pendente (venceu há {Math.abs(diasRestantes)} dia(s))</Badge>;
      case 'ATRASADO':
        return <Badge variant="destructive">Encerrado há {Math.abs(diasRestantes)} dia(s)</Badge>;
      case 'HOJE':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Encerra HOJE</Badge>;
      case 'AMANHA':
        return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Encerra AMANHÃ</Badge>;
      default:
        return <Badge variant="outline">{diasRestantes} dia(s) restantes</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Gerencie os contratos de locação</p>
        </div>
        <IfPerm perm="contratos:create">
          <Button className="mt-4 md:mt-0" onClick={() => navigate('/contratos/novo')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Contrato
          </Button>
        </IfPerm>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="todos">
            <FileText className="h-4 w-4 mr-2" />
            Todos os Contratos
          </TabsTrigger>
          <TabsTrigger value="renovacoes">
            <RotateCcw className="h-4 w-4 mr-2" />
            Renovações
          </TabsTrigger>
        </TabsList>

        {/* Aba: Todos os Contratos */}
        <TabsContent value="todos" className="mt-6">
          {/* Filtros */}
          <Card className="shadow-md mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número, cliente ou documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 shadow-input border-input-border"
                    />
                  </div>
                </div>
                <div className="md:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input"
                  >
                    <option value="">Todos os Status</option>
                    {uniqueStatus.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Contratos */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Contratos ({filteredContratos.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando contratos...</p>
                </div>
              ) : filteredContratos.length > 0 ? (
                <div className="space-y-4">
                  {filteredContratos.map((contrato) => {
                    const diasRestantes = calcularDiasRestantes(contrato.dataFim);
                    return (
                      <div
                        key={contrato.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-foreground">{contrato.numero}</h3>
                              <StatusBadge status={getStatusInfo(contrato.status)} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                Cliente: {contrato.cliente.nome}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {contrato.cliente.documento}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  Início: <span className="font-medium text-foreground">
                                    {formatDate(contrato.dataInicio)}
                                  </span>
                                </span>
                                <span className="text-muted-foreground">
                                  Fim: <span className="font-medium text-foreground">
                                    {formatDate(contrato.dataFim)}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  Valor Total: <span className="font-bold text-foreground">
                                    R$ {contrato.valorTotal.toLocaleString('pt-BR')}
                                  </span>
                                </span>
                                <span className="text-muted-foreground">
                                  Equipamentos: <span className="font-medium text-foreground">
                                    {contrato.itens.length}
                                  </span>
                                </span>
                              </div>
                              {['ATIVO', 'Ativo'].includes(contrato.status) && (
                                <div className="flex items-center gap-2">
                                  {diasRestantes > 0 ? (
                                    <span className="text-xs bg-info/20 text-info px-2 py-1 rounded">
                                      {diasRestantes} dias restantes
                                    </span>
                                  ) : diasRestantes === 0 ? (
                                    <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded">
                                      Vence hoje
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                                      Vencido há {Math.abs(diasRestantes)} dias
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/contratos/${contrato.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <IfPerm perm="contratos:edit">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/contratos/${contrato.id}`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </IfPerm>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter 
                      ? "Nenhum contrato encontrado com os filtros aplicados" 
                      : "Nenhum contrato cadastrado"
                    }
                  </p>
                  {!searchTerm && !statusFilter && (
                    <IfPerm perm="contratos:create">
                      <Button className="mt-4" onClick={() => navigate('/contratos/novo')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Contrato
                      </Button>
                    </IfPerm>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Renovações */}
        <TabsContent value="renovacoes" className="mt-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Encerram Hoje</div>
                <div className="text-2xl font-bold text-orange-600">{renovacaoKPIs.hoje}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Encerram Amanhã</div>
                <div className="text-2xl font-bold text-yellow-600">{renovacaoKPIs.amanha}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Próximos 7 dias</div>
                <div className="text-2xl font-bold">{renovacaoKPIs.proximos7}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Já Encerrados</div>
                <div className="text-2xl font-bold text-red-600">{renovacaoKPIs.atrasados}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={renovacaoFilter === 'HOJE' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRenovacaoFilter('HOJE');
                      setRenovacaoDateRange(null);
                    }}
                  >
                    Hoje
                  </Button>
                  <Button
                    variant={renovacaoFilter === 'AMANHA' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRenovacaoFilter('AMANHA');
                      setRenovacaoDateRange(null);
                    }}
                  >
                    Amanhã
                  </Button>
                  <Button
                    variant={renovacaoFilter === 'PROXIMOS_7' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRenovacaoFilter('PROXIMOS_7');
                      setRenovacaoDateRange(null);
                    }}
                  >
                    Próximos 7 dias
                  </Button>
                  <Button
                    variant={renovacaoFilter === 'ENCERRADOS' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRenovacaoFilter('ENCERRADOS');
                      setRenovacaoDateRange(null);
                    }}
                  >
                    Encerrados
                  </Button>
                  <Button
                    variant={renovacaoFilter === 'TODOS' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRenovacaoFilter('TODOS');
                      setRenovacaoDateRange(null);
                    }}
                  >
                    Todos (30 dias)
                  </Button>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Filtro personalizado (Data de encerramento)</label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        placeholder="Data inicial"
                        onChange={(e) => {
                          if (e.target.value && renovacaoDateRange?.end) {
                            setRenovacaoDateRange({ start: e.target.value, end: renovacaoDateRange.end });
                          } else if (e.target.value) {
                            setRenovacaoDateRange({ start: e.target.value, end: e.target.value });
                          }
                        }}
                      />
                      <Input
                        type="date"
                        placeholder="Data final"
                        onChange={(e) => {
                          if (e.target.value && renovacaoDateRange?.start) {
                            setRenovacaoDateRange({ start: renovacaoDateRange.start, end: e.target.value });
                          }
                        }}
                      />
                      {renovacaoDateRange && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRenovacaoDateRange(null)}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Contratos */}
          <Card>
            <CardContent className="p-6">
              {contratosParaRenovacao.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
                  <p className="text-muted-foreground">
                    Não há contratos com os filtros selecionados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contratosParaRenovacao.map((contrato) => (
                    <Card key={contrato.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{contrato.numero}</h3>
                              {getCriticidadeBadge(contrato.criticidade, contrato.diasRestantes, contrato.status)}
                            </div>
                            <p className="text-muted-foreground">
                              Cliente: {contrato.cliente.nome}
                            </p>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>Início: {formatDate(contrato.dataInicio)}</span>
                              <span>Fim: {formatDate(contrato.dataFim)}</span>
                            </div>
                            <p className="text-lg font-semibold">
                              Valor Total: R$ {contrato.valorTotal.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/contratos/${contrato.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                            <IfPerm perm="contratos:renew">
                              <Button
                                size="sm"
                                onClick={() => handleRenovarClick(contrato)}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Renovar
                              </Button>
                            </IfPerm>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Renovação */}
      {contratoParaRenovar && (
        <RenovarContratoModal
          open={renovarModalOpen}
          onOpenChange={setRenovarModalOpen}
          contrato={contratoParaRenovar}
        />
      )}
    </div>
  );
}
