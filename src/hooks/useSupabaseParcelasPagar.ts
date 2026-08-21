import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PARCELAS_PAGAR_SELECT, normalizarParcelaPagar } from "@/lib/contas-pagar-select";
import { sanitizarParcelaPagar } from "@/lib/contas-pagar-payload";

/**
 * Formato consumido pelas telas. Nem todo campo é coluna de parcelas_pagar —
 * as colunas reais são id, titulo_id, numero, vencimento, valor, valor_pago,
 * data_pagamento, status, created_at, updated_at. `pago` e `saldo` são
 * derivados; `loja_id`, `fornecedor_id` e `categoria_codigo` vêm do título.
 * Ver src/lib/contas-pagar-select.ts.
 */
export interface ParcelaPagar {
  id: string;
  titulo_id: string;
  numero_parcela: number;
  vencimento: string;
  valor: number;
  pago: number;
  saldo: number;
  status: string;
  data_pagamento?: string | null;
  created_at?: string;
  updated_at?: string;
  loja_id?: string;
  fornecedor_id?: string;
  categoria_codigo?: string;
  subcategoria?: string;
  fornecedor?: {
    id?: string;
    nome: string;
  };
  titulo?: {
    id?: string;
    numero?: string;
  };
}

interface FetchParcelasParams {
  lojaId?: string;
  fornecedorId?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

export const useSupabaseParcelasPagar = (params?: FetchParcelasParams) => {
  const queryClient = useQueryClient();

  const { data: parcelas, isLoading, error } = useQuery({
    queryKey: ["parcelas-pagar", params],
    queryFn: async () => {
      let query = supabase
        .from("parcelas_pagar")
        .select(PARCELAS_PAGAR_SELECT)
        .order("vencimento", { ascending: true });

      // loja_id e fornecedor_id não existem em parcelas_pagar: só no título.
      // O filtro tem que ser aplicado na relação embutida.
      if (params?.lojaId) {
        query = query.eq("titulo.loja_id", params.lojaId).not("titulo", "is", null);
      }

      if (params?.fornecedorId) {
        query = query
          .eq("titulo.fornecedor_id", params.fornecedorId)
          .not("titulo", "is", null);
      }

      if (params?.status) {
        query = query.eq("status", params.status as any);
      }

      if (params?.dataInicio) {
        query = query.gte("vencimento", params.dataInicio);
      }

      if (params?.dataFim) {
        query = query.lte("vencimento", params.dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []).map(normalizarParcelaPagar) as ParcelaPagar[];
    },
  });

  /**
   * As parcelas nunca eram gravadas: o NovoTituloDrawer só as gerava na tela.
   * Título criado sem parcela deixa a tela de Parcelas vazia (item 8.1).
   */
  const createParcelas = useMutation({
    mutationFn: async (linhas: Record<string, unknown>[]) => {
      if (linhas.length === 0) return [];

      const { data, error } = await supabase
        .from("parcelas_pagar")
        .insert(linhas.map((linha) => sanitizarParcelaPagar(linha)) as never)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
    },
    onError: (error: any) => {
      console.error("Erro ao criar parcelas:", error);
      toast.error("Erro ao criar parcelas: " + error.message);
    },
  });

  const updateParcela = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ParcelaPagar> & { id: string }) => {
      const { data, error } = await supabase
        .from("parcelas_pagar")
        .update(sanitizarParcelaPagar(updates) as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      toast.success("Parcela atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar parcela:", error);
      toast.error("Erro ao atualizar parcela: " + error.message);
    },
  });

  const suspenderParcela = useMutation({
    // parcelas_pagar não tem `suspensa` nem `motivo_suspensao`. A suspensão é
    // representada apenas em `status`, que existe.
    mutationFn: async ({ id }: { id: string; motivo?: string }) => {
      const { data, error } = await supabase
        .from("parcelas_pagar")
        .update({ status: 'SUSPENSA' })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas-pagar"] });
      toast.success("Parcela suspensa com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao suspender parcela:", error);
      toast.error("Erro ao suspender parcela: " + error.message);
    },
  });

  return {
    parcelas: parcelas || [],
    isLoading,
    // Exposto para a tela poder mostrar erro em vez de spinner infinito.
    error,
    createParcelas,
    updateParcela,
    suspenderParcela,
  };
};
