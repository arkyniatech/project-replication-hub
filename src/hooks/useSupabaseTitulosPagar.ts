import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TITULOS_PAGAR_SELECT } from "@/lib/contas-pagar-select";
import { ehErroDeDuplicidade } from "@/lib/anti-duplicidade";
import { sanitizarTituloPagar } from "@/lib/contas-pagar-payload";

/**
 * Colunas reais de titulos_pagar: id, loja_id, fornecedor_id, numero, valor,
 * pago, saldo, emissao, vencimento, status, categoria, subcategoria,
 * observacoes, created_at, updated_at, created_by e — desde o relay 70 —
 * doc_tipo, doc_numero, chave_fiscal_44.
 *
 * `categoria` é TEXT livre — não há categoria_id nem relação com categorias_n2.
 * Não existem `ativo`, `doc_numero`, `qtd_parcelas`, `valor_total`.
 */
export interface TituloPagar {
  id: string;
  loja_id: string;
  numero: string;
  fornecedor_id?: string | null;
  valor: number;
  pago: number;
  saldo: number;
  emissao?: string;
  vencimento: string;
  status: string;
  categoria?: string | null;
  subcategoria?: string | null;
  observacoes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  fornecedor?: {
    id?: string;
    nome: string;
  };
  parcelas?: any[];
}

export const useSupabaseTitulosPagar = (lojaId?: string) => {
  const queryClient = useQueryClient();

  const { data: titulos, isLoading, error } = useQuery({
    queryKey: ["titulos-pagar", lojaId],
    queryFn: async () => {
      // Sem `.eq("ativo", true)`: titulos_pagar não tem coluna `ativo`.
      let query = supabase
        .from("titulos_pagar")
        .select(TITULOS_PAGAR_SELECT)
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
      // Fronteira única: nada que não seja coluna real chega ao PostgREST.
      const { data, error } = await supabase
        .from("titulos_pagar")
        .insert([sanitizarTituloPagar(titulo) as never])
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
      // Relay 70: violacao dos indices de anti-duplicidade e traduzida por
      // quem tem o formulario em maos (NovoTituloDrawer), que consegue nomear
      // o titulo ja existente. Emitir aqui tambem mostraria dois toasts, um
      // deles com a mensagem crua do Postgres.
      if (ehErroDeDuplicidade(error)) return;
      toast.error("Erro ao criar título: " + error.message);
    },
  });

  const updateTitulo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TituloPagar> & { id: string }) => {
      const { data, error } = await supabase
        .from("titulos_pagar")
        .update(sanitizarTituloPagar(updates) as never)
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
    // Exposto para a tela poder mostrar erro em vez de spinner infinito.
    error,
    createTitulo,
    updateTitulo,
    deleteTitulo,
  };
};
