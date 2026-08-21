/**
 * Portal do Motorista.
 *
 * Relay 67 levantou e o 68 construiu. Antes desta versão a tela era mock puro:
 * `mockTarefas` hardcoded num useEffect (João Silva e Maria Santos, os mesmos
 * para qualquer usuário), sem nenhuma chamada Supabase, e um `syncCheckin` que
 * fazia `setTimeout(1000)` e mostrava "Check-in enviado ao servidor" sem enviar
 * nada. O motorista ia embora do cliente achando que tinha registrado.
 *
 * Agora espelha o QuadroLogistica do desktop: mesmo hook
 * (`useSupabaseLogisticaTarefas`), mesma tabela, mesmas colunas de check-in —
 * que já existiam e nunca tinham sido usadas por esta tela.
 *
 * FUNCIONALIDADE AUSENTE — fila offline. O indicador Online/Offline é real
 * (`navigator.onLine`), mas não há persistência de check-in feito sem sinal:
 * fazer isso direito pede IndexedDB com reconciliação, e é trabalho próprio.
 * Enquanto não existe, a tela DIZ que está offline e bloqueia o check-in em
 * vez de aceitar e perder. Ver o card "Funcionalidades ausentes" no rodapé.
 */
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
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMotoristaLogado } from "@/hooks/useMotoristaLogado";
import {
  useSupabaseLogisticaTarefas,
  type LogisticaTarefa,
} from "@/hooks/useSupabaseLogisticaTarefas";
import { montarUpdateCheckin } from "@/lib/logistica-checkin";

/** `endereco` é Json no banco: pode vir string ou objeto do CEP. */
function formatarEndereco(endereco: unknown): string {
  if (typeof endereco === "string") return endereco;
  if (endereco && typeof endereco === "object") {
    const e = endereco as Record<string, unknown>;
    const partes = [e.logradouro, e.numero, e.bairro, e.cidade]
      .filter((p) => typeof p === "string" && p.trim())
      .join(", ");
    if (partes) return partes;
  }
  return "Endereço não informado";
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "PROGRAMADO": return "bg-blue-500";
    case "EM_ROTA": return "bg-yellow-500";
    case "CONCLUIDO": return "bg-green-500";
    case "CANCELADO": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case "ENTREGA": return "text-green-600 bg-green-50";
    case "RETIRADA": return "text-blue-600 bg-blue-50";
    case "SUPORTE": return "text-orange-600 bg-orange-50";
    default: return "text-gray-600 bg-gray-50";
  }
};

