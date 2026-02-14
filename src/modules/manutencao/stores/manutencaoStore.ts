import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EquipOficina,
  OSOficina,
  ProdDia,
  ChecklistTemplate,
  AreaOficina,
  StatusEstoque,
  StatusOS,
  ChecklistExec,
  PedidoPecas,
  OSEvento,
  EventBusEvent,
  Prioridade,
  ClassDefeito
} from '../types';

interface ManutencaoState {
  // Data
  equipamentos: EquipOficina[];
  ordens: OSOficina[];
  produtividade: ProdDia[];
  templates: ChecklistTemplate[];
  
  // Event bus
  eventBus: EventBusEvent[];
  
  // Actions - Equipamentos
  adicionarEquipamento: (equip: EquipOficina) => void;
  moverEquipamentoArea: (equipId: string, novaArea: AreaOficina) => void;
  atualizarStatusEstoque: (equipId: string, status: StatusEstoque) => void;
  
  // Actions - OS
  criarOS: (equipamentoId: string, tipo?: 'PREVENTIVA' | 'CORRETIVA') => string;
  atualizarOS: (id: string, updates: Partial<OSOficina>) => void;
  registrarChecklist: (osId: string, checklist: ChecklistExec) => void;
  moverArea: (osId: string, novaArea: AreaOficina) => void;
  
  // Actions - Pedido de Peças
  criarPedidoPecas: (osId: string, pedido: Partial<PedidoPecas>) => void;
  atualizarPedidoPecas: (osId: string, updates: Partial<PedidoPecas>) => void;
  finalizarPedido: (osId: string) => void;
  receberPecas: (osId: string, tipo: 'PARCIAL' | 'TOTAL') => void;
  
  // Actions - Liberação
  liberarParaVerde: (osId: string) => boolean;
  
  // Actions - Event Bus
  publishEvent: (type: string, payload: any) => void;
  subscribeToEvent: (type: string, callback: (event: EventBusEvent) => void) => () => void;
  
  // Selectors
  getEquipamentosByArea: (area: AreaOficina) => EquipOficina[];
  getOSByEquipamento: (equipId: string) => OSOficina | undefined;
  getKPIsByArea: () => Record<AreaOficina, { total: number; criticos: number; slaMedia: number }>;
  getProdutividadeToday: () => ProdDia | null;
  getProdutividadeWeek: () => ProdDia[];
  getProdutividadeMonth: () => ProdDia[];
  
  // Utils
  seedData: () => void;
}

