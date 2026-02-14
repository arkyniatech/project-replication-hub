import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Navigation, 
  CheckCircle, 
  XCircle,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TarefaLogistica, CheckinLogistica } from "@/types";

export default function LogisticaMobile() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [tarefas, setTarefas] = useState<TarefaLogistica[]>([]);
  const [checkinQueue, setCheckinQueue] = useState<CheckinLogistica[]>([]);
  const { toast } = useToast();

  // Mock data para demonstração
  useEffect(() => {
    const mockTarefas: TarefaLogistica[] = [
      {
        id: '1',
        lojaId: '1',
        tipo: 'ENTREGA',
        cliente: { nome: 'João Silva', fone: '(11) 99999-1111' },
        endereco: 'Rua das Flores, 123 - Centro',
        previstoISO: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duracaoMin: 30,
        prioridade: 'ALTA',
        status: 'PROGRAMADO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        lojaId: '1',
        tipo: 'RETIRADA',
        cliente: { nome: 'Maria Santos', fone: '(11) 88888-2222' },
        endereco: 'Av. Brasil, 456 - Vila Nova',
        previstoISO: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        duracaoMin: 20,
        prioridade: 'MEDIA',
        status: 'PROGRAMADO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    setTarefas(mockTarefas);
  }, []);

  // Monitor de conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Solicitar localização
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização não disponível",
        description: "Seu dispositivo não suporta geolocalização",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        toast({
          title: "Localização obtida",
          description: "Sua posição foi capturada com sucesso"
        });
      },
      (error) => {
        toast({
          title: "Erro de localização",
          description: "Não foi possível obter sua localização",
          variant: "destructive"
        });
      }
    );
  };

  // Check-in em tarefa
  const handleCheckin = (tarefaId: string, sucesso: boolean, motivo?: string) => {
    if (!location) {
      requestLocation();
      return;
    }

    const checkin: CheckinLogistica = {
      id: Date.now().toString(),
      tarefaId,
      lat: location.lat,
      lon: location.lon,
      ts: new Date().toISOString(),
      sucesso,
      motivoFalha: motivo,
      offline: !isOnline,
      synced: false
    };

    // Adicionar à fila offline
    setCheckinQueue(prev => [...prev, checkin]);

    // Atualizar status da tarefa localmente
    setTarefas(prev => prev.map(tarefa => 
      tarefa.id === tarefaId 
        ? { 
            ...tarefa, 
            status: sucesso ? 'CONCLUIDO' : 'NAO_ENTREGUE',
            checkins: [...(tarefa.checkins || []), checkin]
          }
        : tarefa
    ));

    toast({
      title: sucesso ? "Check-in realizado" : "Falha registrada",
      description: isOnline ? "Dados enviados" : "Salvo offline, será sincronizado",
      variant: sucesso ? "default" : "destructive"
    });

    // Tentar sincronizar se online
    if (isOnline) {
      syncCheckin(checkin);
    }
  };

  // Sincronizar check-in
  const syncCheckin = async (checkin: CheckinLogistica) => {
    try {
      // Mock da sincronização
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCheckinQueue(prev => prev.map(c => 
        c.id === checkin.id ? { ...c, synced: true } : c
      ));
      
      toast({
        title: "Sincronizado",
        description: "Check-in enviado ao servidor"
      });
    } catch (error) {
      toast({
        title: "Erro de sincronização",
        description: "Tentaremos novamente automaticamente",
        variant: "destructive"
      });
    }
  };

  // Sincronizar fila pendente
  const syncAllPending = () => {
    checkinQueue
      .filter(c => !c.synced && isOnline)
      .forEach(syncCheckin);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROGRAMADO': return 'bg-blue-500';
      case 'EM_ROTA': return 'bg-yellow-500';
      case 'CONCLUIDO': return 'bg-green-500';
      case 'NAO_ENTREGUE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTREGA': return 'text-green-600 bg-green-50';
      case 'RETIRADA': return 'text-blue-600 bg-blue-50';
      case 'SUPORTE': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header Mobile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Minhas Tarefas</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={syncAllPending}
                disabled={!isOnline || checkinQueue.filter(c => !c.synced).length === 0}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </Button>
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          {checkinQueue.filter(c => !c.synced).length > 0 && (
            <Badge variant="outline" className="w-fit">
              {checkinQueue.filter(c => !c.synced).length} pendente(s) de sync
            </Badge>
          )}
        </CardHeader>
      </Card>

      {/* Botão de Localização */}
      {!location && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <Navigation className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Ative a localização para fazer check-ins
              </p>
              <Button onClick={requestLocation} size="sm">
                Ativar Localização
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        {tarefas.map((tarefa) => {
          const isPrevisto = new Date(tarefa.previstoISO) > new Date();
          const tempoRestante = Math.max(0, Math.floor((new Date(tarefa.previstoISO).getTime() - Date.now()) / (1000 * 60)));
          
          return (
            <Card key={tarefa.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getTipoColor(tarefa.tipo)}>
                        {tarefa.tipo}
                      </Badge>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(tarefa.status)}`} />
                    </div>
                    <h3 className="font-medium text-foreground">{tarefa.cliente.nome}</h3>
                    <p className="text-sm text-muted-foreground">{tarefa.endereco}</p>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(tarefa.previstoISO).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    {isPrevisto && (
                      <p className="text-xs text-muted-foreground">
                        {tempoRestante}min restantes
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${tarefa.cliente.fone}`, '_self')}
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Ligar
                  </Button>

                  <div className="flex gap-2">
                    {tarefa.status === 'PROGRAMADO' && location && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckin(tarefa.id, false, 'Cliente ausente')}
                        >
                          <XCircle className="h-3 w-3 mr-2" />
                          Falha
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCheckin(tarefa.id, true)}
                        >
                          <CheckCircle className="h-3 w-3 mr-2" />
                          Cheguei
                        </Button>
                      </>
                    )}
                    
                    {tarefa.status === 'CONCLUIDO' && (
                      <Badge variant="default" className="bg-green-500">
                        Concluído
                      </Badge>
                    )}
                    
                    {tarefa.status === 'NAO_ENTREGUE' && (
                      <Badge variant="destructive">
                        Não executado
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tarefas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma tarefa hoje
            </h3>
            <p className="text-muted-foreground">
              Você não possui tarefas agendadas para hoje
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}