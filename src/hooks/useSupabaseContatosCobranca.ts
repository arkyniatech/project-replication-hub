import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseContatosCobranca(lojaId?: string, clienteId?: string, tituloId?: string) {
  const queryClient = useQueryClient();

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ['contatos-cobranca', lojaId, clienteId, tituloId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('contatos_cobranca')
        .select('*, cliente:clientes(*), titulo:titulos(*)')
        .order('data', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      if (tituloId) {
        query = query.eq('titulo_id', tituloId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar contatos de cobrança:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!lojaId || !!clienteId || !!tituloId,
  });

  const createContato = useMutation({
    mutationFn: async (contato: any) => {
      const { data, error } = await (supabase as any)
        .from('contatos_cobranca')
        .insert(contato)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos-cobranca'] });
      toast.success('Contato registrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar contato:', error);
      toast.error(error.message || 'Erro ao criar contato');
    },
  });

  return {
    contatos,
    isLoading,
    createContato,
  };
}
