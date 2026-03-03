// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CobrancaHistoryEvent } from '@/types/bolepix';

export interface CobrancaInter {
  id: string;
  titulo_id: string;
  loja_id: string;
  codigo_solicitacao?: string;
  status: 'DRAFT' | 'REQUESTED' | 'PROCESSING' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  idempotency_key: string;
  linha_digitavel?: string;
  codigo_barras?: string;
  pix_copia_cola?: string;
  qr_code_data_url?: string;
  pdf_url?: string;
  history: CobrancaHistoryEvent[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export function useSupabaseCobrancasInter(lojaId?: string, tituloId?: string) {
  const queryClient = useQueryClient();

  // Query para listar/buscar cobranças
  const { data: cobrancas, isLoading } = useQuery({
    queryKey: ['cobrancas-inter', lojaId, tituloId],
    queryFn: async () => {
      let query = supabase
        .from('cobrancas_inter')
        .select('*')
        .order('created_at', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      if (tituloId) {
        query = query.eq('titulo_id', tituloId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar cobranças:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        history: (item.history as any) || [],
      })) as CobrancaInter[];
    },
    enabled: !!lojaId || !!tituloId,
  });

  // Mutation para criar nova cobrança
  const createCobranca = useMutation({
    mutationFn: async (cobranca: Omit<CobrancaInter, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { data, error } = await supabase
        .from('cobrancas_inter')
        .insert({
          titulo_id: cobranca.titulo_id,
          loja_id: cobranca.loja_id,
          codigo_solicitacao: cobranca.codigo_solicitacao,
          status: cobranca.status,
          idempotency_key: cobranca.idempotency_key,
          linha_digitavel: cobranca.linha_digitavel,
          codigo_barras: cobranca.codigo_barras,
          pix_copia_cola: cobranca.pix_copia_cola,
          qr_code_data_url: cobranca.qr_code_data_url,
          pdf_url: cobranca.pdf_url,
          history: cobranca.history as any,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas-inter'] });
      toast.success('Cobrança criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar cobrança:', error);
      toast.error(error.message || 'Erro ao criar cobrança');
    },
  });

  // Mutation para atualizar status/dados da cobrança
  const updateCobranca = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<CobrancaInter, 'id' | 'created_at' | 'created_by'>> }) => {
      const updateData: any = { ...updates };
      if (updateData.history) {
        updateData.history = updateData.history as any;
      }
      
      const { data, error } = await supabase
        .from('cobrancas_inter')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas-inter'] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar cobrança:', error);
      toast.error(error.message || 'Erro ao atualizar cobrança');
    },
  });

  // Helper para adicionar evento no histórico
  const addHistoryEvent = useMutation({
    mutationFn: async ({ id, event }: { id: string; event: CobrancaHistoryEvent }) => {
      // Buscar cobrança atual
      const { data: current, error: fetchError } = await supabase
        .from('cobrancas_inter')
        .select('history')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentHistory = (current?.history as any || []) as CobrancaHistoryEvent[];
      const newHistory = [...currentHistory, event];

      // Atualizar com novo evento
      const { data, error } = await supabase
        .from('cobrancas_inter')
        .update({ history: newHistory as any })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas-inter'] });
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar evento:', error);
      toast.error(error.message || 'Erro ao adicionar evento ao histórico');
    },
  });

  return {
    cobrancas: cobrancas || [],
    isLoading,
    createCobranca,
    updateCobranca,
    addHistoryEvent,
  };
}
