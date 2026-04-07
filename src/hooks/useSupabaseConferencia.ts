import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiunidade } from './useMultiunidade';
import { INVENTARIO_CFG, type AcaoInventario, type StatusDivergencia } from '@/config/inventario';
import { format } from 'date-fns';

// ---------- Types ----------
export type StatusConferencia = 'ABERTA' | 'EM_CONTAGEM' | 'EM_REVISAO' | 'AJUSTADA' | 'FECHADA';
export type TipoFiltro = 'SERIE' | 'SALDO' | 'AMBOS';

export interface UserRef {
  id: string;
  nome: string;
  perfil?: string;
}

export interface FiltrosContagem {
  grupos?: string[];
  modelos?: string[];
  incluirStatus?: string[];
  tipo?: TipoFiltro;
}

export interface LogContagem {
  id: string;
  evento: string;
  usuario: string;
  data: string;
  payload?: any;
}

export interface ContagemSessao {
  id: string;
  lojaId: string;
  displayNo?: string;
  status: StatusConferencia;
  criadaEm: string;
  criadaPor: UserRef;
  finalizadaEm?: string;
  observacao?: string;
  filtros: FiltrosContagem;
  log: LogContagem[];
}

export interface ContagemItem {
  id: string;
  sessaoId: string;
  lojaId: string;
  tipo: 'SERIE' | 'SALDO';
  codigo: string;
  descricao: string;
  grupoNome: string;
  modeloNome: string;
  qtdContada?: number | null;
  observacao?: string;
}

export interface Divergencia {
  itemId: string;
  codigo: string;
  descricao: string;
  tipo: 'SERIE' | 'SALDO';
  qtdSistema: number;
  qtdContada: number;
  delta: number;
  perc: number;
  justificativa?: string;
  acao?: AcaoInventario;
  status: StatusDivergencia;
  anexos?: any[];
  exigeAprovacao?: boolean;
  aprovacao?: any;
}

export interface AjusteInventario {
  id: string;
  sessaoId: string;
  itemId: string;
  delta: number;
  motivo: string;
  status: string;
  criadoPor: string;
  observacao?: string;
}

// ---------- Helpers ----------
function normalizeLoja(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 6)
    .toUpperCase();
}

function mapSessaoFromDb(row: any): ContagemSessao {
  const log = Array.isArray(row.log) ? row.log : [];
  const criadaPor = log.find((l: any) => l.evento === 'SESSAO_CRIADA');
  return {
    id: row.id,
    lojaId: row.loja_id,
    displayNo: row.display_no || undefined,
    status: row.status as StatusConferencia,
    criadaEm: row.created_at,
    criadaPor: {
      id: row.criada_por,
      nome: criadaPor?.usuario || 'Usuário',
    },
    finalizadaEm: row.finalizada_em || undefined,
    observacao: row.observacao || undefined,
    filtros: (row.filtros || {}) as FiltrosContagem,
    log: log as LogContagem[],
  };
}

function mapItemFromDb(row: any): ContagemItem {
  return {
    id: row.id,
    sessaoId: row.sessao_id,
    lojaId: row.loja_id,
    tipo: row.tipo as 'SERIE' | 'SALDO',
    codigo: row.codigo,
    descricao: row.descricao,
    grupoNome: row.grupo_nome,
    modeloNome: row.modelo_nome,
    qtdContada: row.qtd_contada,
    observacao: row.observacao || undefined,
  };
}

function mapDivergenciaFromDb(row: any): Divergencia {
  return {
    itemId: row.item_id,
    codigo: row.itens_contagem?.codigo || '',
    descricao: row.itens_contagem?.descricao || '',
    tipo: (row.itens_contagem?.tipo || 'SALDO') as 'SERIE' | 'SALDO',
    qtdSistema: row.qtd_sistema,
    qtdContada: row.qtd_contada,
    delta: row.delta,
    perc: Number(row.perc) || 0,
    justificativa: row.justificativa || undefined,
    acao: row.acao as AcaoInventario | undefined,
    status: row.status as StatusDivergencia,
    anexos: Array.isArray(row.anexos) ? row.anexos : [],
    exigeAprovacao: row.exige_aprovacao,
    aprovacao: row.aprovacao || undefined,
  };
}

