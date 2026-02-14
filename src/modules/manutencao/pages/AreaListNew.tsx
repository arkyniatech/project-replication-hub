import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  ArrowLeft,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Search,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSupabaseOrdensServico } from "@/hooks/useSupabaseOrdensServico";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";

const AREA_CONFIG = {
  amarela: { 
    area: 'AMARELA',
    color: "bg-yellow-500", 
    label: "Área Amarela - Pós-locação", 
    icon: Clock,
    description: "Equipamentos recém devolvidos aguardando limpeza e checklist preventiva"
  },
  vermelha: { 
    area: 'VERMELHA',
    color: "bg-red-500", 
    label: "Área Vermelha - Diagnóstico/Corretiva", 
    icon: AlertTriangle,
    description: "Equipamentos que necessitam diagnóstico ou reparo corretivo"
  },
  azul: { 
    area: 'AZUL',
    color: "bg-blue-500", 
    label: "Área Azul - Aguardando Peças", 
    icon: Wrench,
    description: "Equipamentos com pedido de peças finalizado aguardando recebimento"
  },
  verde: { 
    area: 'VERDE',
    color: "bg-green-500", 
    label: "Área Verde - Liberado", 
    icon: CheckCircle,
    description: "Equipamentos liberados e prontos para locação"
  },
  cinza: { 
    area: 'CINZA',
    color: "bg-gray-500", 
    label: "Área Cinza - Baixa/Sucata", 
    icon: Users,
    description: "Equipamentos dados como baixa técnica ou sucata"
  }
};

export default function AreaListNew() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState<string>("");

  const { ordens, isLoading: loadingOS } = useSupabaseOrdensServico(
    slug ? AREA_CONFIG[slug as keyof typeof AREA_CONFIG]?.area : undefined
  );
  const { equipamentos, isLoading: loadingEquip } = useSupabaseEquipamentos();

  const areaConfig = slug ? AREA_CONFIG[slug as keyof typeof AREA_CONFIG] : null;
  
  if (!areaConfig) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Área não encontrada</h1>
          <Button onClick={() => navigate('/manutencao')} className="mt-4">
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  if (loadingOS || loadingEquip) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const Icon = areaConfig.icon;

  // Apply filters
  const ordensFiltradas = ordens.filter(os => {
    // Text filter
    if (texto) {
      const textoLower = texto.toLowerCase();
      const equip = equipamentos.find(e => e.id === os.equipamento_id);
      const match = (
        equip?.codigo_interno.toLowerCase().includes(textoLower) ||
        equip?.tipo.toLowerCase().includes(textoLower) ||
        equip?.numero_serie?.toLowerCase().includes(textoLower) ||
        os.numero.toLowerCase().includes(textoLower)
      );
      if (!match) return false;
    }
    
    // Priority filter
    if (prioridade && os.prioridade !== prioridade) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/manutencao')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-md text-white", areaConfig.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{areaConfig.label}</h1>
            <p className="text-sm text-muted-foreground">{areaConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código, modelo, série, OS..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(texto || prioridade) && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setTexto("");
                  setPrioridade("");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OS List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Ordens de Serviço ({ordensFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordensFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma ordem de serviço encontrada nesta área</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ordensFiltradas.map((os) => {
                const equipamento = equipamentos.find(e => e.id === os.equipamento_id);
                
                return (
                  <div
                    key={os.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/manutencao/os/${os.id}`)}
                  >
                    {/* Equipment Photo */}
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    </div>
                    
                    {/* OS Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{os.numero}</span>
                        <Badge 
                          variant={os.prioridade === 'CRITICA' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {os.prioridade}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {os.status}
                        </Badge>
                      </div>
                      {equipamento && (
                        <>
                          <div className="text-sm text-muted-foreground">{equipamento.codigo_interno}</div>
                          <div className="text-xs text-muted-foreground">{equipamento.tipo}</div>
                        </>
                      )}
                    </div>
                    
                    {/* Timestamps */}
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Entrada: {format(new Date(os.entrada_area_em), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        SLA: {os.sla_horas}h
                      </div>
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
