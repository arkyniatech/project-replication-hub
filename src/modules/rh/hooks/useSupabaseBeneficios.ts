// @ts-nocheck
// rh_beneficios/rh_beneficio_* ainda não estão em types.ts (criadas no Bloco 12).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const TIPOS_BENEFICIO = [
  { value: 'VALE_REFEICAO', label: 'Vale Refeição' },
  { value: 'VALE_ALIMENTACAO', label: 'Vale Alimentação' },
  { value: 'VALE_TRANSPORTE', label: 'Vale Transporte' },
  { value: 'PLANO_SAUDE', label: 'Plano de Saúde' },
  { value: 'PLANO_ODONTO', label: 'Plano Odontológico' },
  { value: 'SEGURO_VIDA', label: 'Seguro de Vida' },
  { value: 'OUTROS', label: 'Outros' },
];

export interface Beneficio {
  id: string;
  nome: string;
  tipo: string;
  valor_mensal?: number | null;
  provedor?: string | null;
  politica?: string | null;
  ativo: boolean;
}

export interface BeneficioElegibilidade {
  id: string;
  beneficio_id: string;
  cargo_id: string;
  regra?: string | null;
  beneficio?: { nome: string } | null;
  cargo?: { nome: string } | null;
}

export interface BeneficioVinculo {
  id: string;
  beneficio_id: string;
  pessoa_id: string;
  loja_id: string;
  valor_mensal?: number | null;
  data_inicio: string;
  data_fim?: string | null;
  status: 'ativo' | 'suspenso' | 'encerrado';
  pessoa?: { nome: string } | null;
  beneficio?: { nome: string; tipo: string; valor_mensal?: number | null } | null;
}

export function useSupabaseBeneficios() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-beneficios'] });
    qc.invalidateQueries({ queryKey: ['rh-beneficio-elegibilidade'] });
    qc.invalidateQueries({ queryKey: ['rh-beneficio-vinculos'] });
  };

  const { data: beneficios = [], isLoading } = useQuery({
    queryKey: ['rh-beneficios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rh_beneficios').select('*').order('nome');
      if (error) throw error;
      return data as Beneficio[];
    },
  });

  const { data: elegibilidade = [] } = useQuery({
    queryKey: ['rh-beneficio-elegibilidade'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_beneficio_elegibilidade')
        .select('*, beneficio:rh_beneficios(nome), cargo:cargos(nome)');
      if (error) throw error;
      return data as BeneficioElegibilidade[];
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ['rh-beneficio-vinculos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_beneficio_vinculos')
        .select('*, pessoa:pessoas(nome), beneficio:rh_beneficios(nome, tipo, valor_mensal)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BeneficioVinculo[];
    },
  });

  const criarBeneficio = useMutation({
    mutationFn: async (input: Partial<Beneficio>) => {
      const { data, error } = await supabase.from('rh_beneficios').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const atualizarBeneficio = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Beneficio> & { id: string }) => {
      const { error } = await supabase.from('rh_beneficios').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const definirElegibilidade = useMutation({
    mutationFn: async (input: { beneficio_id: string; cargo_id: string; regra?: string }) => {
      const { error } = await supabase
        .from('rh_beneficio_elegibilidade')
        .upsert([input], { onConflict: 'beneficio_id,cargo_id' });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removerElegibilidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rh_beneficio_elegibilidade').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const vincular = useMutation({
    mutationFn: async (input: Partial<BeneficioVinculo>) => {
      const { data, error } = await supabase.from('rh_beneficio_vinculos').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const encerrarVinculo = useMutation({
    mutationFn: async ({ id, data_fim }: { id: string; data_fim: string }) => {
      const { error } = await supabase
        .from('rh_beneficio_vinculos')
        .update({ status: 'encerrado', data_fim })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    beneficios, elegibilidade, vinculos, isLoading,
    criarBeneficio, atualizarBeneficio, definirElegibilidade, removerElegibilidade,
    vincular, encerrarVinculo,
  };
}
