// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContaFinanceira {
  id: string;
  loja_id: string;
  codigo: string;
  nome: string;
  banco?: string;
  agencia?: string;
  numero?: string;
  tipo: "BANCO" | "CAIXA" | "CARTAO";
  moeda: string;
  saldo_atual: number;
  bloqueios: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useSupabaseContasFinanceiras = (lojaId?: string) => {
  const queryClient = useQueryClient();

  const { data: contas, isLoading } = useQuery({
    queryKey: ["contas-financeiras", lojaId],
    queryFn: async () => {
      let query = supabase
        .from("contas_financeiras")
        .select("*")
        .eq("ativo", true)
        .order("codigo", { ascending: true });

      if (lojaId) {
        query = query.eq("loja_id", lojaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContaFinanceira[];
    },
  });

  const createConta = useMutation({
    mutationFn: async (conta: Omit<ContaFinanceira, "id" | "created_at" | "updated_at" | "saldo_atual" | "bloqueios">) => {
      const { data, error } = await supabase
        .from("contas_financeiras")
        .insert(conta)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      toast.success("Conta criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar conta:", error);
      toast.error("Erro ao criar conta: " + error.message);
    },
  });

  const updateConta = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContaFinanceira> & { id: string }) => {
      const { data, error } = await supabase
        .from("contas_financeiras")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      toast.success("Conta atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar conta:", error);
      toast.error("Erro ao atualizar conta: " + error.message);
    },
  });

  return {
    contas: contas || [],
    isLoading,
    createConta,
    updateConta,
  };
};
