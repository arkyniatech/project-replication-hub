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

/**
 * Invalida as duas queries de categorias. Criar/inativar/reativar precisa
 * refletir tanto no drawer de novo título (ativas) quanto na tela de gestão
 * (todas) — invalidar só uma deixa a outra lista defasada.
 */
const invalidarCategorias = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["categorias-n2"] });
  queryClient.invalidateQueries({ queryKey: ["categorias-n2-todas"] });
};

export const useSupabaseCategoriasN2 = () => {
  const queryClient = useQueryClient();

  // Só ativas: é a lista que o NovoTituloDrawer e os demais consumidores
  // usam. Não mude o filtro ativo=true — eles dependem dele.
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

  // Todas (inclusive inativas): só a tela de gestão consome, para reativar.
  const { data: categoriasTodas, isLoading: isLoadingTodas, error: errorTodas } = useQuery({
    queryKey: ["categorias-n2-todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_n2")
        .select(CATEGORIAS_N2_SELECT)
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
      invalidarCategorias(queryClient);
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
      invalidarCategorias(queryClient);
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar categoria:", error);
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });

  // Soft delete, espelhando deleteFornecedor de useSupabaseFornecedores:
  // títulos existentes referenciam a categoria por texto, então apagar de
  // verdade quebraria o histórico.
  const inativarCategoria = useMutation({
    mutationFn: async (categoriaId: string) => {
      const { error } = await supabase
        .from("categorias_n2")
        .update({ ativo: false })
        .eq("id", categoriaId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidarCategorias(queryClient);
      toast.success("Categoria inativada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao inativar categoria:", error);
      toast.error("Erro ao inativar categoria: " + error.message);
    },
  });

  return {
    categorias: categorias || [],
    isLoading,
    // Exposto para a tela poder mostrar erro em vez de spinner infinito.
    error,
    categoriasTodas: categoriasTodas || [],
    isLoadingTodas,
    errorTodas,
    createCategoria,
    updateCategoria,
    inativarCategoria,
  };
};
