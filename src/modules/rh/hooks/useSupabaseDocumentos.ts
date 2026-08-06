// @ts-nocheck
// rh_tipos_documento / rh_documentos ainda não estão em types.ts (criadas no Bloco 6).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TipoDocumento {
  id: string;
  nome: string;
  obrigatorio: boolean;
  exige_validade: boolean;
  sensivel: boolean;
}

export interface RhDocumento {
  id: string;
  pessoa_id: string;
  loja_id: string;
  tipo_documento_id?: string;
  storage_path: string;
  nome_arquivo?: string;
  status: 'pendente' | 'enviado' | 'validado' | 'rejeitado' | 'vencido';
  validade_ate?: string | null;
  created_at: string;
  pessoa?: { nome: string } | null;
  tipo?: { nome: string } | null;
}

export function useSupabaseDocumentos() {
  const qc = useQueryClient();

  const { data: tipos = [] } = useQuery({
    queryKey: ['rh-tipos-doc'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rh_tipos_documento').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data as TipoDocumento[];
    },
  });

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['rh-documentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_documentos')
        .select('*, pessoa:pessoas(nome), tipo:rh_tipos_documento(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RhDocumento[];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ pessoa, tipoId, validade, file }: { pessoa: any; tipoId: string; validade?: string; file: File }) => {
      const path = `${pessoa.lojaId}/${pessoa.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('rh-documentos').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('rh_documentos').insert([{
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        tipo_documento_id: tipoId || null,
        storage_path: path,
        nome_arquivo: file.name,
        tamanho_bytes: file.size,
        mime_type: file.type,
        status: 'enviado',
        validade_ate: validade || null,
      }]);
      if (insErr) throw insErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-documentos'] }),
  });

  const revisar = useMutation({
    mutationFn: async ({ id, status, motivo }: { id: string; status: 'validado' | 'rejeitado'; motivo?: string }) => {
      const { error } = await supabase
        .from('rh_documentos')
        .update({ status, motivo_rejeicao: motivo ?? null, validado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-documentos'] }),
  });

  return { tipos, documentos, isLoading, upload, revisar };
}
