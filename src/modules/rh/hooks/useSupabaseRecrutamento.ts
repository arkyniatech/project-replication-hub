import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface Vaga {
  id: string;
  loja_id: string;
  cargo_id?: string | null;
  titulo: string;
  descricao?: string | null;
  quantidade: number;
  status: 'ABERTA' | 'EM_ANALISE' | 'FECHADA';
  aberta_em: string;
  fechada_em?: string | null;
  loja?: { nome: string } | null;
  cargo?: { nome: string } | null;
}

export interface Candidato {
  id: string;
  vaga_id: string;
  loja_id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  origem?: string | null;
  status: 'NOVO' | 'EM_PROCESSO' | 'APROVADO' | 'REPROVADO';
  observacoes?: string | null;
  vaga?: { titulo: string } | null;
}

export interface Admissao {
  id: string;
  candidato_id?: string | null;
  vaga_id?: string | null;
  loja_id: string;
  cargo_id?: string | null;
  nome: string;
  cpf?: string | null;
  data_prevista?: string | null;
  data_admissao?: string | null;
  salario?: number | null;
  status: 'PENDENTE' | 'EM_PROCESSO' | 'CONCLUIDA' | 'CANCELADA';
  observacoes?: string | null;
  loja?: { nome: string } | null;
  cargo?: { nome: string } | null;
}

export function useSupabaseRecrutamento() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-vagas'] });
    qc.invalidateQueries({ queryKey: ['rh-candidatos'] });
    qc.invalidateQueries({ queryKey: ['rh-admissoes'] });
  };

  const { data: vagas = [], isLoading: loadingVagas, error: errVagas } = useQuery({
    queryKey: ['rh-vagas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_vagas')
        .select('*, loja:lojas(nome), cargo:cargos(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Vaga[];
    },
  });

  const { data: candidatos = [], isLoading: loadingCandidatos, error: errCandidatos } = useQuery({
    queryKey: ['rh-candidatos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_candidatos')
        .select('*, vaga:rh_vagas(titulo)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Candidato[];
    },
  });

  const { data: admissoes = [], isLoading: loadingAdmissoes, error: errAdmissoes } = useQuery({
    queryKey: ['rh-admissoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_admissoes')
        .select('*, loja:lojas(nome), cargo:cargos(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Admissao[];
    },
  });

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cargos').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const criarVaga = useMutation({
    mutationFn: async (input: Partial<Vaga>) => {
      const { data, error } = await supabase.from('rh_vagas').insert([input as TablesInsert<'rh_vagas'>]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const atualizarVaga = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vaga> & { id: string }) => {
      const { error } = await supabase.from('rh_vagas').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const criarCandidato = useMutation({
    mutationFn: async (input: Partial<Candidato>) => {
      const { data, error } = await supabase.from('rh_candidatos').insert([input as TablesInsert<'rh_candidatos'>]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const atualizarCandidato = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidato> & { id: string }) => {
      const { error } = await supabase.from('rh_candidatos').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const criarAdmissao = useMutation({
    mutationFn: async (input: Partial<Admissao>) => {
      const { data, error } = await supabase.from('rh_admissoes').insert([input as TablesInsert<'rh_admissoes'>]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const atualizarAdmissao = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Admissao> & { id: string }) => {
      const { error } = await supabase.from('rh_admissoes').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    vagas, candidatos, admissoes, cargos,
    isLoading: loadingVagas || loadingCandidatos || loadingAdmissoes,
    error: (errVagas ?? errCandidatos ?? errAdmissoes) as Error | null,
    criarVaga, atualizarVaga, criarCandidato, atualizarCandidato, criarAdmissao, atualizarAdmissao,
  };
}
