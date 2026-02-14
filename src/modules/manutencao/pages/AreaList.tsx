import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useManutencaoStore } from "../stores/manutencaoStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { AreaOficina, Prioridade, FiltrosArea } from "../types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AREA_CONFIG = {
  amarela: { 
    area: 'AMARELA' as AreaOficina,
    color: "bg-yellow-500", 
    label: "Área Amarela - Pós-locação", 
    icon: Clock,
    description: "Equipamentos recém devolvidos aguardando limpeza e checklist preventiva"
  },
  vermelha: { 
    area: 'VERMELHA' as AreaOficina,
    color: "bg-red-500", 
    label: "Área Vermelha - Diagnóstico/Corretiva", 
    icon: AlertTriangle,
    description: "Equipamentos que necessitam diagnóstico ou reparo corretivo"
  },
  azul: { 
    area: 'AZUL' as AreaOficina,
    color: "bg-blue-500", 
    label: "Área Azul - Aguardando Peças", 
    icon: Wrench,
    description: "Equipamentos com pedido de peças finalizado aguardando recebimento"
  },
  verde: { 
    area: 'VERDE' as AreaOficina,
    color: "bg-green-500", 
    label: "Área Verde - Liberado", 
    icon: CheckCircle,
    description: "Equipamentos liberados e prontos para locação"
  },
  cinza: { 
    area: 'CINZA' as AreaOficina,
    color: "bg-gray-500", 
    label: "Área Cinza - Baixa/Sucata", 
    icon: Users,
    description: "Equipamentos dados como baixa técnica ou sucata"
  }
};

export default function AreaList() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosArea>({});

  const {
    equipamentos,
    ordens,
    getEquipamentosByArea,
    getOSByEquipamento
  } = useManutencaoStore();

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

  const equipamentosArea = getEquipamentosByArea(areaConfig.area);
  const Icon = areaConfig.icon;

  // Apply filters
  const equipamentosFiltrados = equipamentosArea.filter(equip => {
    const os = getOSByEquipamento(equip.id);
    
    // Text filter
    if (filtros.texto) {
      const texto = filtros.texto.toLowerCase();
      const match = (
        equip.codigo.toLowerCase().includes(texto) ||
        equip.modelo.toLowerCase().includes(texto) ||
        equip.serie.toLowerCase().includes(texto) ||
        os?.id.toLowerCase().includes(texto)
      );
      if (!match) return false;
    }
    
    // Priority filter
    if (filtros.prioridade && os && os.prioridade !== filtros.prioridade) {
      return false;
    }
    
    // Responsible filter
    if (filtros.responsavel && os && os.usuarioRespId !== filtros.responsavel) {
      return false;
    }
    
    // Has OS filter
    if (filtros.comOS !== undefined) {
      const hasOS = !!os;
      if (filtros.comOS !== hasOS) return false;
    }
    
    // Has order filter
    if (filtros.comPedido !== undefined) {
      const hasPedido = !!(os?.pedido);
      if (filtros.comPedido !== hasPedido) return false;
    }
    
    return true;
  });

  const handleVerOS = (equipId: string) => {
    const os = getOSByEquipamento(equipId);
    if (os) {
      navigate(`/manutencao/os/${os.id}`);
    }
  };

  const getAcoesByArea = (area: AreaOficina, equipId: string) => {
    const os = getOSByEquipamento(equipId);
    
    switch (area) {
      case 'AMARELA':
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="outline">
              Liberar
            </Button>
            <Button size="sm" variant="outline">
              Pedir Peças
            </Button>
            <Button size="sm" variant="outline">
              → Vermelha
            </Button>
          </div>
        );
        
      case 'VERMELHA':
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="outline">
              Laudo
            </Button>
            <Button size="sm" variant="outline">
              Pedir Peças
            </Button>
            <Button size="sm" variant="outline">
              Consertar
            </Button>
          </div>
        );
        
      case 'AZUL':
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="outline">
              Receber Peças
            </Button>
            <Button size="sm" variant="outline">
              Executar Reparo
            </Button>
            <Button size="sm" variant="outline">
              → Cinza
            </Button>
          </div>
        );
        
      case 'VERDE':
        return (
          <Button size="sm" variant="outline">
            Reimprimir PDF
          </Button>
        );
        
      case 'CINZA':
        return (
          <Badge variant="secondary">Baixado</Badge>
        );
        
      default:
        return null;
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código, modelo, série..."
                value={filtros.texto || ""}
                onChange={(e) => setFiltros(prev => ({ ...prev, texto: e.target.value }))}
                className="pl-8"
              />
            </div>
            
            <Select 
              value={filtros.prioridade || ""} 
              onValueChange={(value) => setFiltros(prev => ({ ...prev, prioridade: value as Prioridade }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BAIXA">Baixa</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filtros.responsavel || ""} 
              onValueChange={(value) => setFiltros(prev => ({ ...prev, responsavel: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mec-1">Mecânico 1</SelectItem>
                <SelectItem value="mec-2">Mecânico 2</SelectItem>
                <SelectItem value="aux-1">Auxiliar 1</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filtros.comOS?.toString() || ""} 
              onValueChange={(value) => setFiltros(prev => ({ ...prev, comOS: value === "true" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Com OS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Com OS</SelectItem>
                <SelectItem value="false">Sem OS</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filtros.comPedido?.toString() || ""} 
              onValueChange={(value) => setFiltros(prev => ({ ...prev, comPedido: value === "true" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Com Pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Com Pedido</SelectItem>
                <SelectItem value="false">Sem Pedido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {Object.keys(filtros).length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFiltros({})}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Equipamentos ({equipamentosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {equipamentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum equipamento encontrado nesta área</p>
            </div>
          ) : (
            <div className="space-y-2">
              {equipamentosFiltrados.map((equip) => {
                const os = getOSByEquipamento(equip.id);
                
                return (
                  <div
                    key={equip.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                  >
                    {/* Equipment Photo */}
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    </div>
                    
                    {/* Equipment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{equip.codigo}</span>
                        {os && (
                          <Badge variant="outline" className="text-xs">
                            {os.id}
                          </Badge>
                        )}
                        {os?.prioridade && (
                          <Badge 
                            variant={os.prioridade === 'CRITICA' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {os.prioridade}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{equip.modelo}</div>
                      <div className="text-xs text-muted-foreground">Série: {equip.serie}</div>
                    </div>
                    
                    {/* Timestamps */}
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Entrada: {format(new Date(equip.timestamps.entradaArea), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      {os && (
                        <div className="text-xs text-muted-foreground">
                          SLA: {os.SLA_horas}h
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {getAcoesByArea(areaConfig.area, equip.id)}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleVerOS(equip.id)}
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