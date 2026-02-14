import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEquipamentosStore } from './equipamentosStore';
import { 
  INVENTARIO_CFG, 
  type AcaoInventario, 
  type StatusDivergencia, 
  type StatusAjuste, 
  type MotivoAjuste,
  type TipoMovimento
} from '@/config/inventario';
import { generateDisplayNo, migrateSessions } from '@/lib/session-numbering';

// Types
export type StatusConferencia = 'ABERTA' | 'EM_CONTAGEM' | 'EM_REVISAO' | 'AJUSTADA' | 'FECHADA';
export type TipoFiltro = 'SERIE' | 'SALDO' | 'AMBOS';
export type StatusEquipamentoFiltro = 'DISPONIVEL' | 'RESERVADO' | 'EM_REVISAO' | 'MANUTENCAO';

export interface UserRef {
  id: string;
  nome: string;
  perfil?: string;
}

export interface FiltrosContagem {
  grupos?: string[];
  modelos?: string[];
  incluirStatus?: StatusEquipamentoFiltro[];
  tipo?: TipoFiltro;
}

export interface ContagemSessao {
  id: string;
  lojaId: string;
  displayNo?: string; // Número amigável: CE-LOJA-YYYYMMDD-SEQ
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
  codigo: string;  // SERIE: código interno único; SALDO: código do modelo
  descricao: string;
  grupoNome: string;
  modeloNome: string;
  qtdContada?: number | null;
  observacao?: string;
}

export interface AnexoInventario {
  id: string;
  nome: string;
  url?: string;
  blobBase64?: string;
}

export interface AprovacaoInventario {
  requeridoPor: 'sistema' | 'limiar' | 'perfil';
  aprovadoPor?: UserRef;
  aprovadoEm?: string;
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
  anexos?: AnexoInventario[];
  exigeAprovacao?: boolean;
  aprovacao?: AprovacaoInventario;
}

export interface AjusteInventario {
  id: string;
  sessaoId: string;
  lojaId: string;
  itemId: string;
  codigo: string;
  delta: number;
  motivo: MotivoAjuste;
  criadoEm: string;
  criadoPor: UserRef;
  status: StatusAjuste;
  observacao?: string;
}

export interface TarefaInvestigacao {
  id: string;
  sessaoId: string;
  lojaId: string;
  itemId: string;
  codigo: string;
  motivo: 'DIVERGENCIA' | 'CADASTRO' | 'OUTROS';
  responsavel?: UserRef;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  criadaEm: string;
  criadaPor: UserRef;
  observacao?: string;
}

export interface TicketManutencao {
  id: string;
  sessaoId: string;
  lojaId: string;
  itemId: string;
  codigo: string;
  tipo: 'VERIFICACAO' | 'AVARIA' | 'PERDA';
  status: 'ABERTO' | 'EM_EXECUCAO' | 'ENCERRADO';
  criadoEm: string;
  criadoPor: UserRef;
  nota?: string;
}

export interface LogContagem {
  id: string;
  evento: string;
  usuario: string;
  data: string;
  payload?: any;
}

export interface MovimentoEstoque {
  id: string;
  dataISO: string;
  lojaId: string;
  user: string;
  refId: string; // equipamento id ou modelo id
  tipo: TipoMovimento;
  quantidade: number;
  origem: 'CONTAGEM_CEGA';
  observacao?: string;
  aprovador?: string;
}

export interface AuditEntry {
  id: string;
  entidade: 'estoque';
  evento: 'ajuste_contagem';
  before: any;
  after: any;
  user: string;
  lojaId: string;
  dataISO: string;
}

interface ConferenciaState {
  sessoes: ContagemSessao[];
  itens: ContagemItem[];
  divergencias: Divergencia[];
  ajustes: AjusteInventario[];
  tarefas: TarefaInvestigacao[];
  tickets: TicketManutencao[];
  movimentos: MovimentoEstoque[];
  auditLogs: AuditEntry[];
  _cachedItens?: Record<string, ContagemItem[]>;
}

