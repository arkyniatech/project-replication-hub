import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem?: string;
  severidade: 'info' | 'alerta' | 'critico';
  lida_em?: string | null;
  created_at: string;
}

export function useSupabaseNotificacoes() {
  const qc = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['rh-notificacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_notificacoes')
        .select('*')
        .is('lida_em', null)
        .order('severidade', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notificacao[];
    },
  });

  const gerar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('gerar_notificacoes_rh');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-notificacoes'] }),
  });

  const marcarLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rh_notificacoes').update({ lida_em: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-notificacoes'] }),
  });

  return { notificacoes, isLoading, gerar, marcarLida };
}
