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
} from '@/types/veiculos';
import { useVeiculosConfigStore } from '@/stores/veiculosConfigStore';
import {
  frotaUpsert,
  frotaDelete,
  frotaFetchAll,
  frotaSeedFromLocal,
  lerSeedPendente,
  gravarSeedPendente,
  FROTA_ORDEM,
  type FrotaEstado,
  type FrotaEntidade,
} from '@/stores/frotaSync';
import { toast } from 'sonner';

// Fonte da verdade é o Supabase (tabelas frota_*). O estado local (persist)
// funciona como cache otimista: hydrate() carrega do banco no load do módulo
// e cada mutação faz write-through. IDs novos são uuid (compatível com text).
interface VeiculosState extends FrotaEstado {
  frotaHidratada: boolean;

  hydrate: () => Promise<void>;

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

let hidratando = false;

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
      frotaHidratada: false,

      hydrate: async () => {
        if (hidratando || get().frotaHidratada) return;
        hidratando = true;
        try {
          const remoto = await frotaFetchAll();
          const local = get();
          const pendentesAntes = lerSeedPendente();

          // Seed POR ENTIDADE (não tudo-ou-nada): sobe só o que o servidor
          // ainda não tem e este navegador tem — dois navegadores com dados
          // legados não duplicam catálogo, e um seed interrompido retoma.
          const paraSeed = FROTA_ORDEM.filter(
            (e) => (pendentesAntes.has(e) || remoto[e].length === 0) && (local[e] as unknown[]).length > 0,
          );

          let falhas: FrotaEntidade[] = [];
          if (paraSeed.length > 0) {
            gravarSeedPendente(paraSeed);
            falhas = await frotaSeedFromLocal(local, paraSeed);
            gravarSeedPendente(falhas);
            if (falhas.length === 0) {
              toast.success('Dados da frota deste navegador foram enviados ao servidor.');
            } else {
              toast.error(
                `Frota: falha ao enviar ${falhas.join(', ')} — mantendo os dados locais; nova tentativa no próximo acesso.`,
              );
            }
          }

          // Estado final: entidades seedadas (ou com falha) mantêm o local;
          // as demais assumem a verdade do servidor.
          const novo: Partial<FrotaEstado> = {};
          for (const e of FROTA_ORDEM) {
            (novo as Record<string, unknown>)[e] = paraSeed.includes(e) ? local[e] : remoto[e];
          }
          set({ ...(novo as FrotaEstado), frotaHidratada: true });
        } catch (e: any) {
          console.error('frota: falha ao carregar do servidor:', e);
          toast.error(`Frota: usando dados locais (falha ao carregar do servidor: ${e?.message ?? e})`);
        } finally {
          hidratando = false;
        }
      },

      // Veículos
      addVeiculo: (veiculo) => {
        const novo: Veiculo = {
          ...veiculo,
          id: crypto.randomUUID(),
          criado_emISO: new Date().toISOString(),
        };
        set((state) => ({ veiculos: [...state.veiculos, novo] }));
        frotaUpsert('veiculos', novo);
      },

      updateVeiculo: (id, updates) => {
        set((state) => ({
          veiculos: state.veiculos.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        }));
        const atual = get().veiculos.find((v) => v.id === id);
        if (atual) frotaUpsert('veiculos', atual);
      },

      removeVeiculo: (id) => {
        set((state) => ({
          veiculos: state.veiculos.filter((v) => v.id !== id),
          veiculo_configs: state.veiculo_configs.filter((c) => c.veiculo_id !== id),
        }));
        frotaDelete('veiculos', id); // configs caem por ON DELETE CASCADE
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
        const novo = { ...posto, id: crypto.randomUUID() };
        set((state) => ({ postos: [...state.postos, novo] }));
        frotaUpsert('postos', novo);
      },