interface ConferenciaStore extends ConferenciaState {
  // Actions
  criarSessao: (filtros: FiltrosContagem, lojaId: string, usuario: UserRef, observacao?: string) => string;
  gerarItens: (sessaoId: string) => void;
  salvarContagem: (sessaoId: string, itemId: string, qtdContada: number | null, observacao?: string) => void;
  finalizarContagem: (sessaoId: string, usuario: UserRef) => void;
  calcularDivergencias: (sessaoId: string) => void;
  fecharSessao: (sessaoId: string, usuario: UserRef) => void;
  
  // New divergence resolution actions
  setJustificativa: (itemId: string, texto: string) => void;
  setAcao: (itemId: string, acao: AcaoInventario) => void;
  anexarArquivo: (itemId: string, arquivo: Omit<AnexoInventario, 'id'>) => void;
  removerAnexo: (itemId: string, anexoId: string) => void;
  avaliarLimiar: (itemId: string) => void;
  processarDivergencias: (sessaoId: string, usuario: UserRef) => void;
  aprovarAjustes: (sessaoId: string, ids: string[], aprovador: UserRef) => void;
  rejeitarAjustes: (sessaoId: string, ids: string[], aprovador: UserRef, motivo: string) => void;
  updateApprovalInfo: (itemId: string, aprovacao: AprovacaoInventario) => void;
  
  // Getters
  getSessao: (id: string) => ContagemSessao | undefined;
  getItensPorSessao: (sessaoId: string) => ContagemItem[];
  getDivergenciasPorSessao: (sessaoId: string) => Divergencia[];
  getAjustesPorSessao: (sessaoId: string) => AjusteInventario[];
  getTarefasPorSessao: (sessaoId: string) => TarefaInvestigacao[];
  getTicketsPorSessao: (sessaoId: string) => TicketManutencao[];
  resumoAjustes: (sessaoId: string) => {
    itensAjustados: number;
    somaPositiva: number;
    somaNegativa: number;
    valorFinanceiro?: number;
    topMotivos: string[];
  };
  canView: () => boolean;
  canEdit: () => boolean;
  addLog: (sessaoId: string, evento: string, usuario: string, payload?: any) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDateTime = () => new Date().toISOString();

const initialState: ConferenciaState = {
  sessoes: [],
  itens: [],
  divergencias: [],
  ajustes: [],
  tarefas: [],
  tickets: [],
  movimentos: [],
  auditLogs: [],
  _cachedItens: {}
};

export const useConferenciaStore = create<ConferenciaStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      criarSessao: (filtros, lojaId, usuario, observacao) => {
        const id = generateId();
        
        // Obter nome da loja para gerar displayNo
        const equipamentosStore = useEquipamentosStore.getState();
        const loja = equipamentosStore.lojas.find(l => l.id === lojaId);
        const lojaNome = loja?.nome || `Loja-${lojaId}`;
        
        // Gerar número amigável
        const displayNo = generateDisplayNo(lojaNome);
        
        const novaSessao: ContagemSessao = {
          id,
          lojaId,
          displayNo,
          status: 'ABERTA',
          criadaEm: formatDateTime(),
          criadaPor: usuario,
          observacao,
          filtros,
          log: []
        };

        set((state) => ({
          sessoes: [...state.sessoes, novaSessao]
        }));

        // Gerar itens automaticamente
        get().gerarItens(id);
        get().addLog(id, 'SESSAO_CRIADA', usuario.nome, { filtros, observacao });

        return id;
      },

