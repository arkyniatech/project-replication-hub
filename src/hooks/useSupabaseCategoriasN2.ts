// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CategoriaN2 {
  id: string;
  codigo: string;
  descricao: string;
  tipo: "DESPESA" | "RECEITA";
  nivel_1: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useSupabaseCategoriasN2 = () => {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ["categorias-n2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_n2")
        .select("*")
        .eq("ativo", true)
        .order("codigo", { ascending: true });

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
    createCategoria,
    updateCategoria,
  };
};
