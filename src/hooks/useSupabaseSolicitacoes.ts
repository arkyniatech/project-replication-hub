// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  SolicitacaoManutencao,
  SolicitacaoCompleta,
  CriarSolicitacaoDTO,
  MudarStatusDTO,
  RegistrarLaudoDTO,
  CriarOSDTO,
  AplicarSubstituicaoDTO,
  FiltrosSolicitacao,
} from '@/types/solicitacao-manutencao';

/**
 * Hook principal para gerenciar Solicitações de Manutenção via Supabase
 */
export function useSupabaseSolicitacoes(filtros?: FiltrosSolicitacao) {
  const queryClient = useQueryClient();

  // Query: Listar solicitações
  const { data: solicitacoes, isLoading, error } = useQuery({
    queryKey: ['solicitacoes-manutencao', filtros],
    queryFn: async () => {
      let query = supabase
        .from('solicitacao_manutencao')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros?.loja_id) {
        query = query.eq('loja_id', filtros.loja_id);
      }

      if (filtros?.status) {
        if (Array.isArray(filtros.status)) {
          query = query.in('status', filtros.status);
        } else {
          query = query.eq('status', filtros.status);
        }
      }

      if (filtros?.prioridade) {
        if (Array.isArray(filtros.prioridade)) {
          query = query.in('prioridade', filtros.prioridade);
        } else {
          query = query.eq('prioridade', filtros.prioridade);
        }
      }

      if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }

      if (filtros?.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id);
      }

      if (filtros?.contrato_id) {
        query = query.eq('contrato_id', filtros.contrato_id);
      }

      if (filtros?.data_inicio) {
        query = query.gte('created_at', filtros.data_inicio);
      }

      if (filtros?.data_fim) {
        query = query.lte('created_at', filtros.data_fim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SolicitacaoManutencao[];
    },
  });

  // Query: Buscar solicitação por ID com relacionamentos
  const useSolicitacao = (id: string) => {
    return useQuery({
      queryKey: ['solicitacao-manutencao', id],
      queryFn: async () => {
        // Buscar cabeçalho
        const { data: solicitacao, error: solicitacaoError } = await supabase
          .from('solicitacao_manutencao')
          .select('*')
          .eq('id', id)
          .single();

        if (solicitacaoError) throw solicitacaoError;

        // Buscar itens
        const { data: itens, error: itensError } = await supabase
          .from('solicitacao_item')
          .select('*')
          .eq('solicitacao_id', id);

        if (itensError) throw itensError;

        // Buscar timeline
        const { data: timeline, error: timelineError } = await supabase
          .from('solicitacao_timeline')
          .select('*')
          .eq('solicitacao_id', id)
          .order('ts', { ascending: false });

        if (timelineError) throw timelineError;

        // Buscar anexos
        const { data: anexos, error: anexosError } = await supabase
          .from('solicitacao_anexo')
          .select('*')
          .eq('solicitacao_id', id)
          .order('created_at', { ascending: false });

        if (anexosError) throw anexosError;

        return {
          ...solicitacao,
          itens: itens || [],
          timeline: timeline || [],
          anexos: anexos || [],
        } as SolicitacaoCompleta;
      },
      enabled: !!id,
    });
  };

  // Mutation: Criar solicitação
  const criarSolicitacao = useMutation({
    mutationFn: async (dto: CriarSolicitacaoDTO) => {
      const { data, error } = await supabase.rpc('rpc_criar_solicitacao', {
        p: dto as any,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-manutencao'] });
      toast.success('Solicitação criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar solicitação:', error);
      toast.error(`Erro ao criar solicitação: ${error.message}`);
    },
  });

  // Mutation: Mudar status
  const mudarStatus = useMutation({
    mutationFn: async (dto: MudarStatusDTO) => {
      const { error } = await supabase.rpc('rpc_mudar_status', {
        p: dto as any,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-manutencao'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacao-manutencao', variables.id] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao mudar status:', error);
      toast.error(`Erro ao mudar status: ${error.message}`);
    },
  });

  // Mutation: Registrar laudo
  const registrarLaudo = useMutation({
    mutationFn: async (dto: RegistrarLaudoDTO) => {
      const { error } = await supabase.rpc('rpc_registrar_laudo', {
        p: dto as any,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-manutencao'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacao-manutencao', variables.id] });
      toast.success('Laudo registrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar laudo:', error);
      toast.error(`Erro ao registrar laudo: ${error.message}`);
    },
  });

  // Mutation: Criar OS
  const criarOS = useMutation({
    mutationFn: async (dto: CriarOSDTO) => {
      const { data, error } = await supabase.rpc('rpc_criar_os_de_solicitacao', {
        p: dto as any,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-manutencao'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacao-manutencao', variables.id] });
      toast.success('OS criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar OS:', error);
      toast.error(`Erro ao criar OS: ${error.message}`);
    },
  });

  // Mutation: Aplicar substituição
  const aplicarSubstituicao = useMutation({
    mutationFn: async (dto: AplicarSubstituicaoDTO) => {
      const { error } = await supabase.rpc('rpc_aplicar_substituicao', {
        p: dto as any,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-manutencao'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacao-manutencao', variables.id] });
      toast.success('Substituição aplicada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao aplicar substituição:', error);
      toast.error(`Erro ao aplicar substituição: ${error.message}`);
    },
  });

  // Mutation: Upload de anexo
  const uploadAnexo = useMutation({
    mutationFn: async ({
      solicitacaoId,
      file,
      tipo,
    }: {
      solicitacaoId: string;
      file: File;
      tipo: 'FOTO' | 'DOC';
    }) => {
      // 1. Upload para Storage
      const solicitacao = await supabase
        .from('solicitacao_manutencao')
        .select('loja_id')
        .eq('id', solicitacaoId)
        .single();

      if (solicitacao.error) throw solicitacao.error;

      const lojaId = solicitacao.data.loja_id;
      const fileName = `${Date.now()}-${file.name}`;
      const path = `${lojaId}/${solicitacaoId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('manutencao-anexos')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // 2. Criar registro de anexo
      const { error: insertError } = await supabase
        .from('solicitacao_anexo')
        .insert({
          solicitacao_id: solicitacaoId,
          nome: file.name,
          tipo,
          path,
          size_bytes: file.size,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        });

      if (insertError) throw insertError;

      return path;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['solicitacao-manutencao', variables.solicitacaoId],
      });
      toast.success('Anexo enviado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao enviar anexo:', error);
      toast.error(`Erro ao enviar anexo: ${error.message}`);
    },
  });

  return {
    // Queries
    solicitacoes: solicitacoes || [],
    isLoading,
    error,
    useSolicitacao,

    // Mutations
    criarSolicitacao: criarSolicitacao.mutateAsync,
    isCriando: criarSolicitacao.isPending,

    mudarStatus: mudarStatus.mutateAsync,
    isMudandoStatus: mudarStatus.isPending,

    registrarLaudo: registrarLaudo.mutateAsync,
    isRegistrandoLaudo: registrarLaudo.isPending,

    criarOS: criarOS.mutateAsync,
    isCriandoOS: criarOS.isPending,

    aplicarSubstituicao: aplicarSubstituicao.mutateAsync,
    isAplicandoSubstituicao: aplicarSubstituicao.isPending,

    uploadAnexo: uploadAnexo.mutateAsync,
    isUploadingAnexo: uploadAnexo.isPending,
  };
}