      gerarItens: (sessaoId) => {
        const sessao = get().getSessao(sessaoId);
        if (!sessao) return;

        const equipamentosStore = useEquipamentosStore.getState();
        const { equipamentos, grupos, modelos } = equipamentosStore;

        const novosItens: ContagemItem[] = [];
        
        // Filtrar equipamentos da loja
        const equipamentosLoja = equipamentos.filter(eq => {
          // Verificar loja
          if (eq.tipo === 'SERIALIZADO') {
            if (eq.lojaAtualId !== sessao.lojaId) return false;
          } else {
            if (!eq.saldosPorLoja[sessao.lojaId] || eq.saldosPorLoja[sessao.lojaId].qtd === 0) return false;
          }

          // Aplicar filtros de tipo
          if (sessao.filtros.tipo === 'SERIE' && eq.tipo !== 'SERIALIZADO') return false;
          if (sessao.filtros.tipo === 'SALDO' && eq.tipo !== 'SALDO') return false;

          // Aplicar filtros de grupo/modelo
          if (sessao.filtros.grupos?.length && !sessao.filtros.grupos.includes(eq.grupoId)) return false;
          if (sessao.filtros.modelos?.length && !sessao.filtros.modelos.includes(eq.modeloId)) return false;

          // Aplicar filtros de status
          if (sessao.filtros.incluirStatus?.length && !sessao.filtros.incluirStatus.includes(eq.statusGlobal as any)) return false;

          return true;
        });

        // Para SERIE: 1 linha por equipamento
        // Para SALDO: 1 linha por modelo (agregar)
        const modelosProcessados = new Set<string>();
        
        equipamentosLoja.forEach(eq => {
          const modelo = modelos.find(m => m.id === eq.modeloId);
          const grupo = grupos.find(g => g.id === eq.grupoId);

          if (eq.tipo === 'SERIALIZADO') {
            novosItens.push({
              id: generateId(),
              sessaoId,
              lojaId: sessao.lojaId,
              tipo: 'SERIE',
              codigo: eq.id, // código interno único
              descricao: modelo?.nomeComercial || 'Modelo não encontrado',
              grupoNome: grupo?.nome || 'N/A',
              modeloNome: modelo?.nomeComercial || 'N/A',
              qtdContada: null,
              observacao: ''
            });
          } else if (eq.tipo === 'SALDO' && !modelosProcessados.has(eq.modeloId)) {
            modelosProcessados.add(eq.modeloId);
            novosItens.push({
              id: generateId(),
              sessaoId,
              lojaId: sessao.lojaId,
              tipo: 'SALDO',
              codigo: modelo?.id || eq.modeloId, // ID do modelo (código será gerado no backend)
              descricao: modelo?.nomeComercial || 'Modelo não encontrado',
              grupoNome: grupo?.nome || 'N/A',
              modeloNome: modelo?.nomeComercial || 'N/A',
              qtdContada: null,
              observacao: ''
            });
          }
        });

        set((state) => ({
          itens: [...state.itens.filter(i => i.sessaoId !== sessaoId), ...novosItens],
          _cachedItens: {} // Clear cache when items are modified
        }));
      },

      salvarContagem: (sessaoId, itemId, qtdContada, observacao) => {
        set((state) => ({
          itens: state.itens.map(item =>
            item.id === itemId
              ? { ...item, qtdContada, observacao }
              : item
          ),
          _cachedItens: {} // Clear cache when items are modified
        }));
      },

      finalizarContagem: (sessaoId, usuario) => {
        set((state) => ({
          sessoes: state.sessoes.map(s =>
            s.id === sessaoId
              ? { ...s, status: 'EM_REVISAO', finalizadaEm: formatDateTime() }
              : s
          )
        }));

        get().calcularDivergencias(sessaoId);
        get().addLog(sessaoId, 'CONTAGEM_FINALIZADA', usuario.nome);
      },

      calcularDivergencias: (sessaoId) => {
        const itens = get().getItensPorSessao(sessaoId);
        const equipamentosStore = useEquipamentosStore.getState();
        const { equipamentos, modelos } = equipamentosStore;
        
        const novasDivergencias: Divergencia[] = [];

        itens.forEach(item => {
          let qtdSistema = 0;
          
          if (item.tipo === 'SERIE') {
            // Para SERIE: verificar se o equipamento existe (0 ou 1)
            const equipamento = equipamentos.find(eq => eq.id === item.codigo && eq.lojaAtualId === item.lojaId);
            qtdSistema = equipamento ? 1 : 0;
          } else {
            // Para SALDO: somar saldo da loja por modelo (item.codigo agora é o ID do modelo)
            const modelo = modelos.find(m => m.id === item.codigo);
            if (modelo) {
              const equipamentosModelo = equipamentos.filter(eq => 
                eq.modeloId === modelo.id && 
                eq.tipo === 'SALDO' && 
                eq.saldosPorLoja[item.lojaId]
              );
              qtdSistema = equipamentosModelo.reduce((acc, eq) => 
                acc + (eq.saldosPorLoja[item.lojaId]?.qtd || 0), 0
              );
            }
          }

          const qtdContada = item.qtdContada || 0;
          const delta = qtdContada - qtdSistema;
          
          if (delta !== 0 || qtdContada !== qtdSistema) {
            const perc = qtdSistema > 0 ? Math.round((delta / qtdSistema) * 100) : 0;
            
            novasDivergencias.push({
              itemId: item.id,
              codigo: item.codigo,
              descricao: item.descricao,
              tipo: item.tipo,
              qtdSistema,
              qtdContada,
              delta,
              perc,
              justificativa: '',
              status: 'PENDENTE',
              anexos: []
            });
          }
        });

        set((state) => ({
          divergencias: [...state.divergencias.filter(d => 
            !itens.some(i => i.id === d.itemId)
          ), ...novasDivergencias]
        }));
      },

