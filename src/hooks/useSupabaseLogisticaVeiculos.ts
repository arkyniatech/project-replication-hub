import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LogisticaVeiculo {
  id: string;
  loja_id: string;
  placa: string;
  modelo: string;
  ano?: number;
  capacidade_kg?: number;
  capacidade_m3?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useSupabaseLogisticaVeiculos(lojaId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["logistica-veiculos", lojaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistica_veiculos")
        .select("*")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .order("modelo");

      if (error) throw error;
      return data as LogisticaVeiculo[];
    },
    enabled: !!lojaId,
  });

  const createMutation = useMutation({
    mutationFn: async (veiculo: Partial<LogisticaVeiculo>) => {
      const { data, error } = await supabase
        .from("logistica_veiculos")
        .insert([{ ...veiculo, loja_id: lojaId } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-veiculos", lojaId] });
      toast({
        title: "Veículo cadastrado",
        description: "O veículo foi cadastrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LogisticaVeiculo> }) => {
      const { data, error } = await supabase
        .from("logistica_veiculos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-veiculos", lojaId] });
      toast({
        title: "Veículo atualizado",
        description: "Os dados do veículo foram atualizados.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("logistica_veiculos")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-veiculos", lojaId] });
      toast({
        title: "Veículo inativado",
        description: "O veículo foi inativado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao inativar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    veiculos: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createVeiculo: createMutation.mutate,
    updateVeiculo: updateMutation.mutate,
    deleteVeiculo: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
