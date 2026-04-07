// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MovimentoPagar {
  id: string;
  parcela_id: string;
  titulo_id: string;
  conta_id: string;
  loja_id: string;
  data_pagamento: string;
  valor_bruto: number;
  juros: number;
  multa: number;
  desconto: number;
  valor_liquido: number;
  forma: string;
  comprovante_url?: string;
  observacoes?: string;
  created_by?: string;
  created_at: string;
}

export const useSupabaseMovimentosPagar = (parcelaId?: string) => {
  const queryClient = useQueryClient();

  const { data: movimentos, isLoading } = useQuery({
    queryKey: ["movimentos-pagar", parcelaId],
    queryFn: async () => {
      let query = supabase
        .from("movimentos_pagar")
        .select("*")
        .order("data_pagamento", { ascending: false });

      if (parcelaId) {
        query = query.eq("parcela_id", parcelaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MovimentoPagar[];
    },
    enabled: true,
  });

  const registrarPagamento = useMutation({
    mutationFn: async (movimento: Omit<MovimentoPagar, "id" | "created_at" | "valor_liquido">) => {
      const { data, error } = await supabase
        .from("movimentos_pagar")
        .insert(movimento)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimentos-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["parcelas-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      toast.success("Pagamento registrado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao registrar pagamento:", error);
      toast.error("Erro ao registrar pagamento: " + error.message);
    },
  });

  return {
    movimentos: movimentos || [],
    isLoading,
    registrarPagamento,
  };
};
