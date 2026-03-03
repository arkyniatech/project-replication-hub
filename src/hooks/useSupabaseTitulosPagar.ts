// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TituloPagar {
  id: string;
  loja_id: string;
  numero: string;
  fornecedor_id: string;
  categoria_codigo?: string;
  cc_id?: string;
  valor_total: number;
  qtd_parcelas: number;
  vencimento_inicial: string;
  condicao?: string;
  doc_tipo?: string;
  doc_numero?: string;
  chave_fiscal_44?: string;
  emissao?: string;
  status: string;
  observacoes?: string;
  anexos?: any[];
  timeline?: any[];
  dup_justificativa?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  fornecedor?: {
    nome: string;
    codigo: string;
  };
  categoria?: {
    codigo: string;
    descricao: string;
  };
  parcelas?: any[];
}

export const useSupabaseTitulosPagar = (lojaId?: string) => {
  const queryClient = useQueryClient();

  const { data: titulos, isLoading } = useQuery({
    queryKey: ["titulos-pagar", lojaId],
    queryFn: async () => {
      let query = supabase
        .from("titulos_pagar")
        .select(`
          *,
          fornecedor:fornecedores(nome, codigo),
          categoria:categorias_n2(codigo, descricao),
          parcelas:parcelas_pagar(*)
        `)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (lojaId) {
        query = query.eq("loja_id", lojaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TituloPagar[];
    },
  });

  const createTitulo = useMutation({
    mutationFn: async (titulo: Partial<TituloPagar>) => {
      const { data, error } = await supabase
        .from("titulos_pagar")
        .insert([titulo] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      toast.success("Título criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar título:", error);
      toast.error("Erro ao criar título: " + error.message);
    },
  });

  const updateTitulo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TituloPagar> & { id: string }) => {
      const { data, error } = await supabase
        .from("titulos_pagar")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      toast.success("Título atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar título:", error);
      toast.error("Erro ao atualizar título: " + error.message);
    },
  });

  const deleteTitulo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("titulos_pagar")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      toast.success("Título excluído com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir título:", error);
      toast.error("Erro ao excluir título: " + error.message);
    },
  });

  return {
    titulos: titulos || [],
    isLoading,
    createTitulo,
    updateTitulo,
    deleteTitulo,
  };
};