      gerarAjustes: (sessaoId, divergenciasComJustificativas, usuario) => {
        const novosAjustes: AjusteInventario[] = [];

        divergenciasComJustificativas.forEach(div => {
          if (div.delta !== 0) {
            novosAjustes.push({
              id: generateId(),
              sessaoId,
              lojaId: get().getSessao(sessaoId)?.lojaId || '',
              itemId: div.itemId,
              codigo: div.codigo,
              delta: div.delta,
              motivo: 'AJUSTE_CONTAGEM',
              status: 'APROVADO',
              criadoEm: formatDateTime(),
              criadoPor: usuario,
              observacao: div.justificativa
            });
          }
        });

        set((state) => ({
          ajustes: [...state.ajustes, ...novosAjustes],
          sessoes: state.sessoes.map(s =>
            s.id === sessaoId ? { ...s, status: 'AJUSTADA' } : s
          )
        }));

        get().addLog(sessaoId, 'AJUSTES_GERADOS', usuario.nome, { count: novosAjustes.length });
      },

      fecharSessao: (sessaoId, usuario) => {
        set((state) => ({
          sessoes: state.sessoes.map(s =>
            s.id === sessaoId ? { ...s, status: 'FECHADA' } : s
          )
        }));

        get().addLog(sessaoId, 'SESSAO_FECHADA', usuario.nome);
      },

      // Helpers
      getSessao: (id) => {
        return get().sessoes.find(s => s.id === id);
      },

      getItensPorSessao: (sessaoId) => {
        const state = get();
        const cached = state._cachedItens?.[sessaoId];
        const currentItens = state.itens.filter(i => i.sessaoId === sessaoId);
        
        // Return cached version if data hasn't changed
        if (cached && JSON.stringify(cached) === JSON.stringify(currentItens)) {
          return cached;
        }
        
        // Cache the new result
        state._cachedItens = { ...state._cachedItens, [sessaoId]: currentItens };
        return currentItens;
      },

      getDivergenciasPorSessao: (sessaoId) => {
        return get().divergencias.filter(d => 
          get().itens.some(i => i.id === d.itemId && i.sessaoId === sessaoId)
        );
      },

      // New divergence resolution actions
      setJustificativa: (itemId, texto) => {
        set((state) => ({
          divergencias: state.divergencias.map(d =>
            d.itemId === itemId ? { ...d, justificativa: texto } : d
          )
        }));
      },

      setAcao: (itemId, acao) => {
        set((state) => ({
          divergencias: state.divergencias.map(d =>
            d.itemId === itemId ? { ...d, acao } : d
          )
        }));
        get().avaliarLimiar(itemId);
      },

      anexarArquivo: (itemId, arquivo) => {
        const novoAnexo: AnexoInventario = {
          id: generateId(),
          ...arquivo
        };
        
        set((state) => ({
          divergencias: state.divergencias.map(d =>
            d.itemId === itemId 
              ? { ...d, anexos: [...(d.anexos || []), novoAnexo] }
              : d
          )
        }));
      },

      removerAnexo: (itemId, anexoId) => {
        set((state) => ({
          divergencias: state.divergencias.map(d =>
            d.itemId === itemId 
              ? { ...d, anexos: (d.anexos || []).filter(a => a.id !== anexoId) }
              : d
          )
        }));
      },

