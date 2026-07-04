import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Grupos de LOJAS (franquias) — não confundir com useSupabaseGrupos
 * (grupos de equipamentos).
 *
 * Modelo híbrido:
 *  - lojas.grupo_id aponta para o grupo da loja;
 *  - user_grupos vincula funcionários a grupos;
 *  - triggers no banco sincronizam user_lojas_permitidas
 *    (linhas com origem_grupo_id preenchido = concedidas por grupo).
 *
 * Obs.: as tabelas grupos_lojas/user_grupos ainda não estão nos tipos
 * gerados do Supabase (regenerar após aplicar a migration), por isso o
 * cast local — as interfaces abaixo são a fonte de tipo do app.
 */
export interface GrupoLojas {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Cliente sem tipagem de schema para tabelas ainda não presentes nos tipos gerados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useGruposLojas() {
  const queryClient = useQueryClient();

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos_lojas'],
    queryFn: async () => {
      const { data, error } = await db
        .from('grupos_lojas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return (data || []) as GrupoLojas[];
    },
  });

  const createGrupo = useMutation({
    mutationFn: async ({ nome, descricao }: { nome: string; descricao?: string }) => {
      const { data, error } = await db
        .from('grupos_lojas')
        .insert({ nome: nome.trim(), descricao: descricao?.trim() || null })
        .select()
        .single();
      if (error) throw error;
      return data as GrupoLojas;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos_lojas'] });
    },
  });

  const updateGrupo = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<GrupoLojas, 'nome' | 'descricao' | 'ativo'>> }) => {
      const { data, error } = await db
        .from('grupos_lojas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GrupoLojas;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos_lojas'] });
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
    },
  });

  return { grupos, isLoading, createGrupo, updateGrupo };
}

/** IDs dos grupos aos quais um usuário pertence. */
export function useUserGrupos(userId?: string) {
  return useQuery({
    queryKey: ['user_grupos', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from('user_grupos')
        .select('grupo_id')
        .eq('user_id', userId!);
      if (error) throw error;
      return ((data || []) as { grupo_id: string }[]).map(r => r.grupo_id);
    },
  });
}
