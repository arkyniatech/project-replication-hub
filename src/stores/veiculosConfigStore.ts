import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TipoVeiculo } from '@/types/veiculos';

export interface MetaKmPorL {
  tipo: TipoVeiculo;
  meta: number;
}

export interface FaixaConsumo {
  tipo: TipoVeiculo;
  min: number;
  max: number;
}

export interface AlertasOleo {
  margemKm: number; // 0.9 = 90%
  margemPrazoDias: number; // 15 dias
}

export interface IntervaloPadrao {
  id: string;
  nome: string;
  intervaloKm: number;
  intervaloMeses: number;
  categoria: 'PREVENTIVA' | 'CORRETIVA' | 'REVISAO';
}

export interface VeiculosConfig {
  metasKmPorL: MetaKmPorL[];
  faixasConsumo: FaixaConsumo[];
  kmAtipicoMin: number;
  alertasOleo: AlertasOleo;
  intervalosServicos: IntervaloPadrao[];
}

interface VeiculosConfigState {
  config: VeiculosConfig;
  updateMetaKmPorL: (tipo: TipoVeiculo, meta: number) => void;
  updateFaixaConsumo: (tipo: TipoVeiculo, min: number, max: number) => void;
  updateKmAtipicoMin: (valor: number) => void;
  updateAlertasOleo: (alertas: Partial<AlertasOleo>) => void;
  addIntervaloServico: (intervalo: Omit<IntervaloPadrao, 'id'>) => void;
  updateIntervaloServico: (id: string, intervalo: Partial<IntervaloPadrao>) => void;
  removeIntervaloServico: (id: string) => void;
  resetToDefaults: () => void;
  getMetaKmPorL: (tipo: TipoVeiculo) => number;
  getFaixaConsumo: (tipo: TipoVeiculo) => { min: number; max: number } | null;
  isConsumoForaDaFaixa: (tipo: TipoVeiculo, kmPorL: number) => boolean;
  isKmAtipico: (km: number) => boolean;
}

const defaultConfig: VeiculosConfig = {
  metasKmPorL: [
    { tipo: 'carro', meta: 12.0 },
    { tipo: 'moto', meta: 35.0 },
    { tipo: 'furgão', meta: 9.0 },
    { tipo: 'caminhão', meta: 5.0 }
  ],
  faixasConsumo: [
    { tipo: 'carro', min: 8, max: 20 },
    { tipo: 'moto', min: 25, max: 45 },
    { tipo: 'furgão', min: 6, max: 12 },
    { tipo: 'caminhão', min: 3, max: 8 }
  ],
  kmAtipicoMin: 10,
  alertasOleo: {
    margemKm: 0.9, // 90%
    margemPrazoDias: 15
  },
  intervalosServicos: [
    {
      id: 'alinhamento',
      nome: 'Alinhamento e Balanceamento',
      intervaloKm: 10000,
      intervaloMeses: 6,
      categoria: 'PREVENTIVA'
    },
    {
      id: 'pneus',
      nome: 'Inspeção de Pneus',
      intervaloKm: 5000,
      intervaloMeses: 3,
      categoria: 'PREVENTIVA'
    },
    {
      id: 'freios',
      nome: 'Sistema de Freios',
      intervaloKm: 20000,
      intervaloMeses: 12,
      categoria: 'PREVENTIVA'
    },
    {
      id: 'suspensao',
      nome: 'Suspensão',
      intervaloKm: 30000,
      intervaloMeses: 18,
      categoria: 'PREVENTIVA'
    },
    {
      id: 'revisao_geral',
      nome: 'Revisão Geral',
      intervaloKm: 15000,
      intervaloMeses: 12,
      categoria: 'REVISAO'
    }
  ]
};

export const useVeiculosConfigStore = create<VeiculosConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,

      updateMetaKmPorL: (tipo, meta) => set(state => ({
        config: {
          ...state.config,
          metasKmPorL: state.config.metasKmPorL.map(item =>
            item.tipo === tipo ? { ...item, meta } : item
          )
        }
      })),

      updateFaixaConsumo: (tipo, min, max) => set(state => ({
        config: {
          ...state.config,
          faixasConsumo: state.config.faixasConsumo.map(item =>
            item.tipo === tipo ? { ...item, min, max } : item
          )
        }
      })),

      updateKmAtipicoMin: (valor) => set(state => ({
        config: {
          ...state.config,
          kmAtipicoMin: valor
        }
      })),

      updateAlertasOleo: (alertas) => set(state => ({
        config: {
          ...state.config,
          alertasOleo: {
            ...state.config.alertasOleo,
            ...alertas
          }
        }
      })),

      addIntervaloServico: (intervalo) => set(state => ({
        config: {
          ...state.config,
          intervalosServicos: [
            ...state.config.intervalosServicos,
            { ...intervalo, id: `servico_${Date.now()}` }
          ]
        }
      })),

      updateIntervaloServico: (id, intervalo) => set(state => ({
        config: {
          ...state.config,
          intervalosServicos: state.config.intervalosServicos.map(item =>
            item.id === id ? { ...item, ...intervalo } : item
          )
        }
      })),

      removeIntervaloServico: (id) => set(state => ({
        config: {
          ...state.config,
          intervalosServicos: state.config.intervalosServicos.filter(item => item.id !== id)
        }
      })),

      resetToDefaults: () => set({ config: defaultConfig }),

      getMetaKmPorL: (tipo) => {
        const meta = get().config.metasKmPorL.find(m => m.tipo === tipo);
        return meta?.meta || 0;
      },

      getFaixaConsumo: (tipo) => {
        const faixa = get().config.faixasConsumo.find(f => f.tipo === tipo);
        return faixa ? { min: faixa.min, max: faixa.max } : null;
      },

      isConsumoForaDaFaixa: (tipo, kmPorL) => {
        const faixa = get().getFaixaConsumo(tipo);
        if (!faixa) return false;
        return kmPorL < faixa.min || kmPorL > faixa.max;
      },

      isKmAtipico: (km) => {
        return km < get().config.kmAtipicoMin;
      }
    }),
    {
      name: 'veiculos-config-storage',
      version: 1
    }
  )
);