      updatePosto: (id, updates) => {
        set((state) => ({
          postos: state.postos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        const atual = get().postos.find((p) => p.id === id);
        if (atual) frotaUpsert('postos', atual);
      },

      removePosto: (id) => {
        set((state) => ({ postos: state.postos.filter((p) => p.id !== id) }));
        frotaDelete('postos', id);
      },

      // Óleos
      addOleo: (oleo) => {
        const novo = { ...oleo, id: crypto.randomUUID() };
        set((state) => ({ oleos: [...state.oleos, novo] }));
        frotaUpsert('oleos', novo);
      },

      updateOleo: (id, updates) => {
        set((state) => ({
          oleos: state.oleos.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        }));
        const atual = get().oleos.find((o) => o.id === id);
        if (atual) frotaUpsert('oleos', atual);
      },

      removeOleo: (id) => {
        set((state) => ({
          oleos: state.oleos.filter((o) => o.id !== id),
          veiculo_configs: state.veiculo_configs.filter((c) => c.oleo_id !== id),
        }));
        frotaDelete('oleos', id); // configs caem por ON DELETE CASCADE
      },

      // Oficinas
      addOficina: (oficina) => {
        const nova = { ...oficina, id: crypto.randomUUID() };
        set((state) => ({ oficinas: [...state.oficinas, nova] }));
        frotaUpsert('oficinas', nova);
      },

      updateOficina: (id, updates) => {
        set((state) => ({
          oficinas: state.oficinas.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        }));
        const atual = get().oficinas.find((o) => o.id === id);
        if (atual) frotaUpsert('oficinas', atual);
      },

      removeOficina: (id) => {
        set((state) => ({ oficinas: state.oficinas.filter((o) => o.id !== id) }));
        frotaDelete('oficinas', id);
      },

      // Serviços
      addServico: (servico) => {
        const novo = { ...servico, id: crypto.randomUUID() };
        set((state) => ({ servicos: [...state.servicos, novo] }));
        frotaUpsert('servicos', novo);
      },

      updateServico: (id, updates) => {
        set((state) => ({
          servicos: state.servicos.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
        const atual = get().servicos.find((s) => s.id === id);
        if (atual) frotaUpsert('servicos', atual);
      },

      removeServico: (id) => {
        const afetadas = get().oficinas.filter((o) => o.servicos_ids.includes(id)).map((o) => o.id);
        set((state) => ({
          servicos: state.servicos.filter((s) => s.id !== id),
          oficinas: state.oficinas.map((o) => ({
            ...o,
            servicos_ids: o.servicos_ids.filter((sid) => sid !== id),
          })),
        }));
        frotaDelete('servicos', id);
        // write-through só das oficinas que perderam o serviço
        get().oficinas
          .filter((o) => afetadas.includes(o.id))
          .forEach((o) => frotaUpsert('oficinas', o));
      },

      // Configurações
      setVeiculoOleo: (veiculoId, oleoId) => {
        // reusa o id da config existente — o upsert por veiculo_id não deve
        // trocar a PK da linha remota
        const existente = get().veiculo_configs.find((c) => c.veiculo_id === veiculoId);
        const nova: VeiculoConfig = {
          id: existente?.id ?? crypto.randomUUID(),
          veiculo_id: veiculoId,
          oleo_id: oleoId,
          desde_dataISO: new Date().toISOString(),
        };
        set((state) => ({
          veiculo_configs: [
            ...state.veiculo_configs.filter((c) => c.veiculo_id !== veiculoId),
            nova,
          ],
        }));
        frotaUpsert('veiculo_configs', nova, 'veiculo_id');
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
        const atual = get().veiculos.find((v) => v.id === veiculoId);
        if (atual) frotaUpsert('veiculos', atual);
      },

      // Manutenções
      abrirOS: (data) => {
        const novaOS: Manutencao = {
          ...data,
          id: crypto.randomUUID(),
          data_abertura: new Date().toISOString(),
          status: 'ABERTA',
          tempo_parado_h: 0,
        };

        set((state) => ({
          manutencoes: [...state.manutencoes, novaOS],
          veiculos: state.veiculos.map((v) =>
            v.id === data.veiculo_id ? { ...v, status: 'OFICINA' } : v
          ),
        }));

        frotaUpsert('manutencoes', novaOS);
        const veiculo = get().veiculos.find((v) => v.id === data.veiculo_id);
        if (veiculo) frotaUpsert('veiculos', veiculo);

        return novaOS.id;
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

        const os = get().manutencoes.find((m) => m.id === id);
        if (os) {
          frotaUpsert('manutencoes', os);
          const veiculo = get().veiculos.find((v) => v.id === os.veiculo_id);
          if (veiculo) frotaUpsert('veiculos', veiculo);
          // Atualizar odômetro se fornecido
          if (data.km_saida) get().updateOdometro(os.veiculo_id, data.km_saida);
        }
      },

      getManutencoesByVeiculo: (veiculoId) => {
        return get().manutencoes.filter((m) => m.veiculo_id === veiculoId);
      },

      // Abastecimentos
      addAbastecimento: (abastecimento) => {
        const { km_percorrido, km_por_l, flags } = get().calcularConsumo(
          abastecimento.veiculo_id,
          abastecimento.km_atual,
          abastecimento.litros
        );
        // custo por km real (era sempre 0 e virava zero histórico no banco)
        const custo_por_km = km_percorrido > 0
          ? (abastecimento.preco_litro * abastecimento.litros) / km_percorrido
          : 0;

        const novo: Abastecimento = {
          ...abastecimento,
          id: crypto.randomUUID(),
          km_percorrido,
          km_por_l,
          custo_por_km,
          flags_json: flags.length > 0 ? JSON.stringify(flags) : undefined,
        };

        set((state) => ({ abastecimentos: [...state.abastecimentos, novo] }));
        frotaUpsert('abastecimentos', novo);

        // Atualizar odômetro (já faz write-through do veículo)
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
        const custo_por_km = 0;

        if (ultimo) {
          km_percorrido = kmAtual - ultimo.km_atual;

          if (km_percorrido > 0) {
            km_por_l = km_percorrido / litros;

            const veiculo = get().veiculos.find((v) => v.id === veiculoId);
            if (veiculo) {
              const configStore = useVeiculosConfigStore.getState();

              if (configStore.isConsumoForaDaFaixa(veiculo.tipo, km_por_l)) {
                flags.push('consumo_atipico');
              }

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
        const trocasAnteriores = get().getTrocasOleoByVeiculo(troca.veiculo_id);
        const ultimaTroca = trocasAnteriores[0]; // Ordenado por data desc

        const km_desde_ultima = ultimaTroca
          ? troca.km_atual - ultimaTroca.km_atual
          : troca.km_atual;

        const novaTroca: TrocaOleo = {
          ...troca,
          id: crypto.randomUUID(),
          km_desde_ultima,
        };

        set((state) => ({ trocas_oleo: [...state.trocas_oleo, novaTroca] }));
        frotaUpsert('trocas_oleo', novaTroca);

        // Atualizar odômetro (já faz write-through do veículo)
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
      // cache local; a verdade vem do hydrate(). Não persistimos o flag para
      // sempre re-hidratar a cada sessão.
      partialize: (state) => {
        const { frotaHidratada, ...rest } = state as any;
        return rest;
      },
    }
  )
);
