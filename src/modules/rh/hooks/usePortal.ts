// @ts-nocheck
// Portal do colaborador: usa o dado do PRÓPRIO usuário logado (via user_profiles.pessoa_id).
// A RLS já libera "o próprio" em holerites/ferias/banco_horas/solicitacoes.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePortal() {
  const { user } = useAuth();

  const { data: me, isLoading } = useQuery({
    queryKey: ['portal-me', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: prof } = await supabase.from('user_profiles').select('pessoa_id').eq('id', user.id).maybeSingle();
      if (!prof?.pessoa_id) return null;
      const { data: pessoa } = await supabase.from('pessoas').select('id, nome, cargo').eq('id', prof.pessoa_id).maybeSingle();
      return pessoa;
    },
  });
  const pessoaId = me?.id;

  const { data: holerites = [] } = useQuery({
    queryKey: ['portal-holerites', pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await supabase
        .from('holerites')
        .select('*, lote:holerite_lotes(competencia, tipo, status)')
        .eq('pessoa_id', pessoaId)
        .order('competencia', { ascending: false });
      return (data || []).filter((h) => h.lote?.status === 'publicado');
    },
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ['portal-ferias', pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await supabase.from('ferias_periodos').select('*').eq('pessoa_id', pessoaId).order('concessivo_fim');
      return data || [];
    },
  });

  const { data: horasMov = [] } = useQuery({
    queryKey: ['portal-horas', pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await supabase
        .from('banco_horas_movimentos')
        .select('*')
        .eq('pessoa_id', pessoaId)
        .order('ocorrido_em', { ascending: false })
        .order('created_at', { ascending: false });
      return data || [];
    },
  });
  const saldoHoras = Number(horasMov[0]?.saldo_apos ?? 0);

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['portal-solic', pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await supabase.from('rh_solicitacoes').select('*').eq('pessoa_id', pessoaId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const feriasSaldo = ferias
    .filter((f) => ['adquirido', 'vencido', 'dobro_devido', 'parcialmente_gozado', 'programado'].includes(f.status))
    .reduce((acc, f) => acc + Number(f.dias_saldo ?? 0), 0);

  return { me, pessoaId, holerites, ferias, horasMov, saldoHoras, solicitacoes, feriasSaldo, isLoading };
}

export async function holeriteSignedUrl(path: string) {
  const { data } = await supabase.storage.from('holerites').createSignedUrl(path, 3600);
  return data?.signedUrl;
}
