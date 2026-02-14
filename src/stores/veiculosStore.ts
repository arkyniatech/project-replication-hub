import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Veiculo, 
  Posto, 
  Oleo, 
  Oficina, 
  Servico, 
  VeiculoConfig,
  Manutencao,
  Abastecimento,
  TrocaOleo,
  FiltrosVeiculos,
  FiltrosPostos,
  FiltrosOficinas
} from '@/types/veiculos';

interface VeiculosState {
  veiculos: Veiculo[];
  postos: Posto[];
  oleos: Oleo[];
  oficinas: Oficina[];
  servicos: Servico[];
  veiculo_configs: VeiculoConfig[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  trocas_oleo: TrocaOleo[];
  
  // Actions - Veículos
  addVeiculo: (veiculo: Omit<Veiculo, 'id' | 'criado_emISO'>) => void;
  updateVeiculo: (id: string, veiculo: Partial<Veiculo>) => void;
  removeVeiculo: (id: string) => void;
  getVeiculosByLoja: (lojaId: string) => Veiculo[];
  isPlacaUnique: (placa: string, excludeId?: string) => boolean;
  isCodigoInternoUnique: (codigo: string, lojaId: string, excludeId?: string) => boolean;
  updateOdometro: (veiculoId: string, novoKm: number) => void;
  
  // Actions - Postos
  addPosto: (posto: Omit<Posto, 'id'>) => void;
  updatePosto: (id: string, posto: Partial<Posto>) => void;
  removePosto: (id: string) => void;
  
  // Actions - Óleos
  addOleo: (oleo: Omit<Oleo, 'id'>) => void;
  updateOleo: (id: string, oleo: Partial<Oleo>) => void;
  removeOleo: (id: string) => void;
  
  // Actions - Oficinas
  addOficina: (oficina: Omit<Oficina, 'id'>) => void;
  updateOficina: (id: string, oficina: Partial<Oficina>) => void;
  removeOficina: (id: string) => void;
  
  // Actions - Serviços
  addServico: (servico: Omit<Servico, 'id'>) => void;
  updateServico: (id: string, servico: Partial<Servico>) => void;
  removeServico: (id: string) => void;
  
  // Actions - Configurações
  setVeiculoOleo: (veiculoId: string, oleoId: string) => void;
  getVeiculoOleoAtual: (veiculoId: string) => Oleo | null;
  
  // Actions - Manutenções
  abrirOS: (data: Omit<Manutencao, 'id' | 'status' | 'tempo_parado_h' | 'data_abertura'>) => string;
  fecharOS: (id: string, data: { km_saida?: number; dt_saidaISO?: string; custo_pecas?: number; custo_mo?: number }) => void;
  getManutencoesByVeiculo: (veiculoId: string) => Manutencao[];
  
  // Actions - Abastecimentos
  addAbastecimento: (abastecimento: Omit<Abastecimento, 'id' | 'km_percorrido' | 'km_por_l' | 'custo_por_km'>) => void;
  getAbastecimentosByVeiculo: (veiculoId: string) => Abastecimento[];
  calcularConsumo: (veiculoId: string, kmAtual: number, litros: number) => { km_percorrido: number; km_por_l: number; custo_por_km: number; flags: string[] };
  
  // Actions - Trocas de Óleo
  addTrocaOleo: (troca: Omit<TrocaOleo, 'id' | 'km_desde_ultima'>) => void;
  getTrocasOleoByVeiculo: (veiculoId: string) => TrocaOleo[];
  getProximaTrocaOleo: (veiculoId: string) => { proximoKm: number; proximaData: string } | null;
}

export const useVeiculosStore = create<VeiculosState>()(
  persist(
    (set, get) => ({
      veiculos: [],
      postos: [],
      oleos: [],
      oficinas: [],
      servicos: [],
      veiculo_configs: [],
      manutencoes: [],
      abastecimentos: [],
      trocas_oleo: [],

      // Veículos
      addVeiculo: (veiculo) => {
        const id = Date.now().toString();
        const newVeiculo: Veiculo = {
          ...veiculo,
          id,
          criado_emISO: new Date().toISOString(),
        };
        set((state) => ({
          veiculos: [...state.veiculos, newVeiculo],
        }));
      },

      updateVeiculo: (id, updates) => {
        set((state) => ({
          veiculos: state.veiculos.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        }));
      },

      removeVeiculo: (id) => {
        set((state) => ({
          veiculos: state.veiculos.filter((v) => v.id !== id),
          veiculo_configs: state.veiculo_configs.filter((c) => c.veiculo_id !== id),
        }));
      },

      getVeiculosByLoja: (lojaId) => {
        return get().veiculos.filter((v) => v.loja_id === lojaId);
      },

      isPlacaUnique: (placa, excludeId) => {
        const { veiculos } = get();
        return !veiculos.some((v) => 
          v.placa.toLowerCase() === placa.toLowerCase() && v.id !== excludeId
        );
      },

      isCodigoInternoUnique: (codigo, lojaId, excludeId) => {
        const { veiculos } = get();
        return !veiculos.some((v) => 
          v.codigo_interno === codigo && v.loja_id === lojaId && v.id !== excludeId
        );
      },

      // Postos
      addPosto: (posto) => {
        const id = Date.now().toString();
        set((state) => ({
          postos: [...state.postos, { ...posto, id }],
        }));
      },

      updatePosto: (id, updates) => {
        set((state) => ({
          postos: state.postos.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      removePosto: (id) => {
        set((state) => ({
          postos: state.postos.filter((p) => p.id !== id),
        }));
      },

      // Óleos
      addOleo: (oleo) => {
        const id = Date.now().toString();
        set((state) => ({
          oleos: [...state.oleos, { ...oleo, id }],
        }));
      },

      updateOleo: (id, updates) => {
        set((state) => ({
          oleos: state.oleos.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        }));
      },

      removeOleo: (id) => {
        set((state) => ({
          oleos: state.oleos.filter((o) => o.id !== id),
          veiculo_configs: state.veiculo_configs.filter((c) => c.oleo_id !== id),
        }));
      },

      // Oficinas
      addOficina: (oficina) => {
        const id = Date.now().toString();
        set((state) => ({
          oficinas: [...state.oficinas, { ...oficina, id }],
        }));
      },

      updateOficina: (id, updates) => {
        set((state) => ({
          oficinas: state.oficinas.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        }));
      },

      removeOficina: (id) => {
        set((state) => ({
          oficinas: state.oficinas.filter((o) => o.id !== id),
        }));
      },

      // Serviços
      addServico: (servico) => {
        const id = Date.now().toString();
        set((state) => ({
          servicos: [...state.servicos, { ...servico, id }],
        }));
      },

      updateServico: (id, updates) => {
        set((state) => ({
          servicos: state.servicos.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      removeServico: (id) => {
        set((state) => ({
          servicos: state.servicos.filter((s) => s.id !== id),
          oficinas: state.oficinas.map((o) => ({
            ...o,
            servicos_ids: o.servicos_ids.filter((sid) => sid !== id),
          })),
        }));
      },

      // Configurações
      setVeiculoOleo: (veiculoId, oleoId) => {
        const now = new Date().toISOString();
        const id = Date.now().toString();
        
        set((state) => ({
          veiculo_configs: [
            ...state.veiculo_configs.filter((c) => c.veiculo_id !== veiculoId),
            {
              id,
              veiculo_id: veiculoId,
              oleo_id: oleoId,
              desde_dataISO: now,
            },
          ],
        }));
      },

      getVeiculoOleoAtual: (veiculoId) => {
        const { veiculo_configs, oleos } = get();
        const config = veiculo_configs.find((c) => c.veiculo_id === veiculoId);
        if (!config) return null;
        return oleos.find((o) => o.id === config.oleo_id) || null;
      },

      // Atualizar odômetro
      updateOdometro: (veiculoId, novoKm) => {
        set((state) => ({
          veiculos: state.veiculos.map((v) =>
            v.id === veiculoId && novoKm > v.odometro_atual
              ? { ...v, odometro_atual: novoKm }
              : v
          ),
        }));
      },

      // Manutenções
      abrirOS: (data) => {
        const id = Date.now().toString();
        const now = new Date().toISOString();
        
        const novaOS: Manutencao = {
          ...data,
          id,
          data_abertura: now,
          status: 'ABERTA',
          tempo_parado_h: 0,
        };

        set((state) => ({
          manutencoes: [...state.manutencoes, novaOS],
          veiculos: state.veiculos.map((v) =>
            v.id === data.veiculo_id ? { ...v, status: 'OFICINA' } : v
          ),
        }));

        return id;
      },

      fecharOS: (id, data) => {
        set((state) => {
          const os = state.manutencoes.find((m) => m.id === id);
          if (!os || os.status === 'CONCLUIDA') return state;

          let tempo_parado_h = 0;
          if (os.dt_entradaISO && data.dt_saidaISO) {
            const entrada = new Date(os.dt_entradaISO);
            const saida = new Date(data.dt_saidaISO);
            tempo_parado_h = Math.round((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60));
          }

          return {
            ...state,
            manutencoes: state.manutencoes.map((m) =>
              m.id === id
                ? {
                    ...m,
                    ...data,
                    status: 'CONCLUIDA' as const,
                    tempo_parado_h,
                  }
                : m
            ),
            veiculos: state.veiculos.map((v) =>
              v.id === os.veiculo_id ? { ...v, status: 'OPERANDO' } : v
            ),
          };
        });

        // Atualizar odômetro se fornecido
        if (data.km_saida) {
          get().updateOdometro(
            get().manutencoes.find((m) => m.id === id)!.veiculo_id,
            data.km_saida
          );
        }
      },

      getManutencoesByVeiculo: (veiculoId) => {
        return get().manutencoes.filter((m) => m.veiculo_id === veiculoId);
      },

      // Abastecimentos
      addAbastecimento: (abastecimento) => {
        const id = Date.now().toString();
        const { km_percorrido, km_por_l, custo_por_km, flags } = get().calcularConsumo(
          abastecimento.veiculo_id,
          abastecimento.km_atual,
          abastecimento.litros
        );

        const novoAbastecimento: Abastecimento = {
          ...abastecimento,
          id,
          km_percorrido,
          km_por_l,
          custo_por_km,
          flags_json: flags.length > 0 ? JSON.stringify(flags) : undefined,
        };

        set((state) => ({
          abastecimentos: [...state.abastecimentos, novoAbastecimento],
        }));

        // Atualizar odômetro
        get().updateOdometro(abastecimento.veiculo_id, abastecimento.km_atual);
      },

      getAbastecimentosByVeiculo: (veiculoId) => {
        return get().abastecimentos
          .filter((a) => a.veiculo_id === veiculoId)
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      calcularConsumo: (veiculoId, kmAtual, litros) => {
        const abastecimentos = get().getAbastecimentosByVeiculo(veiculoId);
        const ultimo = abastecimentos[0];
        
        const flags: string[] = [];
        let km_percorrido = 0;
        let km_por_l = 0;
        let custo_por_km = 0;

        if (ultimo) {
          km_percorrido = kmAtual - ultimo.km_atual;
          
          if (km_percorrido > 0) {
            km_por_l = km_percorrido / litros;
            
            // Usar configurações para flags de consumo
            const veiculo = get().veiculos.find((v) => v.id === veiculoId);
            if (veiculo) {
              // Importar as configurações de forma dinâmica
              const { useVeiculosConfigStore } = require('@/stores/veiculosConfigStore');
              const configStore = useVeiculosConfigStore.getState();
              
              if (configStore.isConsumoForaDaFaixa(veiculo.tipo, km_por_l)) {
                flags.push('consumo_atipico');
              }
              
              // Flag de KM atípico usando configuração
              if (configStore.isKmAtipico(km_percorrido)) {
                flags.push('km_atipico');
              }
            }
          }
        }

        return { km_percorrido, km_por_l, custo_por_km, flags };
      },

      // Trocas de Óleo
      addTrocaOleo: (troca) => {
        const id = Date.now().toString();
        const trocasAnteriores = get().getTrocasOleoByVeiculo(troca.veiculo_id);
        const ultimaTroca = trocasAnteriores[0]; // Ordenado por data desc
        
        const km_desde_ultima = ultimaTroca
          ? troca.km_atual - ultimaTroca.km_atual
          : troca.km_atual;

        const novaTroca: TrocaOleo = {
          ...troca,
          id,
          km_desde_ultima,
        };

        set((state) => ({
          trocas_oleo: [...state.trocas_oleo, novaTroca],
        }));

        // Atualizar odômetro
        get().updateOdometro(troca.veiculo_id, troca.km_atual);
      },

      getTrocasOleoByVeiculo: (veiculoId) => {
        return get().trocas_oleo
          .filter((t) => t.veiculo_id === veiculoId)
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      getProximaTrocaOleo: (veiculoId) => {
        const ultimaTroca = get().getTrocasOleoByVeiculo(veiculoId)[0];
        const veiculo = get().veiculos.find((v) => v.id === veiculoId);
        const oleo = get().getVeiculoOleoAtual(veiculoId);

        if (!ultimaTroca || !veiculo || !oleo) return null;

        const proximoKm = ultimaTroca.km_atual + oleo.intervalo_km;
        const proximaDataMs = new Date(ultimaTroca.data).getTime() + (oleo.intervalo_meses * 30 * 24 * 60 * 60 * 1000);
        const proximaData = new Date(proximaDataMs).toISOString().split('T')[0];

        return { proximoKm, proximaData };
      },
    }),
    {
      name: 'veiculos-storage',
    }
  )
);