      avaliarLimiar: (itemId) => {
        const divergencia = get().divergencias.find(d => d.itemId === itemId);
        if (!divergencia) return;

        const deltaAbs = Math.abs(divergencia.delta);
        const percAbs = Math.abs(divergencia.perc);
        
        const exigeAprovacao = 
          percAbs >= (INVENTARIO_CFG.LIMIAR_PERC * 100) || 
          deltaAbs >= INVENTARIO_CFG.LIMIAR_UNIDADES;

        set((state) => ({
          divergencias: state.divergencias.map(d =>
            d.itemId === itemId 
              ? { 
                  ...d, 
                  exigeAprovacao,
                  aprovacao: exigeAprovacao ? { requeridoPor: 'limiar' } : undefined
                }
              : d
          )
        }));
      },

      processarDivergencias: (sessaoId, usuario) => {
        const divergencias = get().getDivergenciasPorSessao(sessaoId);
        const divergenciasComDelta = divergencias.filter(d => d.delta !== 0);
        
        // Validate all divergencies have justification and action
        const faltamDados = divergenciasComDelta.some(d => 
          !d.justificativa?.trim() || !d.acao
        );
        
        if (faltamDados) {
          throw new Error('Preencha justificativa e ação para todos os itens com divergência');
        }

        divergenciasComDelta.forEach(div => {
          if (!div.acao) return;
          
          switch (div.acao) {
            case 'AJUSTAR_ESTOQUE':
            case 'BAIXA_PATRIMONIAL':
              const novoAjuste: AjusteInventario = {
                id: generateId(),
                sessaoId,
                lojaId: get().getSessao(sessaoId)?.lojaId || '',
                itemId: div.itemId,
                codigo: div.codigo,
                delta: div.delta,
                motivo: div.acao === 'BAIXA_PATRIMONIAL' ? 'BAIXA' : 'AJUSTE_CONTAGEM',
                status: div.exigeAprovacao ? 'PROPOSTO' : 'APROVADO',
                criadoEm: formatDateTime(),
                criadoPor: usuario,
                observacao: div.justificativa
              };
              
              // Create movimento estoque
              const movimento: MovimentoEstoque = {
                id: generateId(),
                dataISO: formatDateTime(),
                lojaId: get().getSessao(sessaoId)?.lojaId || '',
                user: usuario.nome,
                refId: div.codigo,
                tipo: div.delta > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
                quantidade: Math.abs(div.delta),
                origem: 'CONTAGEM_CEGA',
                observacao: div.justificativa,
                aprovador: div.exigeAprovacao ? undefined : usuario.nome
              };
              
              // Create audit entry
              const auditEntry: AuditEntry = {
                id: generateId(),
                entidade: 'estoque',
                evento: 'ajuste_contagem',
                before: { quantidade: div.qtdSistema },
                after: { quantidade: div.qtdContada },
                user: usuario.nome,
                lojaId: get().getSessao(sessaoId)?.lojaId || '',
                dataISO: formatDateTime()
              };
              
              set((state) => ({
                ajustes: [...state.ajustes, novoAjuste],
                movimentos: [...state.movimentos, movimento],
                auditLogs: [...state.auditLogs, auditEntry]
              }));
              break;

            case 'INVESTIGAR':
              const novaTarefa: TarefaInvestigacao = {
                id: generateId(),
                sessaoId,
                lojaId: get().getSessao(sessaoId)?.lojaId || '',
                itemId: div.itemId,
                codigo: div.codigo,
                motivo: 'DIVERGENCIA',
                status: 'ABERTA',
                criadaEm: formatDateTime(),
                criadaPor: usuario,
                observacao: div.justificativa
              };
              
              set((state) => ({
                tarefas: [...state.tarefas, novaTarefa]
              }));
              break;
          }
        });

        // Update divergence status
        set((state) => ({
          divergencias: state.divergencias.map(d => {
            if (divergenciasComDelta.some(div => div.itemId === d.itemId)) {
              const novoStatus: StatusDivergencia = 
                d.acao === 'AJUSTAR_ESTOQUE' || d.acao === 'BAIXA_PATRIMONIAL'
                  ? (d.exigeAprovacao ? 'APROVACAO_PENDENTE' : 'AJUSTE_GERADO')
                  : 'EM_INVESTIGACAO';
              
              return { ...d, status: novoStatus };
            }
            return d;
          }),
          sessoes: state.sessoes.map(s =>
            s.id === sessaoId ? { ...s, status: 'AJUSTADA' } : s
          )
        }));

        get().addLog(sessaoId, 'DIVERGENCIAS_PROCESSADAS', usuario.nome, { 
          count: divergenciasComDelta.length 
        });
      },

