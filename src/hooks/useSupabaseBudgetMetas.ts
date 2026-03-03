// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BudgetMeta {
  id: string;
  periodo: string;
  loja_id: string;
  categoria_codigo: string;
  meta: number;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  categoria?: {
    codigo: string;
    descricao: string;
  };
}

interface FetchMetasParams {
  lojaId?: string;
  periodo?: string;
}

export const useSupabaseBudgetMetas = (params?: FetchMetasParams) => {
  const queryClient = useQueryClient();

  const { data: metas, isLoading } = useQuery({
    queryKey: ["budget-metas", params],
    queryFn: async () => {
      let query = (supabase as any)
        .from("budget_metas")
        .select(`
          *,
          categoria:categorias_n2(codigo, descricao)
        `)
        .order("categoria_codigo", { ascending: true });

      if (params?.lojaId) {
        query = query.eq("loja_id", params.lojaId);
      }

      if (params?.periodo) {
        query = query.eq("periodo", params.periodo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BudgetMeta[];
    },
  });

  const createMeta = useMutation({
    mutationFn: async (meta: Omit<BudgetMeta, "id" | "created_at" | "updated_at" | "categoria">) => {
      const { data, error } = await (supabase as any)
        .from("budget_metas")
        .insert(meta)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-metas"] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar meta:", error);
      toast.error("Erro ao criar meta: " + error.message);
    },
  });

  const updateMeta = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetMeta> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("budget_metas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-metas"] });
      toast.success("Meta atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar meta:", error);
      toast.error("Erro ao atualizar meta: " + error.message);
    },
  });

  const deleteMeta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("budget_metas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-metas"] });
      toast.success("Meta excluída com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir meta:", error);
      toast.error("Erro ao excluir meta: " + error.message);
    },
  });

  return {
    metas: metas || [],
    isLoading,
    createMeta,
    updateMeta,
    deleteMeta,
  };
};
