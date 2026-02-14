import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const horimetroSchema = z.object({
  leituraAtual: z.number().min(0, "Leitura deve ser maior ou igual a zero"),
  observacoes: z.string().optional(),
});

type HorimetroFormData = z.infer<typeof horimetroSchema>;

interface HorimetroRegistroProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentoId: string;
  codigoInterno: string;
  modeloNome: string;
  horimetroAtual?: number;
  contratoId?: string;
  tipoEvento: "CHECK_IN" | "CHECK_OUT" | "MANUTENCAO" | "MANUAL";
  onSuccess?: () => void;
}

export function HorimetroRegistro({
  open,
  onOpenChange,
  equipamentoId,
  codigoInterno,
  modeloNome,
  horimetroAtual = 0,
  contratoId,
  tipoEvento,
  onSuccess,
}: HorimetroRegistroProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HorimetroFormData>({
    resolver: zodResolver(horimetroSchema),
    defaultValues: {
      leituraAtual: horimetroAtual,
      observacoes: "",
    },
  });

  const calcularHorasTrabalhadas = (novaLeitura: number): number => {
    return Math.max(0, novaLeitura - horimetroAtual);
  };

  const leituraAtual = form.watch("leituraAtual");
  const horasTrabalhadas = calcularHorasTrabalhadas(leituraAtual || 0);
  const leituraInvalida = leituraAtual < horimetroAtual;

  const onSubmit = async (data: HorimetroFormData) => {
    if (leituraInvalida) {
      form.setError("leituraAtual", {
        message: `Leitura deve ser maior ou igual ao horímetro atual (${horimetroAtual.toFixed(1)}h)`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar registro de leitura
      const { error: leituraError } = await supabase
        .from("horimetro_leituras")
        .insert({
          equipamento_id: equipamentoId,
          contrato_id: contratoId || null,
          tipo_evento: tipoEvento,
          leitura_anterior: horimetroAtual,
          leitura_atual: data.leituraAtual,
          horas_trabalhadas: horasTrabalhadas,
          observacoes: data.observacoes || null,
        });

      if (leituraError) throw leituraError;

      toast({
        title: "Horímetro registrado",
        description: `Leitura de ${data.leituraAtual.toFixed(1)}h registrada com sucesso (${horasTrabalhadas.toFixed(1)}h trabalhadas)`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao registrar horímetro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a leitura do horímetro",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTipoEventoLabel = () => {
    switch (tipoEvento) {
      case "CHECK_IN":
        return "Check-in (Entrega)";
      case "CHECK_OUT":
        return "Check-out (Retirada)";
      case "MANUTENCAO":
        return "Manutenção";
      case "MANUAL":
        return "Leitura Manual";
      default:
        return tipoEvento;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registrar Horímetro
          </DialogTitle>
          <DialogDescription>
            Registre a leitura atual do horímetro do equipamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do equipamento */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{modeloNome}</span>
              <Badge variant="outline">{codigoInterno}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Horímetro Atual:</span>
              <span className="font-mono font-semibold">{horimetroAtual.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tipo de Evento:</span>
              <Badge>{getTipoEventoLabel()}</Badge>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="leituraAtual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Leitura (horas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Indicador de horas trabalhadas */}
              {!leituraInvalida && leituraAtual > 0 && (
                <div className={`p-3 rounded-lg border ${
                  horasTrabalhadas > 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Horas Trabalhadas
                    </span>
                    <span className="text-lg font-bold">
                      {horasTrabalhadas.toFixed(1)}h
                    </span>
                  </div>
                </div>
              )}

              {leituraInvalida && leituraAtual > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Leitura inválida</p>
                      <p className="text-xs mt-1">
                        A nova leitura deve ser maior ou igual ao horímetro atual ({horimetroAtual.toFixed(1)}h)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Equipamento utilizado em obra X..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || leituraInvalida}
                  className="flex-1"
                >
                  {isSubmitting ? "Salvando..." : "Registrar Leitura"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
