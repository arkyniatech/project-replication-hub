import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AvisoSistema {
  id: string;
  texto: string;
  tipo: 'info' | 'warning' | 'success' | 'urgent';
  ativo: boolean;
  prioridade: number;
  data_inicio?: string;
  data_fim?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ConfigAvisosHeader {
  id: string;
  exibir_logo: boolean;
  tempo_rotacao: number;
  animacao: boolean;
  created_at: string;
  updated_at: string;
}

export function useSupabaseAvisos() {
  const queryClient = useQueryClient();

  // Buscar avisos ativos
  const { data: avisos, isLoading: isLoadingAvisos } = useQuery({
    queryKey: ['avisos_sistema'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .select('*')
        .eq('ativo', true)
        .order('prioridade', { ascending: false });

      if (error) throw error;
      return data as AvisoSistema[];
    },
  });

  // Buscar todos os avisos (para admin)
  const { data: todosAvisos, isLoading: isLoadingTodos } = useQuery({
    queryKey: ['avisos_sistema_todos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AvisoSistema[];
    },
  });

  // Buscar configuração do header
  const { data: configHeader, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['config_avisos_header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_avisos_header')
        .select('*')
        .single();

      if (error) throw error;
      return data as ConfigAvisosHeader;
    },
  });

  // Adicionar aviso
  const addAviso = useMutation({
    mutationFn: async (aviso: Omit<AvisoSistema, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .insert(aviso)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema'] });
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema_todos'] });
      toast.success('Aviso adicionado com sucesso');
    },
    onError: (error: Error) => {
      console.error('Erro ao adicionar aviso:', error);
      toast.error('Erro ao adicionar aviso');
    },
  });

  // Atualizar aviso
  const updateAviso = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AvisoSistema> }) => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema'] });
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema_todos'] });
      toast.success('Aviso atualizado com sucesso');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar aviso:', error);
      toast.error('Erro ao atualizar aviso');
    },
  });

  // Deletar aviso
  const deleteAviso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('avisos_sistema')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema'] });
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema_todos'] });
      toast.success('Aviso removido com sucesso');
    },
    onError: (error: Error) => {
      console.error('Erro ao remover aviso:', error);
      toast.error('Erro ao remover aviso');
    },
  });

  // Toggle ativo
  const toggleAviso = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro buscar o estado atual
      const { data: avisoAtual, error: fetchError } = await supabase
        .from('avisos_sistema')
        .select('ativo')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar com o valor invertido
      const { error } = await supabase
        .from('avisos_sistema')
        .update({ ativo: !avisoAtual.ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema'] });
      queryClient.invalidateQueries({ queryKey: ['avisos_sistema_todos'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao alternar aviso:', error);
      toast.error('Erro ao alternar aviso');
    },
  });

  // Atualizar configuração do header
  const updateConfigHeader = useMutation({
    mutationFn: async (config: Partial<ConfigAvisosHeader>) => {
      // Buscar o ID atual
      const { data: configAtual } = await supabase
        .from('config_avisos_header')
        .select('id')
        .single();

      if (!configAtual) {
        // Criar se não existir
        const { data, error } = await supabase
          .from('config_avisos_header')
          .insert(config as any)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Atualizar existente
        const { data, error } = await supabase
          .from('config_avisos_header')
          .update(config)
          .eq('id', configAtual.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config_avisos_header'] });
      toast.success('Configuração atualizada');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    },
  });

  // Filtrar avisos por data
  const getAvisosAtivos = () => {
    if (!avisos) return [];
    
    const hoje = new Date().toISOString().split('T')[0];
    
    return avisos.filter(aviso => {
      // Verificar data de início
      if (aviso.data_inicio && aviso.data_inicio > hoje) return false;
      
      // Verificar data de fim
      if (aviso.data_fim && aviso.data_fim < hoje) return false;
      
      return true;
    });
  };

  return {
    avisos,
    todosAvisos,
    configHeader,
    isLoading: isLoadingAvisos || isLoadingConfig,
    isLoadingTodos,
    addAviso: addAviso.mutate,
    updateAviso: updateAviso.mutate,
    deleteAviso: deleteAviso.mutate,
    toggleAviso: toggleAviso.mutate,
    updateConfigHeader: updateConfigHeader.mutate,
    getAvisosAtivos,
  };
}
