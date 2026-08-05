// @ts-nocheck
// pessoa_vinculo ainda não está em types.ts (tabela criada direto no banco na Fundação).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PessoaVinculo {
  id: string;
  pessoa_id: string;
  loja_id: string;
  empresa_id?: string;
  cargo_id?: string;
  tipo_contrato: string;
  matricula?: string;
  data_admissao?: string;
  salario?: number | null;
  tipo_salario: string;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  motivo_alteracao: string;
  observacao?: string;
  created_at: string;
  cargo?: { nome: string } | null;
  loja?: { nome: string } | null;
  empresa?: { razao_social: string; cnpj: string } | null;
}

/** Histórico contratual de uma pessoa. O vínculo vigente é o de vigencia_fim NULL. */
export function useSupabasePessoaVinculo(pessoaId?: string) {
  const { data: vinculos = [], isLoading, error } = useQuery({
    queryKey: ['pessoa-vinculo', pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      const { data, error } = await supabase
        .from('pessoa_vinculo')
        .select('*, cargo:cargos(nome), loja:lojas(nome), empresa:empresas(razao_social, cnpj)')
        .eq('pessoa_id', pessoaId)
        .order('vigencia_inicio', { ascending: false });
      if (error) throw error;
      return data as PessoaVinculo[];
    },
    enabled: !!pessoaId,
  });

  const vinculoVigente = vinculos.find((v) => !v.vigencia_fim) ?? null;

  return { vinculos, vinculoVigente, isLoading, error };
}