const useManutencaoStore = create<ManutencaoState>()(
  persist(
    (set, get) => ({
      equipamentos: [],
      ordens: [],
      produtividade: [],
      templates: [],
      eventBus: [],
      
      adicionarEquipamento: (equip) =>
        set((state) => ({
          equipamentos: [...state.equipamentos, equip],
        })),
      
      moverEquipamentoArea: (equipId, novaArea) =>
        set((state) => ({
          equipamentos: state.equipamentos.map((e) =>
            e.id === equipId
              ? { ...e, areaOficina: novaArea, timestamps: { ...e.timestamps, updatedAt: new Date().toISOString() } }
              : e
          ),
        })),
      
      atualizarStatusEstoque: (equipId, status) =>
        set((state) => ({
          equipamentos: state.equipamentos.map((e) =>
            e.id === equipId ? { ...e, statusEstoque: status } : e
          ),
        })),
      
      criarOS: (equipamentoId, tipo = 'PREVENTIVA') => {
        const osId = `OS-${Date.now()}`;
        const agora = new Date().toISOString();
        
        const novaOS: OSOficina = {
          id: osId,
          equipamentoId,
          tipo,
          origem: 'POS_LOCACAO',
          prioridade: 'MEDIA',
          SLA_horas: 24,
          status: 'EM_ANALISE',
          areaAtual: 'AMARELA',
          timeline: [
            {
              id: `evt-${Date.now()}`,
              ts: agora,
              user: 'admin',
              action: 'OS_CRIADA',
              payload: { tipo, origem: 'POS_LOCACAO' }
            }
          ]
        };
        
        set((state) => ({
          ordens: [...state.ordens, novaOS],
        }));
        
        return osId;
      },
      
      atualizarOS: (id, updates) =>
        set((state) => {
          const agora = new Date().toISOString();
          return {
            ordens: state.ordens.map((os) =>
              os.id === id
                ? {
                    ...os,
                    ...updates,
                    timeline: [
                      ...os.timeline,
                      {
                        id: `evt-${Date.now()}`,
                        ts: agora,
                        user: 'admin',
                        action: 'OS_ATUALIZADA',
                        payload: updates
                      }
                    ]
                  }
                : os
            ),
          };
        }),
      
      registrarChecklist: (osId, checklist) =>
        set((state) => {
          const agora = new Date().toISOString();
          return {
            ordens: state.ordens.map((os) =>
              os.id === osId
                ? {
                    ...os,
                    checklist,
                    timeline: [
                      ...os.timeline,
                      {
                        id: `evt-${Date.now()}`,
                        ts: agora,
                        user: 'admin',
                        action: 'CHECKLIST_REGISTRADO',
                        payload: { resultado: checklist.resultado, tipo: checklist.tipo }
                      }
                    ]
                  }
                : os
            ),
          };
        }),
      
      moverArea: (osId, novaArea) => {
        const { atualizarOS, moverEquipamentoArea } = get();
        const os = get().ordens.find(o => o.id === osId);
        
        if (os) {
          // Atualiza a OS
          atualizarOS(osId, { areaAtual: novaArea });
          
          // Move o equipamento
          moverEquipamentoArea(os.equipamentoId, novaArea);
          
          // Publica evento
          get().publishEvent('manutencao:areaMovida', {
            osId,
            equipamentoId: os.equipamentoId,
            de: os.areaAtual,
            para: novaArea
          });
        }
      },
      
      criarPedidoPecas: (osId, pedido) =>
        set((state) => {
          const pedidoCompleto: PedidoPecas = {
            id: `PED-${Date.now()}`,
            osId,
            itens: [],
            status: 'RASCUNHO',
            ...pedido
          };
          
          const agora = new Date().toISOString();
          
          return {
            ordens: state.ordens.map((os) =>
              os.id === osId
                ? {
                    ...os,
                    pedido: pedidoCompleto,
                    timeline: [
                      ...os.timeline,
                      {
                        id: `evt-${Date.now()}`,
                        ts: agora,
                        user: 'admin',
                        action: 'PEDIDO_CRIADO',
                        payload: { pedidoId: pedidoCompleto.id }
                      }
                    ]
                  }
                : os
            ),
          };
        }),
      
      atualizarPedidoPecas: (osId, updates) =>
        set((state) => {
          const agora = new Date().toISOString();
          
          return {
            ordens: state.ordens.map((os) =>
              os.id === osId && os.pedido
                ? {
                    ...os,
                    pedido: { ...os.pedido, ...updates },
                    timeline: [
                      ...os.timeline,
                      {
                        id: `evt-${Date.now()}`,
                        ts: agora,
                        user: 'admin',
                        action: 'PEDIDO_ATUALIZADO',
                        payload: updates
                      }
                    ]
                  }
                : os
            ),
          };
        }),
      
      finalizarPedido: (osId) => {
        const { atualizarPedidoPecas, moverArea } = get();
        const os = get().ordens.find(o => o.id === osId);
        
        atualizarPedidoPecas(osId, { status: 'FINALIZADO' });
        
        // Move para AZUL se estava em AMARELA ou VERMELHA
        if (os && ['AMARELA', 'VERMELHA'].includes(os.areaAtual)) {
          moverArea(osId, 'AZUL');
        }
      },
      
      receberPecas: (osId, tipo) => {
        const { atualizarPedidoPecas } = get();
        const agora = new Date().toISOString();
        
        atualizarPedidoPecas(osId, {
          status: tipo,
          ...(tipo === 'TOTAL' ? { dtRecebidaTotal: agora } : {})
        });
      },
      
      liberarParaVerde: (osId) => {
        const os = get().ordens.find(o => o.id === osId);
        
        if (!os?.checklist) return false;
        
        // Validações
        const itensCriticosOk = os.checklist.itens
          .filter(item => item.critico)
          .every(item => item.ok === true);
        
        const testeOk = os.checklist.testeMinOk;
        const resultado = os.checklist.resultado === 'APTO';
        
        if (itensCriticosOk && testeOk && resultado) {
          get().moverArea(osId, 'VERDE');
          get().atualizarStatusEstoque(os.equipamentoId, 'DISPONIVEL');
          
          // Publica evento de liberação
          get().publishEvent('oficina:equipDisponivel', {
            equipamentoId: os.equipamentoId,
            osId
          });
          
          return true;
        }
        
        return false;
      },
      
      publishEvent: (type, payload) =>
        set((state) => ({
          eventBus: [
            ...state.eventBus,
            {
              type,
              payload,
              timestamp: new Date().toISOString()
            }
          ]
        })),
      
      subscribeToEvent: (type, callback) => {
        // Simplified subscription - in real app would use proper event emitter
        const checkEvents = () => {
          const events = get().eventBus.filter(e => e.type === type);
          events.forEach(callback);
        };
        
        const interval = setInterval(checkEvents, 100);
        return () => clearInterval(interval);
      },
      
      getEquipamentosByArea: (area) =>
        get().equipamentos.filter((e) => e.areaOficina === area),
      
      getOSByEquipamento: (equipId) =>
        get().ordens.find((os) => os.equipamentoId === equipId),
      
      getKPIsByArea: () => {
        const equipamentos = get().equipamentos;
        const ordens = get().ordens;
        
        const areas: AreaOficina[] = ['AMARELA', 'VERMELHA', 'AZUL', 'VERDE', 'CINZA'];
        const kpis: Record<AreaOficina, { total: number; criticos: number; slaMedia: number }> = {} as any;
        
        areas.forEach(area => {
          const equipsArea = equipamentos.filter(e => e.areaOficina === area);
          const ordensArea = ordens.filter(os => os.areaAtual === area);
          
          const criticos = ordensArea.filter(os => {
            const horasPassadas = (Date.now() - new Date(os.timeline[0]?.ts || 0).getTime()) / (1000 * 60 * 60);
            return horasPassadas > os.SLA_horas;
          }).length;
          
          const slaMedia = ordensArea.length > 0 
            ? ordensArea.reduce((acc, os) => acc + os.SLA_horas, 0) / ordensArea.length 
            : 0;
          
          kpis[area] = {
            total: equipsArea.length,
            criticos,
            slaMedia
          };
        });
        
        return kpis;
      },
      
      getProdutividadeToday: () => {
        const hoje = new Date().toISOString().split('T')[0];
        return get().produtividade.find(p => p.data === hoje) || null;
      },
      
      getProdutividadeWeek: () => {
        const semanaAtras = new Date();
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        const cutoff = semanaAtras.toISOString().split('T')[0];
        
        return get().produtividade.filter(p => p.data >= cutoff);
      },
      
      getProdutividadeMonth: () => {
        const mesAtras = new Date();
        mesAtras.setMonth(mesAtras.getMonth() - 1);
        const cutoff = mesAtras.toISOString().split('T')[0];
        
        return get().produtividade.filter(p => p.data >= cutoff);
      },
      
      seedData: () => {
        const equipamentos: EquipOficina[] = [
          {
            id: 'eq-1',
            codigo: 'BET001',
            modelo: 'Betoneira 400L',
            serie: 'BT001',
            loja: 'Loja Centro',
            statusEstoque: 'MANUTENCAO',
            areaOficina: 'AMARELA',
            contratoDevolucaoId: 'LOC-2024-001',
            fotoUrl: '/placeholder.svg',
            timestamps: {
              entradaArea: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          {
            id: 'eq-2',
            codigo: 'AND002',
            modelo: 'Andaime Fachadeiro',
            serie: 'AD002',
            loja: 'Loja Centro',
            statusEstoque: 'MANUTENCAO',
            areaOficina: 'VERMELHA',
            fotoUrl: '/placeholder.svg',
            timestamps: {
              entradaArea: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          {
            id: 'eq-3',
            codigo: 'ESC003',
            modelo: 'Escora Metálica',
            serie: 'ES003',
            loja: 'Loja Centro',
            statusEstoque: 'MANUTENCAO',
            areaOficina: 'AZUL',
            fotoUrl: '/placeholder.svg',
            timestamps: {
              entradaArea: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          {
            id: 'eq-4',
            codigo: 'VIB004',
            modelo: 'Vibrador Concreto',
            serie: 'VB004',
            loja: 'Loja Centro',
            statusEstoque: 'DISPONIVEL',
            areaOficina: 'VERDE',
            fotoUrl: '/placeholder.svg',
            timestamps: {
              entradaArea: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        ];
        
        const ordens: OSOficina[] = [
          {
            id: 'OS-001',
            equipamentoId: 'eq-1',
            tipo: 'PREVENTIVA',
            origem: 'POS_LOCACAO',
            prioridade: 'MEDIA',
            SLA_horas: 24,
            status: 'EM_ANALISE',
            areaAtual: 'AMARELA',
            contratoId: 'LOC-2024-001',
            timeline: [
              {
                id: 'evt-1',
                ts: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                user: 'admin',
                action: 'OS_CRIADA',
                payload: { origem: 'POS_LOCACAO' }
              }
            ]
          },
          {
            id: 'OS-002',
            equipamentoId: 'eq-2',
            tipo: 'CORRETIVA',
            origem: 'AUDITORIA',
            prioridade: 'ALTA',
            SLA_horas: 12,
            status: 'EM_ANALISE',
            areaAtual: 'VERMELHA',
            laudoHtml: '<p>Problema identificado nas soldas das conexões principais.</p>',
            classificacaoDefeito: 'DESGASTE',
            timeline: [
              {
                id: 'evt-2',
                ts: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                user: 'mecanico1',
                action: 'OS_CRIADA',
                payload: { origem: 'AUDITORIA' }
              }
            ]
          }
        ];
        
        const templates: ChecklistTemplate[] = [
          {
            id: 'tpl-betoneira-prev',
            modelo: 'Betoneira 400L',
            tipo: 'PREVENTIVA',
            itens: [
              { id: '1', titulo: 'Verificar nível de óleo do motor', critico: true },
              { id: '2', titulo: 'Testar funcionamento do tambor', critico: true },
              { id: '3', titulo: 'Limpar filtro de ar', critico: false },
              { id: '4', titulo: 'Verificar estado das correias', critico: true },
              { id: '5', titulo: 'Testar sistema elétrico', critico: true }
            ]
          },
          {
            id: 'tpl-andaime-prev',
            modelo: 'Andaime Fachadeiro',
            tipo: 'PREVENTIVA',
            itens: [
              { id: '1', titulo: 'Verificar integridade das soldas', critico: true },
              { id: '2', titulo: 'Testar travas de segurança', critico: true },
              { id: '3', titulo: 'Verificar estado das plataformas', critico: true },
              { id: '4', titulo: 'Limpar e lubrificar conexões', critico: false }
            ]
          }
        ];
        
        const produtividade: ProdDia[] = [
          {
            data: new Date().toISOString().split('T')[0],
            loja: 'Loja Centro',
            mecId: 'mec-1',
            limpas: 3,
            liberadas: 2,
            aguardDiag: 1,
            aguardPeca: 1,
            suportes: 0,
            andaimesLimpas: 1,
            andaimesLiberadas: 1,
            escorasLimpas: 0,
            escorasLiberadas: 0
          }
        ];
        
        set({
          equipamentos,
          ordens,
          templates,
          produtividade
        });
      }
    }),
    {
      name: 'manutencao-storage',
    }
  )
);

export { useManutencaoStore };