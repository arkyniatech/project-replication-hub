// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LogisticaMotorista {
  id: string;
  loja_id: string;
  pessoa_id?: string;
  nome: string;
  telefone?: string;
  cnh?: string;
  categoria_cnh?: string;
  vencimento_cnh?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useSupabaseLogisticaMotoristas(lojaId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["logistica-motoristas", lojaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistica_motoristas")
        .select("*")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as LogisticaMotorista[];
    },
    enabled: !!lojaId,
  });

  const createMutation = useMutation({
    mutationFn: async (motorista: Partial<LogisticaMotorista>) => {
      const { data, error } = await supabase
        .from("logistica_motoristas")
        .insert([{ ...motorista, loja_id: lojaId } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-motoristas", lojaId] });
      toast({
        title: "Motorista cadastrado",
        description: "O motorista foi cadastrado com sucesso.",
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
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LogisticaMotorista> }) => {
      const { data, error } = await supabase
        .from("logistica_motoristas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-motoristas", lojaId] });
      toast({
        title: "Motorista atualizado",
        description: "Os dados do motorista foram atualizados.",
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
        .from("logistica_motoristas")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-motoristas", lojaId] });
      toast({
        title: "Motorista inativado",
        description: "O motorista foi inativado com sucesso.",
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
    motoristas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createMotorista: createMutation.mutate,
    updateMotorista: updateMutation.mutate,
    deleteMotorista: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
