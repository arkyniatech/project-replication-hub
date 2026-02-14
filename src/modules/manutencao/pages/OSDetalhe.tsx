import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useManutencaoStore } from "../stores/manutencaoStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AreaOficina } from "../types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OSTimeline from "../components/OSTimeline";
import ChecklistRunner from "../components/ChecklistRunner";

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

export default function OSDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeline");

  const {
    ordens,
    equipamentos,
    liberarParaVerde,
    moverArea,
    registrarChecklist
  } = useManutencaoStore();

  const os = ordens.find(o => o.id === id);
  const equipamento = os ? equipamentos.find(e => e.id === os.equipamentoId) : null;

  if (!os || !equipamento) {
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

  const areaConfig = AREA_CONFIG[os.areaAtual];
  const prioridadeConfig = PRIORIDADE_CONFIG[os.prioridade];
  const AreaIcon = areaConfig.icon;

  const handleLiberarVerde = () => {
    const sucesso = liberarParaVerde(os.id);
    if (sucesso) {
      // TODO: Generate PDF and show success message
      console.log("Equipamento liberado para área verde!");
    } else {
      console.log("Não foi possível liberar: checklist não atende aos requisitos");
    }
  };

  const handleMoverArea = (novaArea: AreaOficina) => {
    moverArea(os.id, novaArea);
  };

  const calcularTempoArea = () => {
    const entrada = new Date(equipamento.timestamps.entradaArea);
    const agora = new Date();
    const horasPassadas = (agora.getTime() - entrada.getTime()) / (1000 * 60 * 60);
    return horasPassadas;
  };

  const tempoArea = calcularTempoArea();
  const slaEstourado = tempoArea > os.SLA_horas;

  return (
    <div className="space-y-6 p-6">
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
              <h1 className="text-2xl font-bold">OS {os.id}</h1>
              <p className="text-sm text-muted-foreground">
                {equipamento.codigo} - {equipamento.modelo}
              </p>
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
              <div className="flex items-center gap-2 mt-1">
                <span className="font-medium">{equipamento.codigo}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/equipamentos/${equipamento.id}?tab=timeline#oficina`)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">{equipamento.modelo}</div>
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
                  {tempoArea.toFixed(1)}h / {os.SLA_horas}h
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
            {os.areaAtual === 'AMARELA' && (
              <>
                <Button onClick={handleLiberarVerde}>
                  Liberar para Verde
                </Button>
                <Button variant="outline" onClick={() => handleMoverArea('VERMELHA')}>
                  Enviar para Vermelha
                </Button>
                <Button variant="outline">
                  Criar Pedido de Peças
                </Button>
              </>
            )}
            
            {os.areaAtual === 'VERMELHA' && (
              <>
                <Button>
                  Registrar Laudo
                </Button>
                <Button variant="outline">
                  Criar Pedido de Peças
                </Button>
                <Button variant="outline" onClick={handleLiberarVerde}>
                  Consertar e Liberar
                </Button>
              </>
            )}
            
            {os.areaAtual === 'AZUL' && (
              <>
                <Button>
                  Receber Peças
                </Button>
                <Button variant="outline" onClick={handleLiberarVerde}>
                  Executar Reparo
                </Button>
                <Button variant="outline" onClick={() => handleMoverArea('CINZA')}>
                  Transferir para Cinza
                </Button>
              </>
            )}
            
            {os.areaAtual === 'VERDE' && (
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
          <TabsTrigger value="anexos" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Anexos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <OSTimeline os={os} />
        </TabsContent>

        <TabsContent value="laudo">
          <Card>
            <CardHeader>
              <CardTitle>Laudo Técnico</CardTitle>
            </CardHeader>
            <CardContent>
              {os.laudoHtml ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: os.laudoHtml }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum laudo registrado ainda</p>
                  <Button className="mt-4">
                    Registrar Laudo
                  </Button>
                </div>
              )}
              
              {os.fotos && os.fotos.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Fotos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {os.fotos.map((foto, index) => (
                      <div key={index} className="aspect-square bg-muted rounded-md" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistRunner os={os} onSave={registrarChecklist} />
        </TabsContent>

        <TabsContent value="pedido">
          <Card>
            <CardHeader>
              <CardTitle>Pedido de Peças</CardTitle>
            </CardHeader>
            <CardContent>
              {os.pedido ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">{os.pedido.status}</Badge>
                    {os.pedido.fornecedor && (
                      <span className="text-sm text-muted-foreground">
                        Fornecedor: {os.pedido.fornecedor}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Itens Solicitados</h4>
                    {os.pedido.itens.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <span className="font-medium">{item.cod}</span>
                          <span className="ml-2 text-muted-foreground">{item.descr}</span>
                        </div>
                        <span>Qtd: {item.qtd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum pedido de peças criado</p>
                  <Button className="mt-4">
                    Criar Pedido
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anexos">
          <Card>
            <CardHeader>
              <CardTitle>Anexos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum anexo adicionado</p>
                <Button className="mt-4">
                  Adicionar Anexo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}