import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HoleriteLote {
  id: string;
  empresa_id?: string;
  competencia: string;
  tipo: string;
  status: 'rascunho' | 'publicado' | 'despublicado';
  publicado_em?: string | null;
  total_colaboradores: number;
  created_at: string;
  holerites?: { count: number }[];
}

export function useSupabaseHolerites() {
  const qc = useQueryClient();

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['holerite-lotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holerite_lotes')
        .select('*, holerites(count)')
        .order('competencia', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HoleriteLote[];
    },
  });

  const criarLote = useMutation({
    mutationFn: async (input: { competencia: string; tipo: string }) => {
      const { data, error } = await supabase.from('holerite_lotes').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holerite-lotes'] }),
  });

  const publicarLote = useMutation({
    mutationFn: async ({ id, publicar }: { id: string; publicar: boolean }) => {
      const { error } = await supabase
        .from('holerite_lotes')
        .update({
          status: publicar ? 'publicado' : 'despublicado',
          publicado_em: publicar ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holerite-lotes'] }),
  });

  // sobe o PDF pro bucket ({loja}/{lote}/{pessoa}.pdf) e grava o metadado
  const uploadHolerite = useMutation({
    mutationFn: async ({ lote, pessoa, file }: { lote: HoleriteLote; pessoa: any; file: File }) => {
      const path = `${pessoa.lojaId}/${lote.id}/${pessoa.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('holerites')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('holerites').upsert(
        [{
          lote_id: lote.id,
          pessoa_id: pessoa.id,
          loja_id: pessoa.lojaId,
          competencia: lote.competencia,
          storage_path: path,
          nome_arquivo: file.name,
        }],
        { onConflict: 'lote_id,pessoa_id' },
      );
      if (insErr) throw insErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holerite-lotes'] }),
  });

  return { lotes, isLoading, criarLote, publicarLote, uploadHolerite };
}
