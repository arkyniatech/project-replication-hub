// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LogisticaConfig {
  id: string;
  loja_id: string;
  base_latitude?: number;
  base_longitude?: number;
  base_endereco?: string;
  horario_inicio: string;
  horario_fim: string;
  intervalo_almoco_inicio: string;
  intervalo_almoco_fim: string;
  janelas: Array<{ nome: string; inicio: string; fim: string }>;
  motivos_nao_saida: string[];
  motivos_nao_entrega: string[];
  template_entrega: string;
  template_retirada: string;
  template_aviso: string;
  confirmacoes_obrigatorias: string[];
  prazo_minimo_horas: number;
  tolerancia_inicio_min: number;
  tolerancia_fim_min: number;
  responsavel_obrigatorio: boolean;
  comprovante_digital: boolean;
  frete_por_zona: {
    habilitado: boolean;
    tabela: Array<{ zona: string; valor: number }>;
  };
  created_at: string;
  updated_at: string;
}

export function useSupabaseLogisticaConfig(lojaId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["logistica-config", lojaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistica_config")
        .select("*")
        .eq("loja_id", lojaId)
        .maybeSingle();

      if (error) throw error;
      return data as LogisticaConfig | null;
    },
    enabled: !!lojaId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<LogisticaConfig>) => {
      const { data, error } = await supabase
        .from("logistica_config")
        .update(updates)
        .eq("loja_id", lojaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-config", lojaId] });
      toast({
        title: "Configurações salvas",
        description: "As configurações de logística foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (config: Partial<LogisticaConfig>) => {
      const { data, error } = await supabase
        .from("logistica_config")
        .insert({ ...config, loja_id: lojaId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-config", lojaId] });
      toast({
        title: "Configuração criada",
        description: "A configuração de logística foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateConfig: updateMutation.mutate,
    createConfig: createMutation.mutate,
    isUpdating: updateMutation.isPending,
    isCreating: createMutation.isPending,
  };
}