      aprovarAjustes: (sessaoId, ids, aprovador) => {
        set((state) => ({
          ajustes: state.ajustes.map(a =>
            ids.includes(a.id) ? { ...a, status: 'APROVADO' } : a
          ),
          divergencias: state.divergencias.map(d => {
            const ajuste = state.ajustes.find(a => a.itemId === d.itemId && ids.includes(a.id));
            if (ajuste) {
              return {
                ...d,
                status: 'CONCLUIDO',
                aprovacao: {
                  ...d.aprovacao!,
                  aprovadoPor: aprovador,
                  aprovadoEm: formatDateTime()
                }
              };
            }
            return d;
          })
        }));

        get().addLog(sessaoId, 'AJUSTES_APROVADOS', aprovador.nome, { count: ids.length });
      },

      rejeitarAjustes: (sessaoId, ids, aprovador, motivo) => {
        set((state) => ({
          ajustes: state.ajustes.map(a =>
            ids.includes(a.id) ? { ...a, status: 'REJEITADO', observacao: motivo } : a
          ),
          divergencias: state.divergencias.map(d => {
            const ajuste = state.ajustes.find(a => a.itemId === d.itemId && ids.includes(a.id));
            if (ajuste) {
              return { ...d, status: 'PENDENTE' };
            }
            return d;
          })
        }));

        get().addLog(sessaoId, 'AJUSTES_REJEITADOS', aprovador.nome, { count: ids.length, motivo });
      },

      getAjustesPorSessao: (sessaoId) => {
        return get().ajustes.filter(a => a.sessaoId === sessaoId);
      },

      getTarefasPorSessao: (sessaoId) => {
        return get().tarefas.filter(t => t.sessaoId === sessaoId);
      },

      getTicketsPorSessao: (sessaoId) => {
        return get().tickets.filter(t => t.sessaoId === sessaoId);
      },

      resumoAjustes: (sessaoId) => {
        const ajustes = get().getAjustesPorSessao(sessaoId);
        const somaPositiva = ajustes.filter(a => a.delta > 0).reduce((acc, a) => acc + a.delta, 0);
        const somaNegativa = ajustes.filter(a => a.delta < 0).reduce((acc, a) => acc + Math.abs(a.delta), 0);
        
        const motivosCount = ajustes.reduce((acc, a) => {
          acc[a.motivo] = (acc[a.motivo] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topMotivos = Object.entries(motivosCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([motivo]) => motivo);

        return {
          itensAjustados: ajustes.length,
          somaPositiva,
          somaNegativa,
          topMotivos
        };
      },

      canView: () => {
        // Todos os perfis podem visualizar
        return true;
      },

      canEdit: () => {
        // Verificar se é admin ou gestor via localStorage (mock)
        const devProfile = localStorage.getItem('rh-dev-profile') || 'admin';
        return ['admin', 'gestor'].includes(devProfile);
      },

      addLog: (sessaoId, evento, usuario, payload) => {
        const novoLog: LogContagem = {
          id: generateId(),
          evento,
          usuario,
          data: formatDateTime(),
          payload
        };

        set((state) => ({
          sessoes: state.sessoes.map(s => 
            s.id === sessaoId 
              ? { ...s, log: [...s.log, novoLog] }
              : s
          )
        }));
      },

      updateApprovalInfo: (itemId, aprovacao) => {
        set((state) => ({
          divergencias: state.divergencias.map(d =>
            d.itemId === itemId ? { ...d, aprovacao } : d
          )
        }));
      }
    }),
    {
      name: 'conference-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Executar migração para adicionar displayNo nas sessões existentes
          const equipamentosStore = useEquipamentosStore.getState();
          const sessoesAtualizadas = migrateSessions(state.sessoes, equipamentosStore.lojas);
          
          if (sessoesAtualizadas !== state.sessoes) {
            // Atualizar as sessões com os displayNo gerados
            Object.assign(state, { sessoes: sessoesAtualizadas });
          }
        }
      }
    }
  )
);