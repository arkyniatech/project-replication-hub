// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CATEGORIAS_N2_SELECT } from "@/lib/contas-pagar-select";

/**
 * Colunas reais de categorias_n2: id, nome, tipo, ativo, created_at,
 * updated_at. Não existem `codigo`, `descricao` nem `nivel_1`.
 */
export interface CategoriaN2 {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useSupabaseCategoriasN2 = () => {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading, error } = useQuery({
    queryKey: ["categorias-n2"],
    queryFn: async () => {
      // Ordena por `nome`: não existe coluna `codigo`.
      const { data, error } = await supabase
        .from("categorias_n2")
        .select(CATEGORIAS_N2_SELECT)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as CategoriaN2[];
    },
  });

  const createCategoria = useMutation({
    mutationFn: async (categoria: Omit<CategoriaN2, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("categorias_n2")
        .insert(categoria)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-n2"] });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar categoria:", error);
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoriaN2> & { id: string }) => {
      const { data, error } = await supabase
        .from("categorias_n2")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-n2"] });
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar categoria:", error);
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });

  return {
    categorias: categorias || [],
    isLoading,
    // Exposto para a tela poder mostrar erro em vez de spinner infinito.
    error,
    createCategoria,
    updateCategoria,
  };
};
