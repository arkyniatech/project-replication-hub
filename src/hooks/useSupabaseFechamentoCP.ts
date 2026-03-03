// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FechamentoCP {
  id: string;
  periodo: string;
  loja_id: string;
  fechado: boolean;
  fechado_em?: string;
  fechado_por?: string;
  checklist?: any;
  motivo_reabertura?: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseFechamentoCP = (lojaId?: string, periodo?: string) => {
  const queryClient = useQueryClient();

  const { data: fechamentos, isLoading } = useQuery({
    queryKey: ["fechamentos-cp", lojaId, periodo],
    queryFn: async () => {
      let query = supabase
        .from("fechamentos_cp")
        .select("*")
        .order("periodo", { ascending: false });

      if (lojaId) {
        query = query.eq("loja_id", lojaId);
      }

      if (periodo) {
        query = query.eq("periodo", periodo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FechamentoCP[];
    },
  });

  const fecharPeriodo = useMutation({
    mutationFn: async ({ periodo, loja_id, checklist }: { periodo: string; loja_id: string; checklist?: any }) => {
      const { data, error } = await supabase
        .from("fechamentos_cp")
        .upsert({
          periodo,
          loja_id,
          fechado: true,
          fechado_em: new Date().toISOString(),
          fechado_por: (await supabase.auth.getUser()).data.user?.id,
          checklist,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos-cp"] });
      toast.success("Período fechado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao fechar período:", error);
      toast.error("Erro ao fechar período: " + error.message);
    },
  });

  const reabrirPeriodo = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase
        .from("fechamentos_cp")
        .update({
          fechado: false,
          motivo_reabertura: motivo,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos-cp"] });
      toast.success("Período reaberto com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao reabrir período:", error);
      toast.error("Erro ao reabrir período: " + error.message);
    },
  });

  return {
    fechamentos: fechamentos || [],
    isLoading,
    fecharPeriodo,
    reabrirPeriodo,
  };
};
