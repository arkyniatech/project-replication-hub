import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dialogs reais do card "Logística" no detalhe do contrato (ticket #43).
 * Antes, "Abrir OS" e "Reagendar" eram toasts sem função.
 */

export interface TarefaLogisticaContrato {
  id: string;
  tipo: string;
  status: string;
  previsto_iso: string;
  cliente_nome?: string;
  observacoes?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  AGENDAR: "bg-slate-100 text-slate-700",
  PROGRAMADO: "bg-blue-100 text-blue-700",
  EM_ROTA: "bg-indigo-100 text-indigo-700",
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
  REAGENDADO: "bg-amber-100 text-amber-700",
  CANCELADO: "bg-red-100 text-red-700",
};

const formatarDataHora = (iso: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("pt-BR")} • ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

// ------------------------------------------------------------------
// OS de Logística do contrato: lista as tarefas reais
// ------------------------------------------------------------------
export function OSLogisticaDialog({
  open,
  onOpenChange,
  tarefas,
  isLoading,
  contratoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: TarefaLogisticaContrato[];
  isLoading?: boolean;
  contratoId?: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const tarefaPendente = (t: TarefaLogisticaContrato) =>
    !["CONCLUIDO", "CANCELADO"].includes(t.status);

  // Cancela uma solicitação pendente (retirada/entrega) e registra na
  // timeline do contrato (#41)
  const handleCancelarTarefa = async (t: TarefaLogisticaContrato) => {
    const rotulo = t.tipo === "RETIRADA" ? "retirada" : "entrega";
    if (!confirm(`Cancelar a solicitação de ${rotulo} de ${formatarDataHora(t.previsto_iso)}?`)) return;

    setCancelandoId(t.id);
    try {
      const { data, error } = await (supabase as any)
        .from("logistica_tarefas")
        .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
        .eq("id", t.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Sem permissão para cancelar esta tarefa.");

      // Histórico no contrato
      if (contratoId) {
        const { data: ct } = await (supabase as any)
          .from("contratos")
          .select("timeline")
          .eq("id", contratoId)
          .single();
        const timeline = Array.isArray(ct?.timeline) ? ct.timeline : [];
        await (supabase as any)
          .from("contratos")
          .update({
            timeline: [...timeline, {
              id: `evt-${Date.now()}`,
              ts: new Date().toISOString(),
              tipo: t.tipo === "RETIRADA" ? "RETIRADA_CANCELADA" : "ENTREGA_CANCELADA",
              resumo: `Solicitação de ${rotulo} de ${formatarDataHora(t.previsto_iso)} cancelada`,
              meta: { tarefaId: t.id },
            }],
            updated_at: new Date().toISOString(),
          })
          .eq("id", contratoId);
      }

      queryClient.invalidateQueries({ queryKey: ["logistica-tarefas"] });
      queryClient.invalidateQueries({ queryKey: ["logistica-tarefas-contrato"] });
      queryClient.invalidateQueries({ queryKey: ["contrato"] });
      toast({ title: "Solicitação cancelada", description: `A ${rotulo} foi cancelada e registrada no histórico do contrato.` });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Tente novamente";
      toast({ title: "Erro ao cancelar", description: mensagem, variant: "destructive" });
    } finally {
      setCancelandoId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            OS de Logística do Contrato
          </DialogTitle>
          <DialogDescription>
            Entregas e retiradas vinculadas a este contrato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : tarefas.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma tarefa de logística para este contrato.
            </p>
          ) : (
            tarefas.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">
                    {t.tipo === "ENTREGA" ? "🚚 Entrega" : t.tipo === "RETIRADA" ? "📦 Retirada" : t.tipo}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatarDataHora(t.previsto_iso)}</p>
                  {t.observacoes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.observacoes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_BADGE[t.status] || "bg-slate-100 text-slate-700"}>
                    {t.status.replace("_", " ")}
                  </Badge>
                  {tarefaPendente(t) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      disabled={cancelandoId === t.id}
                      onClick={() => handleCancelarTarefa(t)}
                    >
                      {cancelandoId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancelar"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => navigate("/logistica/quadro")}>
            <MapPin className="h-4 w-4 mr-2" />
            Ver no Quadro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Reagendamento da próxima tarefa pendente
// ------------------------------------------------------------------
export function ReagendarLogisticaDialog({
  open,
  onOpenChange,
  tarefa,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: TarefaLogisticaContrato | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("09:00");
  const [salvando, setSalvando] = useState(false);

  const handleReagendar = async () => {
    if (!tarefa || !novaData) {
      toast({ title: "Informe a nova data", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const novoIso = new Date(`${novaData}T${novaHora || "09:00"}:00`).toISOString();
      // .select() detecta update bloqueado por RLS (0 linhas = erro visível)
      const { data, error } = await (supabase as any)
        .from("logistica_tarefas")
        .update({
          previsto_iso: novoIso,
          status: "PROGRAMADO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tarefa.id)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Não foi possível reagendar — verifique suas permissões.");
      }

      queryClient.invalidateQueries({ queryKey: ["logistica-tarefas"] });
      queryClient.invalidateQueries({ queryKey: ["logistica-tarefas-contrato"] });
      toast({
        title: "Reagendado!",
        description: `${tarefa.tipo === "ENTREGA" ? "Entrega" : "Retirada"} remarcada para ${new Date(novoIso).toLocaleDateString("pt-BR")} às ${novaHora}.`,
      });
      onOpenChange(false);
      setNovaData("");
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Tente novamente";
      toast({ title: "Erro ao reagendar", description: mensagem, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reagendar {tarefa?.tipo === "RETIRADA" ? "Retirada" : "Entrega"}</DialogTitle>
          <DialogDescription>
            {tarefa
              ? `Atual: ${formatarDataHora(tarefa.previsto_iso)}`
              : "Nenhuma tarefa pendente para reagendar."}
          </DialogDescription>
        </DialogHeader>

        {tarefa && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="novaData">Nova data *</Label>
              <Input
                id="novaData"
                type="date"
                value={novaData}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novaHora">Hora</Label>
              <Input
                id="novaHora"
                type="time"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleReagendar} disabled={!tarefa || !novaData || salvando}>
            {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {salvando ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
