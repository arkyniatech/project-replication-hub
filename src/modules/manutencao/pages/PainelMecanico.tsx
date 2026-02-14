import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Search,
  TrendingUp,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSupabaseOrdensServico } from "@/hooks/useSupabaseOrdensServico";
import { useSupabaseProdutividadeManutencao } from "@/hooks/useSupabaseProdutividadeManutencao";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";

const AREA_CONFIG = {
  AMARELA: { 
    color: "bg-yellow-500", 
    label: "Amarela (Pós-locação)", 
    icon: Clock,
    priority: 1 
  },
  VERMELHA: { 
    color: "bg-red-500", 
    label: "Vermelha (Diagnóstico)", 
    icon: AlertTriangle,
    priority: 2 
  },
  AZUL: { 
    color: "bg-blue-500", 
    label: "Azul (Aguard. Peças)", 
    icon: Wrench,
    priority: 3 
  },
  VERDE: { 
    color: "bg-green-500", 
    label: "Verde (Liberado)", 
    icon: CheckCircle,
    priority: 4 
  },
  CINZA: { 
    color: "bg-gray-500", 
    label: "Cinza (Baixa/Sucata)", 
    icon: Users,
    priority: 5 
  }
};

export default function PainelMecanico() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [busca, setBusca] = useState("");
  const [maisAntigoFirst, setMaisAntigoFirst] = useState(true);

  const { ordens, isLoading: loadingOS } = useSupabaseOrdensServico();
  const { equipamentos, isLoading: loadingEquip } = useSupabaseEquipamentos();
  const { produtividadeHoje } = useSupabaseProdutividadeManutencao();

  if (loadingOS || loadingEquip) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate KPIs by area
  const kpis = Object.keys(AREA_CONFIG).reduce((acc, area) => {
    const ordensArea = ordens.filter(o => o.area_atual === area);
    const total = ordensArea.length;
    const criticos = ordensArea.filter(o => 
      o.prioridade === 'CRITICA' || 
      (new Date().getTime() - new Date(o.entrada_area_em).getTime()) / (1000 * 60 * 60) > o.sla_horas
    ).length;
    const slaMedia = ordensArea.length > 0 
      ? ordensArea.reduce((sum, o) => sum + o.sla_horas, 0) / ordensArea.length 
      : 0;

    acc[area as keyof typeof AREA_CONFIG] = { total, criticos, slaMedia };
    return acc;
  }, {} as Record<keyof typeof AREA_CONFIG, { total: number; criticos: number; slaMedia: number }>);

  // Get equipment in yellow area
  const equipamentosAmarela = equipamentos.filter(e => 
    ordens.some(o => o.equipamento_id === e.id && o.area_atual === 'AMARELA')
  );

  const prodToday = produtividadeHoje;

  // Filter equipamentos da área amarela
  const equipamentosFiltrados = equipamentosAmarela.filter(equip => {
    if (!busca) return true;
    const texto = busca.toLowerCase();
    const os = ordens.find(o => o.equipamento_id === equip.id);
    return (
      equip.codigo_interno.toLowerCase().includes(texto) ||
      equip.tipo.toLowerCase().includes(texto) ||
      equip.numero_serie?.toLowerCase().includes(texto) ||
      os?.numero.toLowerCase().includes(texto)
    );
  });

  // Sort by timestamp
  const equipamentosOrdenados = [...equipamentosFiltrados].sort((a, b) => {
    const osA = ordens.find(o => o.equipamento_id === a.id);
    const osB = ordens.find(o => o.equipamento_id === b.id);
    const dateA = new Date(osA?.entrada_area_em || 0).getTime();
    const dateB = new Date(osB?.entrada_area_em || 0).getTime();
    return maisAntigoFirst ? dateA - dateB : dateB - dateA;
  });

  const handleVerArea = (area: string) => {
    navigate(`/manutencao/area/${area.toLowerCase()}`);
  };

  const handleVerOS = (equipId: string) => {
    const os = ordens.find(o => o.equipamento_id === equipId);
    if (os) {
      navigate(`/manutencao/os/${os.id}`);
    }
  };

  const calcularSLA = (entradaArea: string, slaHoras: number) => {
    const entrada = new Date(entradaArea);
    const agora = new Date();
    const horasPassadas = (agora.getTime() - entrada.getTime()) / (1000 * 60 * 60);
    const restante = slaHoras - horasPassadas;
    
    return {
      restante: Math.max(0, restante),
      estourado: horasPassadas > slaHoras
    };
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Painel do Mecânico</h1>
        <p className="text-muted-foreground">Visão geral da oficina e áreas de manutenção</p>
      </div>

      {/* KPI Cards por Área */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(AREA_CONFIG).map(([area, config]) => {
          const kpi = kpis[area as keyof typeof AREA_CONFIG];
          const Icon = config.icon;
          
          return (
            <Card 
              key={area} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                config.priority <= 2 ? "border-l-4 border-l-orange-500" : ""
              )}
              onClick={() => handleVerArea(area)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-md", config.color, "text-white")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {kpi.criticos > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {kpi.criticos} críticos
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm">{config.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{kpi.total}</div>
                  <div className="text-xs text-muted-foreground">
                    SLA médio: {kpi.slaMedia.toFixed(1)}h
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Produtividade Today */}
      {prodToday && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Produtividade Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{prodToday?.liberadas || 0}</div>
                <div className="text-muted-foreground">Liberadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{prodToday?.limpas || 0}</div>
                <div className="text-muted-foreground">Limpas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{prodToday?.aguard_diag || 0}</div>
                <div className="text-muted-foreground">Aguard. Diag.</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{prodToday?.aguard_peca || 0}</div>
                <div className="text-muted-foreground">Aguard. Peça</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{prodToday?.suportes || 0}</div>
                <div className="text-muted-foreground">Suportes</div>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/manutencao/produtividade')}
              >
                Ver Detalhamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista Dinâmica Amarela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-yellow-500 text-white">
                <Clock className="h-4 w-4" />
              </div>
              Área Amarela - Equipamentos Recém Devolvidos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMaisAntigoFirst(!maisAntigoFirst)}
              >
                {maisAntigoFirst ? "Mais antigo primeiro" : "Mais recente primeiro"}
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, modelo, série ou contrato..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {equipamentosOrdenados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum equipamento na área amarela</p>
            </div>
          ) : (
            <div className="space-y-2">
              {equipamentosOrdenados.map((equip) => {
                const os = ordens.find(o => o.equipamento_id === equip.id);
                const slaInfo = os ? calcularSLA(os.entrada_area_em, os.sla_horas) : null;
                
                return (
                  <div
                    key={equip.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    {/* Foto */}
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-muted-foreground" />
                    </div>
                    
                    {/* Info do Equipamento */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{equip.codigo_interno}</div>
                      <div className="text-sm text-muted-foreground">{equip.tipo}</div>
                      {os && (
                        <div className="text-xs text-blue-600">
                          OS: {os.numero}
                        </div>
                      )}
                    </div>
                    
                    {/* Entrada */}
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {os && format(new Date(os.entrada_area_em), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    
                    {/* SLA */}
                    {slaInfo && (
                      <div className="text-right">
                        <Badge 
                          variant={slaInfo.estourado ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {slaInfo.estourado ? "Estourado" : `${slaInfo.restante.toFixed(1)}h`}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => os && navigate(`/manutencao/os/${os.id}`)}
                        disabled={!os}
                      >
                        Ver OS
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}