/** Dia de hoje em ISO curto, para o intervalo de `previsto_iso`. */
function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function LogisticaMobile() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gravandoId, setGravandoId] = useState<string | null>(null);
  const { toast } = useToast();

  const { motorista, isLoading: carregandoMotorista } = useMotoristaLogado();

  const hoje = hojeISO();
  const { tarefas, isLoading: carregandoTarefas, updateTarefaAsync } =
    useSupabaseLogisticaTarefas({
      lojaId: motorista?.lojaId ?? "",
      motoristaId: motorista?.id,
      dataInicio: hoje,
      dataFim: `${hoje}T23:59:59.999Z`,
    });

  // Monitor de conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /**
   * Pede a posição e RESOLVE com ela.
   *
   * Antes (relay 67), `handleCheckin` chamava `requestLocation()` e dava
   * `return` quando não havia posição: o clique do motorista se perdia, e ele
   * precisava tocar duas vezes sem entender por quê.
   */
  const obterPosicao = (): Promise<{ lat: number; lon: number } | null> => {
    if (location) return Promise.resolve(location);

    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização não disponível",
        description: "Seu dispositivo não suporta geolocalização",
        variant: "destructive",
      });
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lon: position.coords.longitude };
          setLocation(pos);
          resolve(pos);
        },
        () => {
          toast({
            title: "Permissão de localização negada",
            description: "O check-in precisa da sua posição. Autorize e toque novamente.",
            variant: "destructive",
          });
          resolve(null);
        }
      );
    });
  };

  const requestLocation = () => {
    void obterPosicao().then((pos) => {
      if (pos) {
        toast({
          title: "Localização obtida",
          description: "Sua posição foi capturada com sucesso",
        });
      }
    });
  };

  /**
   * Check-in: grava no banco e só então fala com o motorista.
   *
   * ATENÇÃO: em tarefa do tipo ENTREGA, `status: 'CONCLUIDO'` faz o hook
   * disparar `ativarContratoPosEntrega` — o contrato passa de
   * AGUARDANDO_ENTREGA para ATIVO. É o comportamento correto (a confirmação do
   * motorista É o evento que ativa o contrato), e é por isso que a falha usa um
   * payload disjunto que nunca escreve CONCLUIDO (ver lib/logistica-checkin.ts).
   */
  const handleCheckin = async (tarefaId: string, sucesso: boolean, motivo?: string) => {
    if (!isOnline) {
      // Sem fila offline, aceitar o clique seria perdê-lo em silêncio.
      toast({
        title: "Sem conexão",
        description: "O check-in precisa de internet. Tente de novo quando o sinal voltar.",
        variant: "destructive",
      });
      return;
    }

    const posicao = await obterPosicao();
    if (!posicao) return; // obterPosicao já explicou o motivo ao motorista

    const updates = montarUpdateCheckin({
      sucesso,
      posicao,
      agoraISO: new Date().toISOString(),
      motivo,
    });

    setGravandoId(tarefaId);
    try {
      await updateTarefaAsync({ id: tarefaId, updates });
      toast({
        title: sucesso ? "Check-in realizado" : "Falha registrada",
        description: sucesso
          ? "Tarefa concluída e gravada no sistema"
          : "Motivo gravado no sistema",
        variant: sucesso ? "default" : "destructive",
      });
    } catch (error) {
      // O hook já mostra o toast de erro. O que importa aqui é NÃO mostrar o de
      // sucesso: dizer "check-in realizado" sem gravar foi exatamente o bug.
      console.error("Erro ao gravar check-in:", error);
    } finally {
      setGravandoId(null);
    }
  };

  if (carregandoMotorista) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!motorista) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">
              Sua conta não está vinculada a um motorista
            </h3>
            <p className="text-sm text-muted-foreground">
              Peça ao administrador para vincular seu usuário a um cadastro de
              motorista na tela de Logística.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header Mobile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Minhas Tarefas</CardTitle>
              <p className="text-xs text-muted-foreground">{motorista.nome}</p>
            </div>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          {!isOnline && (
            <Badge variant="destructive" className="w-fit">
              Check-in indisponível sem conexão
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

      {carregandoTarefas && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        {tarefas.map((tarefa: LogisticaTarefa) => {
          const previsto = new Date(tarefa.previsto_iso);
          const isPrevisto = previsto > new Date();
          const tempoRestante = Math.max(
            0,
            Math.floor((previsto.getTime() - Date.now()) / (1000 * 60))
          );
          const gravando = gravandoId === tarefa.id;

          return (
            <Card key={tarefa.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getTipoColor(tarefa.tipo)}>{tarefa.tipo}</Badge>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(tarefa.status)}`} />
                    </div>
                    <h3 className="font-medium text-foreground">{tarefa.cliente_nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatarEndereco(tarefa.endereco)}
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {previsto.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
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
                    disabled={!tarefa.cliente_telefone}
                    onClick={() => window.open(`tel:${tarefa.cliente_telefone}`, "_self")}
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Ligar
                  </Button>

                  <div className="flex gap-2">
                    {(tarefa.status === "PROGRAMADO" || tarefa.status === "EM_ROTA") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={gravando}
                          onClick={() => handleCheckin(tarefa.id, false, "Cliente ausente")}
                        >
                          <XCircle className="h-3 w-3 mr-2" />
                          Falha
                        </Button>
                        <Button
                          size="sm"
                          disabled={gravando}
                          onClick={() => handleCheckin(tarefa.id, true)}
                        >
                          {gravando ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-2" />
                          )}
                          Cheguei
                        </Button>
                      </>
                    )}

                    {tarefa.status === "CONCLUIDO" && (
                      <Badge variant="default" className="bg-green-500">
                        Concluído
                      </Badge>
                    )}

                    {tarefa.status === "CANCELADO" && (
                      <Badge variant="destructive">Não executado</Badge>
                    )}
                  </div>
                </div>

                {tarefa.motivo_falha && (
                  <p className="text-xs text-muted-foreground">
                    Motivo: {tarefa.motivo_falha}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!carregandoTarefas && tarefas.length === 0 && (
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

      {/* Mesma moldura do DRE: o que não existe é declarado, não escondido. */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-foreground mb-1">
            Funcionalidades ausentes
          </h4>
          <p className="text-xs text-muted-foreground">
            <strong>Fila offline:</strong> check-in feito sem conexão não é
            armazenado no aparelho. Com o sinal fora, o botão fica indisponível
            em vez de aceitar o registro e perdê-lo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
