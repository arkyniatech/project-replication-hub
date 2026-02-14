import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TaxaDeslocamentoConfig {
  lojaId: string;
  ativo: boolean;
  valorPadrao: number;
  obrigarJustificativaQuandoDiferir: boolean;
  permitirExclusao: boolean;
  textoDescricaoPadrao: string;
}

interface TaxaDeslocamentoStore {
  configs: TaxaDeslocamentoConfig[];
  
  // Actions
  getConfigByLoja: (lojaId: string) => TaxaDeslocamentoConfig | null;
  updateConfig: (lojaId: string, config: Partial<TaxaDeslocamentoConfig>) => void;
  createConfig: (config: TaxaDeslocamentoConfig) => void;
}

// Mock default configs per shop
const mockConfigs: TaxaDeslocamentoConfig[] = [
  {
    lojaId: "1",
    ativo: true,
    valorPadrao: 50.00,
    obrigarJustificativaQuandoDiferir: true,
    permitirExclusao: true,
    textoDescricaoPadrao: "Taxa de deslocamento – não entrega"
  },
  {
    lojaId: "2", 
    ativo: true,
    valorPadrao: 75.00,
    obrigarJustificativaQuandoDiferir: true,
    permitirExclusao: true,
    textoDescricaoPadrao: "Taxa de deslocamento – não entrega"
  }
];

export const useTaxaDeslocamentoStore = create<TaxaDeslocamentoStore>()(
  persist(
    (set, get) => ({
      configs: mockConfigs,

      getConfigByLoja: (lojaId: string) => {
        const { configs } = get();
        return configs.find(config => config.lojaId === lojaId) || null;
      },

      updateConfig: (lojaId: string, updates: Partial<TaxaDeslocamentoConfig>) => {
        set((state) => ({
          configs: state.configs.map(config =>
            config.lojaId === lojaId
              ? { ...config, ...updates }
              : config
          )
        }));
      },

      createConfig: (config: TaxaDeslocamentoConfig) => {
        set((state) => ({
          configs: [...state.configs, config]
        }));
      }
    }),
    {
      name: 'taxa-deslocamento-store'
    }
  )
);