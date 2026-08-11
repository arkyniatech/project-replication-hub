import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type CatalogoItem = Database['public']['Tables']['almox_catalogo_itens']['Row'];
export type CatalogoInsert = Database['public']['Tables']['almox_catalogo_itens']['Insert'];
export type CatalogoUpdate = Database['public']['Tables']['almox_catalogo_itens']['Update'];

/** Catálogo central de itens (patrimônio, peças, consumíveis). Sem escopo de loja. */
export function useSupabaseCatalogo() {
  const qc = useQueryClient();

  const { data: itens = [], isLoading, error } = useQuery({
    queryKey: ['almox-catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('almox_catalogo_itens')
        .select('*')
        .order('descricao', { ascending: true });
      if (error) { console.error('Erro ao buscar catálogo:', error); throw error; }
      return data as CatalogoItem[];
    },
  });

  const cadastrar = useMutation({
    mutationFn: async (input: CatalogoInsert) => {
      const { data, error } = await supabase.from('almox_catalogo_itens').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['almox-catalogo'] }); toast.success('Item cadastrado'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao cadastrar item'); },
  });

  const editar = useMutation({
    mutationFn: async ({ id, ...patch }: CatalogoUpdate & { id: string }) => {
      const { error } = await supabase.from('almox_catalogo_itens').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['almox-catalogo'] }); toast.success('Item atualizado'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao atualizar item'); },
  });

  const inativar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('almox_catalogo_itens').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['almox-catalogo'] }); toast.success('Item inativado'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao inativar item'); },
  });

  return { itens, isLoading, error, cadastrar, editar, inativar };
}
