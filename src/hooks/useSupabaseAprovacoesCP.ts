import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AprovacaoCP {
  id: string;
  titulo_id: string;
  valor: number;
  status: "PENDENTE" | "APROVADO" | "REPROVADO";
  nivel: "FINANCEIRO" | "GESTOR" | "DIRECAO";
  historico: any[];
  created_at: string;
  updated_at: string;
  titulo?: {
    numero: string;
    fornecedor: {
      nome: string;
    };
  };
}

export const useSupabaseAprovacoesCP = (status?: string) => {
  const queryClient = useQueryClient();

  const { data: aprovacoes, isLoading } = useQuery({
    queryKey: ["aprovacoes-cp", status],
    queryFn: async () => {
      let query = supabase
        .from("aprovacoes_cp")
        .select(`
          *,
          titulo:titulos_pagar(
            numero,
            fornecedor:fornecedores(nome)
          )
        `)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AprovacaoCP[];
    },
  });

  const aprovar = useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao?: string }) => {
      const user = await supabase.auth.getUser();
      
      const { data: aprovacao } = await supabase
        .from("aprovacoes_cp")
        .select("historico")
        .eq("id", id)
        .single();

      const novoHistorico = [
        ...((aprovacao?.historico as any[]) || []),
        {
          usuario: user.data.user?.id,
          acao: "APROVADO",
          observacao,
          ts: new Date().toISOString(),
        },
      ];

      const { data, error } = await supabase
        .from("aprovacoes_cp")
        .update({
          status: "APROVADO" as const,
          historico: novoHistorico as any,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aprovacoes-cp"] });
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      toast.success("Título aprovado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao aprovar título:", error);
      toast.error("Erro ao aprovar título: " + error.message);
    },
  });

  const reprovar = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const user = await supabase.auth.getUser();
      
      const { data: aprovacao } = await supabase
        .from("aprovacoes_cp")
        .select("historico")
        .eq("id", id)
        .single();

      const novoHistorico = [
        ...((aprovacao?.historico as any[]) || []),
        {
          usuario: user.data.user?.id,
          acao: "REPROVADO",
          motivo,
          ts: new Date().toISOString(),
        },
      ];

      const { data, error } = await supabase
        .from("aprovacoes_cp")
        .update({
          status: "REPROVADO" as const,
          historico: novoHistorico as any,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aprovacoes-cp"] });
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      toast.success("Título reprovado!");
    },
    onError: (error: any) => {
      console.error("Erro ao reprovar título:", error);
      toast.error("Erro ao reprovar título: " + error.message);
    },
  });

  return {
    aprovacoes: aprovacoes || [],
    isLoading,
    aprovar,
    reprovar,
  };
};