// ---------- Hook ----------
export function useSupabaseConferencia() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user roles for canEdit
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles-conferencia', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user profile for name
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-conferencia', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_profiles')
        .select('*, pessoas(nome)')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const getUserRef = (): UserRef => {
    const nome = (userProfile?.pessoas as any)?.nome || user?.email || 'Usuário';
    return {
      id: user?.id || '',
      nome,
      perfil: userRoles[0] || 'user',
    };
  };

  const canEdit = (): boolean => {
    return userRoles.some(r => ['master', 'admin', 'gestor'].includes(r));
  };

  const canView = (): boolean => true;

  // ---- Queries ----

  const { data: sessoes = [], isLoading: loadingSessoes } = useQuery({
    queryKey: ['conferencia-sessoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes_contagem')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSessaoFromDb);
    },
  });

  const getSessao = (id: string): ContagemSessao | undefined => {
    return sessoes.find(s => s.id === id);
  };

  // Items query (fetches all, filtered client-side per session)
  const useItensPorSessao = (sessaoId: string) => {
    return useQuery({
      queryKey: ['conferencia-itens', sessaoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('itens_contagem')
          .select('*')
          .eq('sessao_id', sessaoId)
          .order('grupo_nome', { ascending: true });
        if (error) throw error;
        return (data || []).map(mapItemFromDb);
      },
      enabled: !!sessaoId,
    });
  };

  // Divergencias query
  const useDivergenciasPorSessao = (sessaoId: string) => {
    return useQuery({
      queryKey: ['conferencia-divergencias', sessaoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('divergencias_contagem')
          .select('*, itens_contagem(codigo, descricao, tipo)')
          .eq('sessao_id', sessaoId);
        if (error) throw error;
        return (data || []).map(mapDivergenciaFromDb);
      },
      enabled: !!sessaoId,
    });
  };

  // Ajustes query
  const useAjustesPorSessao = (sessaoId: string) => {
    return useQuery({
      queryKey: ['conferencia-ajustes', sessaoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('ajustes_contagem')
          .select('*')
          .eq('sessao_id', sessaoId);
        if (error) throw error;
        return (data || []).map((row: any): AjusteInventario => ({
          id: row.id,
          sessaoId: row.sessao_id,
          itemId: row.item_id,
          delta: row.delta,
          motivo: row.motivo || '',
          status: row.status,
          criadoPor: row.criado_por,
          observacao: row.observacao || undefined,
        }));
      },
      enabled: !!sessaoId,
    });
  };

  // ---- Mutations ----

  const criarSessao = useMutation({
    mutationFn: async ({ filtros, lojaId, observacao }: {
      filtros: FiltrosContagem;
      lojaId: string;
      observacao?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Get loja name for display_no
      const { data: loja } = await supabase
        .from('lojas')
        .select('nome')
        .eq('id', lojaId)
        .single();

      const lojaCodigo = normalizeLoja(loja?.nome || 'LOJA');
      const yyyymmdd = format(new Date(), 'yyyyMMdd');
      
      // Count existing sessions for this loja+date to generate seq
      const { count } = await supabase
        .from('sessoes_contagem')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', lojaId)
        .gte('created_at', new Date().toISOString().split('T')[0]);
      
      const seq = ((count || 0) + 1).toString().padStart(2, '0');
      const displayNo = `CE-${lojaCodigo}-${yyyymmdd}-${seq}`;

      const userRef = getUserRef();
      const logEntry: LogContagem = {
        id: crypto.randomUUID(),
        evento: 'SESSAO_CRIADA',
        usuario: userRef.nome,
        data: new Date().toISOString(),
        payload: { filtros, observacao },
      };

      // 1. Create session
      const { data: sessao, error: sessaoError } = await supabase
        .from('sessoes_contagem')
        .insert({
          loja_id: lojaId,
          display_no: displayNo,
          status: 'ABERTA',
          filtros: filtros as any,
          observacao: observacao || null,
          criada_por: user.id,
          log: [logEntry] as any,
        })
        .select()
        .single();

      if (sessaoError) throw sessaoError;

      // 2. Generate items from equipamentos table
      let query = supabase
        .from('equipamentos')
        .select('*, grupos_equipamentos(nome), modelos_equipamentos(nome_comercial)')
        .eq('ativo', true);

      // Filter by status
      if (filtros.incluirStatus?.length) {
        query = query.in('status_global', filtros.incluirStatus);
      }
      // Filter by groups
      if (filtros.grupos?.length) {
        query = query.in('grupo_id', filtros.grupos);
      }
      // Filter by models
      if (filtros.modelos?.length) {
        query = query.in('modelo_id', filtros.modelos);
      }

      const { data: equipamentos, error: eqError } = await query;
      if (eqError) throw eqError;

      // Filter by loja
      const equipamentosLoja = (equipamentos || []).filter((eq: any) => {
        if (eq.tipo === 'SERIALIZADO') {
          return eq.loja_atual_id === lojaId;
        } else {
          const saldos = (eq.saldos_por_loja || {}) as Record<string, { qtd: number }>;
          return (saldos[lojaId]?.qtd || 0) > 0;
        }
      });

      // Filter by tipo
      const filteredByTipo = equipamentosLoja.filter((eq: any) => {
        if (filtros.tipo === 'SERIE' && eq.tipo !== 'SERIALIZADO') return false;
        if (filtros.tipo === 'SALDO' && eq.tipo !== 'SALDO') return false;
        return true;
      });

      // Generate items
      const itensToInsert: any[] = [];
      const modelosProcessados = new Set<string>();

      for (const eq of filteredByTipo) {
        const grupoNome = (eq.grupos_equipamentos as any)?.nome || 'N/A';
        const modeloNome = (eq.modelos_equipamentos as any)?.nome_comercial || 'N/A';

        if (eq.tipo === 'SERIALIZADO') {
          itensToInsert.push({
            sessao_id: sessao.id,
            loja_id: lojaId,
            tipo: 'SERIE',
            codigo: eq.codigo_interno,
            descricao: modeloNome,
            grupo_nome: grupoNome,
            modelo_nome: modeloNome,
          });
        } else if (eq.tipo === 'SALDO' && !modelosProcessados.has(eq.modelo_id)) {
          modelosProcessados.add(eq.modelo_id);
          itensToInsert.push({
            sessao_id: sessao.id,
            loja_id: lojaId,
            tipo: 'SALDO',
            codigo: eq.modelo_id,
            descricao: modeloNome,
            grupo_nome: grupoNome,
            modelo_nome: modeloNome,
          });
        }
      }

      if (itensToInsert.length > 0) {
        const { error: itensError } = await supabase
          .from('itens_contagem')
          .insert(itensToInsert);
        if (itensError) throw itensError;
      }

      return sessao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conferencia-sessoes'] });
    },
  });

  const salvarContagem = useMutation({
    mutationFn: async ({ itemId, qtdContada, observacao }: {
      itemId: string;
      qtdContada: number | null;
      observacao?: string;
    }) => {
      const { error } = await supabase
        .from('itens_contagem')
        .update({
          qtd_contada: qtdContada,
          observacao: observacao || null,
        })
        .eq('id', itemId);
      if (error) throw error;
    },
  });

  const salvarContagemBatch = useMutation({
    mutationFn: async (items: Array<{ itemId: string; qtdContada: number | null; observacao?: string }>) => {
      // Batch update - do them in parallel
      const promises = items.map(item =>
        supabase
          .from('itens_contagem')
          .update({
            qtd_contada: item.qtdContada,
            observacao: item.observacao || null,
          })
          .eq('id', item.itemId)
      );
      const results = await Promise.all(promises);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
  });

  const finalizarContagem = useMutation({
    mutationFn: async ({ sessaoId }: { sessaoId: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const userRef = getUserRef();

      // 1. Get session
      const { data: sessaoRow, error: sErr } = await supabase
        .from('sessoes_contagem')
        .select('*')
        .eq('id', sessaoId)
        .single();
      if (sErr) throw sErr;

      // 2. Get items
      const { data: itensRows, error: iErr } = await supabase
        .from('itens_contagem')
        .select('*')
        .eq('sessao_id', sessaoId);
      if (iErr) throw iErr;

      // 3. Get equipamentos for system quantities
      const { data: equipamentos, error: eErr } = await supabase
        .from('equipamentos')
        .select('*')
        .eq('ativo', true);
      if (eErr) throw eErr;

      // 4. Calculate divergences
      const divergencias: any[] = [];
      const lojaId = sessaoRow.loja_id;

      for (const item of (itensRows || [])) {
        let qtdSistema = 0;

        if (item.tipo === 'SERIE') {
          // Find equipment by codigo_interno in loja
          const eq = equipamentos?.find(
            (e: any) => e.codigo_interno === item.codigo && e.loja_atual_id === lojaId
          );
          qtdSistema = eq ? 1 : 0;
        } else {
          // SALDO: sum saldos_por_loja for this modelo_id
          const eqsModelo = equipamentos?.filter(
            (e: any) => e.modelo_id === item.codigo && e.tipo === 'SALDO'
          ) || [];
          qtdSistema = eqsModelo.reduce((acc: number, e: any) => {
            const saldos = (e.saldos_por_loja || {}) as Record<string, { qtd: number }>;
            return acc + (saldos[lojaId]?.qtd || 0);
          }, 0);
        }

        const qtdContada = item.qtd_contada || 0;
        const delta = qtdContada - qtdSistema;
        const perc = qtdSistema > 0 ? Math.round((delta / qtdSistema) * 100) : 0;

        divergencias.push({
          sessao_id: sessaoId,
          item_id: item.id,
          qtd_sistema: qtdSistema,
          qtd_contada: qtdContada,
          delta,
          perc,
          status: 'PENDENTE',
        });
      }

      // 5. Insert divergences
      if (divergencias.length > 0) {
        const { error: dErr } = await supabase
          .from('divergencias_contagem')
          .insert(divergencias);
        if (dErr) throw dErr;
      }

      // 6. Update session status
      const logEntry: LogContagem = {
        id: crypto.randomUUID(),
        evento: 'CONTAGEM_FINALIZADA',
        usuario: userRef.nome,
        data: new Date().toISOString(),
      };

      const currentLog = Array.isArray(sessaoRow.log) ? sessaoRow.log : [];
      const { error: uErr } = await supabase
        .from('sessoes_contagem')
        .update({
          status: 'EM_REVISAO',
          finalizada_em: new Date().toISOString(),
          log: [...currentLog, logEntry] as any,
        })
        .eq('id', sessaoId);
      if (uErr) throw uErr;
    },
    onSuccess: (_, { sessaoId }) => {
      queryClient.invalidateQueries({ queryKey: ['conferencia-sessoes'] });
      queryClient.invalidateQueries({ queryKey: ['conferencia-itens', sessaoId] });
      queryClient.invalidateQueries({ queryKey: ['conferencia-divergencias', sessaoId] });
    },
  });

  const setJustificativa = useMutation({
    mutationFn: async ({ sessaoId, itemId, texto }: { sessaoId: string; itemId: string; texto: string }) => {
      const { error } = await supabase
        .from('divergencias_contagem')
        .update({ justificativa: texto })
        .eq('item_id', itemId)
        .eq('sessao_id', sessaoId);
      if (error) throw error;
    },
    onSuccess: (_, { sessaoId }) => {
      queryClient.invalidateQueries({ queryKey: ['conferencia-divergencias', sessaoId] });
    },
  });

  const setAcao = useMutation({
    mutationFn: async ({ sessaoId, itemId, acao }: { sessaoId: string; itemId: string; acao: AcaoInventario }) => {
      // Also evaluate threshold
      const { data: div } = await supabase
        .from('divergencias_contagem')
        .select('*')
        .eq('item_id', itemId)
        .eq('sessao_id', sessaoId)
        .single();

      const deltaAbs = Math.abs(div?.delta || 0);
      const percAbs = Math.abs(Number(div?.perc) || 0);
      const exigeAprovacao =
        percAbs >= (INVENTARIO_CFG.LIMIAR_PERC * 100) ||
        deltaAbs >= INVENTARIO_CFG.LIMIAR_UNIDADES;

      const { error } = await supabase
        .from('divergencias_contagem')
        .update({
          acao,
          exige_aprovacao: exigeAprovacao,
          aprovacao: exigeAprovacao ? { requeridoPor: 'limiar' } : null,
        })
        .eq('item_id', itemId)
        .eq('sessao_id', sessaoId);
      if (error) throw error;
    },
    onSuccess: (_, { sessaoId }) => {
      queryClient.invalidateQueries({ queryKey: ['conferencia-divergencias', sessaoId] });
    },
  });

  const processarDivergencias = useMutation({
    mutationFn: async ({ sessaoId }: { sessaoId: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const userRef = getUserRef();

      // Get divergences with delta != 0
      const { data: divs, error: dErr } = await supabase
        .from('divergencias_contagem')
        .select('*, itens_contagem(codigo)')
        .eq('sessao_id', sessaoId)
        .neq('delta', 0);
      if (dErr) throw dErr;

      // Validate
      const faltamDados = (divs || []).some(
        (d: any) => !d.justificativa?.trim() || !d.acao
      );
      if (faltamDados) {
        throw new Error('Preencha justificativa e ação para todos os itens com divergência');
      }

      // Create ajustes for AJUSTAR_ESTOQUE and BAIXA_PATRIMONIAL
      const ajustes: any[] = [];
      const statusUpdates: Array<{ itemId: string; status: StatusDivergencia }> = [];

      for (const div of (divs || [])) {
        if (div.acao === 'AJUSTAR_ESTOQUE' || div.acao === 'BAIXA_PATRIMONIAL') {
          ajustes.push({
            sessao_id: sessaoId,
            item_id: div.item_id,
            delta: div.delta,
            motivo: div.acao === 'BAIXA_PATRIMONIAL' ? 'BAIXA' : 'AJUSTE_CONTAGEM',
            status: div.exige_aprovacao ? 'PROPOSTO' : 'APROVADO',
            criado_por: user.id,
            observacao: div.justificativa,
          });
          statusUpdates.push({
            itemId: div.item_id,
            status: div.exige_aprovacao ? 'APROVACAO_PENDENTE' : 'AJUSTE_GERADO',
          });
        } else if (div.acao === 'INVESTIGAR') {
          statusUpdates.push({
            itemId: div.item_id,
            status: 'EM_INVESTIGACAO',
          });
        }
      }

      // Insert ajustes
      if (ajustes.length > 0) {
        const { error: aErr } = await supabase
          .from('ajustes_contagem')
          .insert(ajustes);
        if (aErr) throw aErr;
      }

      // Update divergence statuses
      for (const upd of statusUpdates) {
        await supabase
          .from('divergencias_contagem')
          .update({ status: upd.status })
          .eq('item_id', upd.itemId)
          .eq('sessao_id', sessaoId);
      }

      // Update session status
      const { data: sessaoRow } = await supabase
        .from('sessoes_contagem')
        .select('log')
        .eq('id', sessaoId)
        .single();

      const currentLog = Array.isArray(sessaoRow?.log) ? sessaoRow.log : [];
      const logEntry: LogContagem = {
        id: crypto.randomUUID(),
        evento: 'DIVERGENCIAS_PROCESSADAS',
        usuario: userRef.nome,
        data: new Date().toISOString(),
        payload: { count: (divs || []).length },
      };

      await supabase
        .from('sessoes_contagem')
        .update({
          status: 'AJUSTADA',
          log: [...currentLog, logEntry] as any,
        })
        .eq('id', sessaoId);
    },
    onSuccess: (_, { sessaoId }) => {
      queryClient.invalidateQueries({ queryKey: ['conferencia-sessoes'] });
      queryClient.invalidateQueries({ queryKey: ['conferencia-divergencias', sessaoId] });
      queryClient.invalidateQueries({ queryKey: ['conferencia-ajustes', sessaoId] });
    },
  });

  const fecharSessao = useMutation({
    mutationFn: async ({ sessaoId }: { sessaoId: string }) => {
      const userRef = getUserRef();
      const { data: sessaoRow } = await supabase
        .from('sessoes_contagem')
        .select('log')
        .eq('id', sessaoId)
        .single();

      const currentLog = Array.isArray(sessaoRow?.log) ? sessaoRow.log : [];
      const logEntry: LogContagem = {
        id: crypto.randomUUID(),
        evento: 'SESSAO_FECHADA',
        usuario: userRef.nome,
        data: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sessoes_contagem')
        .update({
          status: 'FECHADA',
          log: [...currentLog, logEntry] as any,
        })
        .eq('id', sessaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conferencia-sessoes'] });
    },
  });

  // Resumo helper (computed from ajustes data)
  const getResumoAjustes = (ajustes: AjusteInventario[]) => {
    const somaPositiva = ajustes.filter(a => a.delta > 0).reduce((acc, a) => acc + a.delta, 0);
    const somaNegativa = ajustes.filter(a => a.delta < 0).reduce((acc, a) => acc + Math.abs(a.delta), 0);
    const motivosCount = ajustes.reduce((acc, a) => {
      acc[a.motivo] = (acc[a.motivo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topMotivos = Object.entries(motivosCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([motivo]) => motivo);

    return { itensAjustados: ajustes.length, somaPositiva, somaNegativa, topMotivos };
  };

  return {
    // Data
    sessoes,
    loadingSessoes,
    getSessao,

    // Query hooks (call within components)
    useItensPorSessao,
    useDivergenciasPorSessao,
    useAjustesPorSessao,

    // Mutations
    criarSessao,
    salvarContagem,
    salvarContagemBatch,
    finalizarContagem,
    setJustificativa,
    setAcao,
    processarDivergencias,
    fecharSessao,

    // Helpers
    canEdit,
    canView,
    getUserRef,
    getResumoAjustes,
  };
}
