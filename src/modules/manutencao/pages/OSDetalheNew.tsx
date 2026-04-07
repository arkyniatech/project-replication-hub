import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  ArrowLeft,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  FileText,
  Settings,
  Package,
  Paperclip,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OSTimeline from "../components/OSTimeline";
import ChecklistRunner from "../components/ChecklistRunner";
import { useSupabaseOrdensServico } from "@/hooks/useSupabaseOrdensServico";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";

const AREA_CONFIG = {
  AMARELA: { color: "bg-yellow-500", label: "Amarela", icon: Clock },
  VERMELHA: { color: "bg-red-500", label: "Vermelha", icon: AlertTriangle },
  AZUL: { color: "bg-blue-500", label: "Azul", icon: Wrench },
  VERDE: { color: "bg-green-500", label: "Verde", icon: CheckCircle },
  CINZA: { color: "bg-gray-500", label: "Cinza", icon: Users }
};

const PRIORIDADE_CONFIG = {
  BAIXA: { color: "bg-blue-500", label: "Baixa" },
  MEDIA: { color: "bg-yellow-500", label: "Média" },
  ALTA: { color: "bg-orange-500", label: "Alta" },
  CRITICA: { color: "bg-red-500", label: "Crítica" }
};

export default function OSDetalheNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeline");

  const { useOS, moverArea, registrarChecklist, liberarParaVerde } = useSupabaseOrdensServico();
  const { data: os, isLoading: loadingOS } = useOS(id || "");
  const { equipamentos } = useSupabaseEquipamentos();

  if (loadingOS) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!os) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">OS não encontrada</h1>
          <Button onClick={() => navigate('/manutencao')} className="mt-4">
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  const equipamento = equipamentos.find(e => e.id === os.equipamento_id);
  const areaConfig = AREA_CONFIG[os.area_atual as keyof typeof AREA_CONFIG];
  const prioridadeConfig = PRIORIDADE_CONFIG[os.prioridade as keyof typeof PRIORIDADE_CONFIG];
  const AreaIcon = areaConfig.icon;

  const handleLiberarVerde = () => {
    liberarParaVerde.mutate(os.id);
  };

  const handleMoverArea = (novaArea: string) => {
    moverArea.mutate({ osId: os.id, novaArea });
  };

  const calcularTempoArea = () => {
    const entrada = new Date(os.entrada_area_em);
    const agora = new Date();
    const horasPassadas = (agora.getTime() - entrada.getTime()) / (1000 * 60 * 60);
    return horasPassadas;
  };

  const tempoArea = calcularTempoArea();
  const slaEstourado = tempoArea > os.sla_horas;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              <AreaIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OS {os.numero}</h1>
              {equipamento && (
                <p className="text-sm text-muted-foreground">
                  {equipamento.codigo_interno} - {equipamento.tipo}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={cn("text-white", areaConfig.color)}>
            {areaConfig.label}
          </Badge>
          <Badge 
            variant={os.prioridade === 'CRITICA' ? 'destructive' : 'secondary'}
          >
            {prioridadeConfig.label}
          </Badge>
          {slaEstourado && (
            <Badge variant="destructive">
              SLA Estourado
            </Badge>
          )}
        </div>
      </div>

      {/* Equipment Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Equipamento</label>
              {equipamento && (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium">{equipamento.codigo_interno}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/equipamentos/${equipamento.id}?tab=timeline#oficina`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">{equipamento.tipo}</div>
                </>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant="outline">{os.status}</Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">SLA</label>
              <div className="mt-1">
                <span className={cn("font-medium", slaEstourado ? "text-red-600" : "text-green-600")}>
                  {tempoArea.toFixed(1)}h / {os.sla_horas}h
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions by Area */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {os.area_atual === 'AMARELA' && (
              <>
                <Button onClick={handleLiberarVerde}>
                  Liberar para Verde
                </Button>
                <Button variant="outline" onClick={() => handleMoverArea('VERMELHA')}>
                  Enviar para Vermelha
                </Button>
              </>
            )}
            
            {os.area_atual === 'VERMELHA' && (
              <>
                <Button onClick={handleLiberarVerde}>
                  Consertar e Liberar
                </Button>
              </>
            )}
            
            {os.area_atual === 'AZUL' && (
              <>
                <Button onClick={handleLiberarVerde}>
                  Executar Reparo
                </Button>
                <Button variant="outline" onClick={() => handleMoverArea('CINZA')}>
                  Transferir para Cinza
                </Button>
              </>
            )}
            
            {os.area_atual === 'VERDE' && (
              <Button variant="outline">
                Reimprimir PDF de Liberação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="laudo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Laudo
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="pedido" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pedido de Peças
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <OSTimeline os={os as any} />
        </TabsContent>

        <TabsContent value="laudo">
          <Card>
            <CardHeader>
              <CardTitle>Laudo Técnico</CardTitle>
            </CardHeader>
            <CardContent>
              {os.laudo_html ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: os.laudo_html }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum laudo registrado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Checklist em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedido">
          <Card>
            <CardHeader>
              <CardTitle>Pedido de Peças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum pedido de peças criado</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
