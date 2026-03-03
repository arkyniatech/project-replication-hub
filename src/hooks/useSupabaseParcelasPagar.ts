// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParcelaPagar {
  id: string;
  titulo_id: string;
  loja_id: string;
  fornecedor_id: string;
  categoria_codigo?: string;
  numero_parcela: number;
  vencimento: string;
  valor: number;
  pago: number;
  saldo: number;
  status: string;
  conta_preferencial_id?: string;
  cc_id?: string;
  observacoes?: string;
  reprogramacoes?: any[];
  anexos?: any[];
  suspensa: boolean;
  motivo_suspensao?: string;
  created_at: string;
  updated_at: string;
  fornecedor?: {
    nome: string;
    codigo: string;
  };
  titulo?: {
    numero: string;
    doc_numero?: string;
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

  const { data: parcelas, isLoading } = useQuery({
    queryKey: ["parcelas-pagar", params],
    queryFn: async () => {
      let query = supabase
        .from("parcelas_pagar")
        .select(`
          *,
          fornecedor:fornecedores(nome, codigo),
          titulo:titulos_pagar(numero, doc_numero)
        `)
        .order("vencimento", { ascending: true });

      if (params?.lojaId) {
        query = query.eq("loja_id", params.lojaId);
      }

      if (params?.fornecedorId) {
        query = query.eq("fornecedor_id", params.fornecedorId);
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
      return data as ParcelaPagar[];
    },
  });

  const updateParcela = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ParcelaPagar> & { id: string }) => {
      const { data, error } = await supabase
        .from("parcelas_pagar")
        .update(updates as any)
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
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase
        .from("parcelas_pagar")
        .update({ 
          suspensa: true, 
          motivo_suspensao: motivo,
          status: 'SUSPENSA' as const
        })
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
    updateParcela,
    suspenderParcela,
  };
};
