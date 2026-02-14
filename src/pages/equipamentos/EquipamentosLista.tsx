import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  ArrowRightLeft,
  Eye,
  Settings,
  History
} from "lucide-react";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { StatusEquipamento } from "@/types/equipamentos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useTransferEvents } from "@/hooks/useTransferEvents";
import { HistoricoTransferenciasModal } from "@/components/transferencias/HistoricoTransferenciasModal";
import { EquipamentoKPIsBadges } from "@/components/equipamentos/EquipamentoKPIsBadges";

const STATUS_COLORS: Record<StatusEquipamento, string> = {
  DISPONIVEL: "bg-green-100 text-green-800",
  RESERVADO: "bg-blue-100 text-blue-800", 
  LOCADO: "bg-yellow-100 text-yellow-800",
  EM_REVISAO: "bg-orange-100 text-orange-800",
  MANUTENCAO: "bg-red-100 text-red-800",
  EM_TRANSPORTE: "bg-purple-100 text-purple-800",
  INATIVO: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<StatusEquipamento, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  LOCADO: "Locado", 
  EM_REVISAO: "Em Revisão",
  MANUTENCAO: "Manutenção",
  EM_TRANSPORTE: "Em Transporte",
  INATIVO: "Inativo",
};

export default function EquipamentosLista() {
  const navigate = useNavigate();
  const { lojaAtual } = useMultiunidade();
  
  // Subscribe to transfer events for real-time KPI updates
  useTransferEvents();
  
  // Fetch data from Supabase
  const { equipamentos, isLoading: loadingEquipamentos } = useSupabaseEquipamentos(lojaAtual?.id);
  const { grupos } = useSupabaseGrupos();
  const { modelos } = useSupabaseModelos();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusEquipamento | "">("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusEquipamento | null>(null);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);

  // Atalho para novo equipamento
  useKeyboardShortcut('e', () => {
    navigate('/equipamentos/novo');
  });


  // KPIs por status (considerando quantidades para tipo SALDO)
  const disponibilidade = useMemo(() => {
    const kpis: Record<StatusEquipamento, number> = {
      DISPONIVEL: 0,
      RESERVADO: 0,
      LOCADO: 0,
      EM_REVISAO: 0,
      MANUTENCAO: 0,
      EM_TRANSPORTE: 0,
      INATIVO: 0,
    };

    equipamentos.forEach(eq => {
      if (eq.status_global && eq.loja_atual_id === lojaAtual?.id) {
        // Para tipo SALDO, usar qtdDisponivel para disponível e ocupação para outros
        if (eq.tipo === 'SALDO' && lojaAtual) {
          const saldos = eq.saldos_por_loja as Record<string, { 
            qtd: number; 
            qtdDisponivel?: number 
          }> || {};
          
          const qtdTotal = saldos[lojaAtual.id]?.qtd || 0;
          const qtdDisponivel = saldos[lojaAtual.id]?.qtdDisponivel ?? qtdTotal;
          const qtdOcupada = qtdTotal - qtdDisponivel;
          
          // Adicionar disponível separadamente
          if (qtdDisponivel > 0) {
            kpis['DISPONIVEL'] += qtdDisponivel;
          }
          
          // Adicionar ocupado no status apropriado
          if (qtdOcupada > 0) {
            // Para SALDO, quando há ocupação, usar o status_global do equipamento
            // Se for LOCADO, RESERVADO, etc, usar esse status
            const statusOcupado = eq.status_global as StatusEquipamento;
            if (statusOcupado !== 'DISPONIVEL') {
              kpis[statusOcupado] += qtdOcupada;
            } else {
              // Se o status_global for DISPONIVEL mas tem ocupação, considerar como LOCADO
              kpis['LOCADO'] += qtdOcupada;
            }
          }
        } else {
          // Para tipo SERIALIZADO, cada equipamento conta como 1
          kpis[eq.status_global as StatusEquipamento]++;
        }
      }
    });

    return kpis;
  }, [equipamentos, lojaAtual]);

  // Equipamentos filtrados
  const filteredEquipamentos = useMemo(() => {
    let filtered = equipamentos;

    // Filtro por loja ativa já aplicado no hook useSupabaseEquipamentos

    // Filtros de busca
    if (searchTerm) {
      filtered = filtered.filter((equipamento) => {
        const grupo = grupos.find(g => g.id === equipamento.grupo_id);
        const modelo = modelos.find(m => m.id === equipamento.modelo_id);
        
        return (
          equipamento.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (modelo?.nome_comercial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (grupo?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (statusFilter) {
      filtered = filtered.filter(eq => eq.status_global === statusFilter);
    }

    if (grupoFilter) {
      filtered = filtered.filter(eq => eq.grupo_id === grupoFilter);
    }

    if (selectedStatus) {
      filtered = filtered.filter(eq => eq.status_global === selectedStatus);
    }

    return filtered;
  }, [equipamentos, searchTerm, statusFilter, grupoFilter, selectedStatus, grupos, modelos]);

  const handleStatusKPIClick = (status: StatusEquipamento) => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
      setStatusFilter("");
    } else {
      setSelectedStatus(status);
      setStatusFilter(status);
    }
  };

  const getModeloNome = (modeloId: string) => {
    return modelos.find(m => m.id === modeloId)?.nome_comercial || 'Modelo não encontrado';
  };

  const getGrupoNome = (grupoId: string) => {
    return grupos.find(g => g.id === grupoId)?.nome || 'Grupo não encontrado';
  };

  if (loadingEquipamentos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando equipamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo global de equipamentos
            {lojaAtual && ` - ${lojaAtual.nome}`}
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={() => navigate('/equipamentos/catalogo')}>
            <Settings className="w-4 h-4 mr-2" />
            Grupos & Modelos
          </Button>
          <Button onClick={() => navigate('/equipamentos/novo')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Equipamento
          </Button>
        </div>
      </div>

      {/* KPIs de Disponibilidade */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(disponibilidade).map(([status, count]) => {
          const isSelected = selectedStatus === status;
          return (
            <Card 
              key={status}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => handleStatusKPIClick(status as StatusEquipamento)}
            >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground">
                {STATUS_LABELS[status as StatusEquipamento]}
              </div>
              {count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 text-xs"
                  onClick={() => setShowHistoricoModal(true)}
                >
                  <History className="h-3 w-3 mr-1" />
                  Histórico
                </Button>
              )}
            </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, modelo ou grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={grupoFilter}
              onChange={(e) => setGrupoFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md"
            >
              <option value="">Todos os Grupos</option>
              {grupos.map(grupo => (
                <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
              ))}
            </select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setGrupoFilter("");
                setSelectedStatus(null);
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Equipamentos */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Equipamentos ({filteredEquipamentos.length})</span>
            {lojaAtual && (
              <Button variant="outline" size="sm" onClick={() => navigate('/equipamentos/transferencias')}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transferências
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEquipamentos.length > 0 ? (
            <div className="space-y-4">
              {filteredEquipamentos.map((equipamento) => {
                const modelo = modelos.find(m => m.id === equipamento.modelo_id);
                const grupo = grupos.find(g => g.id === equipamento.grupo_id);
                const saldos = equipamento.saldos_por_loja as Record<string, { qtd: number }> || {};
                
                return (
                  <div
                    key={equipamento.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">
                            {modelo?.nome_comercial || 'Modelo não encontrado'}
                          </h3>
                          <Badge variant="outline" className="text-xs font-mono">
                            {equipamento.codigo_interno}
                          </Badge>
                          <Badge className={STATUS_COLORS[equipamento.status_global as StatusEquipamento]}>
                            {STATUS_LABELS[equipamento.status_global as StatusEquipamento]}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Grupo: {grupo?.nome || 'N/A'}
                          {equipamento.tipo === 'SERIALIZADO' && equipamento.numero_serie && (
                            <span className="ml-4">S/N: {equipamento.numero_serie}</span>
                          )}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Tipo: <span className="font-medium text-foreground">
                              {equipamento.tipo === 'SERIALIZADO' ? 'Serializado' : 'Saldo'}
                            </span>
                          </span>
                          
                      {equipamento.tipo === 'SALDO' && lojaAtual && (
                        <span className="text-muted-foreground">
                          Disponível: <span className="font-medium text-foreground">
                            {(saldos[lojaAtual.id] as any)?.qtdDisponivel ?? (saldos[lojaAtual.id]?.qtd || 0)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            (Total: {saldos[lojaAtual.id]?.qtd || 0})
                          </span>
                        </span>
                      )}
                          
                          <span className="text-muted-foreground">
                            Indenização: <span className="font-medium text-foreground">
                              R$ {Number(equipamento.valor_indenizacao || 0).toLocaleString('pt-BR')}
                            </span>
                          </span>
                        </div>
                        
                        {equipamento.observacoes && (
                          <p className="text-xs text-muted-foreground italic">
                            {equipamento.observacoes}
                          </p>
                        )}
                        
                        {/* KPIs Badges */}
                        <EquipamentoKPIsBadges
                          receitaAcumulada={equipamento.receita_acumulada || 0}
                          margemAcumulada={equipamento.margem_acumulada || 0}
                          vezesLocado={equipamento.vezes_locado || 0}
                          taxaOcupacaoUltimoMes={equipamento.taxa_ocupacao_ultimo_mes || 0}
                          diasOciosoUltimoMes={equipamento.dias_ocioso_ultimo_mes || 0}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/equipamentos/${equipamento.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/equipamentos/${equipamento.id}/editar`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {equipamento.status_global === 'DISPONIVEL' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/equipamentos/transferir/${equipamento.id}`)}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter || grupoFilter
                  ? "Nenhum equipamento encontrado com os filtros aplicados"
                  : "Nenhum equipamento cadastrado"
                }
              </p>
              {!searchTerm && !statusFilter && !grupoFilter && (
                <Button className="mt-4" onClick={() => navigate('/equipamentos/novo')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Equipamento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      <HistoricoTransferenciasModal
        open={showHistoricoModal}
        onOpenChange={setShowHistoricoModal}
        onVerEquipamento={(equipId, transferId) => {
          navigate(`/equipamentos/${equipId}?tab=timeline&evento=${transferId}`);
        }}
      />
    </div>
  );
}