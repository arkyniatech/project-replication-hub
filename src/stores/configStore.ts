import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_CONFIG } from '@/config/app';

export interface SequenciaPorLoja {
  contrato: number;
  os: number;
  fatura: number;
  titulo: number;
  prefixos?: {
    contrato?: string;
    os?: string;
    fatura?: string;
    titulo?: string;
  };
}

type SequenciaNumericaKey = 'contrato' | 'os' | 'fatura' | 'titulo';

export interface TemplateContratoResumo {
  logo?: string; // base64
  cores: {
    primaria: string;
    secundaria: string;
  };
  camposVisiveis: {
    cliente: boolean;
    itens: boolean;
    tabelas: boolean;
    observacoes: boolean;
    assinaturas: boolean;
  };
}

export interface Aviso {
  id: string;
  texto: string;
  tipo: 'info' | 'warning' | 'success' | 'urgent';
  ativo: boolean;
  dataInicio?: string; // ISO date
  dataFim?: string; // ISO date
  prioridade: number; // 1-5, maior = mais importante
  createdAt: string;
  createdBy: string;
}

export interface ConfiguracaoAvisos {
  exibirLogo: boolean;
  tempoRotacao: number; // segundos
  animacao: boolean;
}

export interface ConfigState {
  sequenciasPorLoja: Record<string, SequenciaPorLoja>;
  templates: {
    contratoResumo: TemplateContratoResumo;
  };
  avisos: Aviso[];
  configuracaoAvisos: ConfiguracaoAvisos;
  
  // Actions
  updateSequenciaLoja: (lojaId: string, entidade: SequenciaNumericaKey, valor: number) => void;
  updatePrefixoLoja: (lojaId: string, entidade: string, prefixo: string) => void;
  resetSequenciaVisualizacao: (lojaId: string) => void;
  updateTemplate: (template: Partial<TemplateContratoResumo>) => void;
  restaurarTemplatesPadrao: () => void;
  incrementarSequencia: (lojaId: string, entidade: SequenciaNumericaKey) => number;
  
  // Avisos actions
  addAviso: (aviso: Omit<Aviso, 'id' | 'createdAt' | 'createdBy'>) => void;
  updateAviso: (id: string, aviso: Partial<Aviso>) => void;
  removeAviso: (id: string) => void;
  toggleAviso: (id: string) => void;
  updateConfiguracaoAvisos: (config: Partial<ConfiguracaoAvisos>) => void;
  getAvisosAtivos: () => Aviso[];
}

const templatePadrao: TemplateContratoResumo = {
  cores: {
    primaria: '#F59E0B',
    secundaria: '#111827',
  },
  camposVisiveis: {
    cliente: true,
    itens: true,
    tabelas: true,
    observacoes: true,
    assinaturas: true,
  },
};

const configuracaoAvisosPadrao: ConfiguracaoAvisos = {
  exibirLogo: true,
  tempoRotacao: 5,
  animacao: true,
};

const avisosIniciais: Aviso[] = [
  {
    id: '1',
    texto: `Bem-vindo ao ${APP_CONFIG.system.name}! Sistema configurado e pronto para uso.`,
    tipo: 'success',
    ativo: true,
    prioridade: 1,
    createdAt: new Date().toISOString(),
    createdBy: 'Sistema',
  }
];

const defaultSequenciasPorLoja = (): Record<string, SequenciaPorLoja> => {
  // Initialize with default lojas
  return {
    "1": { contrato: 1, os: 1, fatura: 1, titulo: 1 },
    "2": { contrato: 1, os: 1, fatura: 1, titulo: 1 },
  };
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      sequenciasPorLoja: defaultSequenciasPorLoja(),
      templates: {
        contratoResumo: templatePadrao,
      },
      avisos: avisosIniciais,
      configuracaoAvisos: configuracaoAvisosPadrao,

      updateSequenciaLoja: (lojaId, entidade, valor) =>
        set((state) => ({
          sequenciasPorLoja: {
            ...state.sequenciasPorLoja,
            [lojaId]: {
              ...state.sequenciasPorLoja[lojaId],
              [entidade]: valor,
            },
          },
        })),

      updatePrefixoLoja: (lojaId, entidade, prefixo) =>
        set((state) => ({
          sequenciasPorLoja: {
            ...state.sequenciasPorLoja,
            [lojaId]: {
              ...state.sequenciasPorLoja[lojaId],
              prefixos: {
                ...state.sequenciasPorLoja[lojaId]?.prefixos,
                [entidade]: prefixo,
              },
            },
          },
        })),

      resetSequenciaVisualizacao: (lojaId) =>
        set((state) => ({
          sequenciasPorLoja: {
            ...state.sequenciasPorLoja,
            [lojaId]: {
              contrato: 1,
              os: 1,
              fatura: 1,
              titulo: 1,
            },
          },
        })),

      updateTemplate: (template) =>
        set((state) => ({
          templates: {
            ...state.templates,
            contratoResumo: {
              ...state.templates.contratoResumo,
              ...template,
            },
          },
        })),

      restaurarTemplatesPadrao: () =>
        set((state) => ({
          templates: {
            ...state.templates,
            contratoResumo: { ...templatePadrao },
          },
        })),

      incrementarSequencia: (lojaId, entidade) => {
        const state = get();
        const sequencia = state.sequenciasPorLoja[lojaId];
        const atual = (sequencia && typeof sequencia[entidade] === 'number') ? sequencia[entidade] : 1;
        const proximo = atual + 1;
        
        set((prevState) => ({
          sequenciasPorLoja: {
            ...prevState.sequenciasPorLoja,
            [lojaId]: {
              ...prevState.sequenciasPorLoja[lojaId],
              [entidade]: proximo,
            },
          },
        }));
        
        return atual;
      },

      // Avisos actions
      addAviso: (avisoData) =>
        set((state) => ({
          avisos: [
            ...state.avisos,
            {
              ...avisoData,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              createdBy: 'Admin Sistema', // Em produção viria do contexto
            }
          ],
        })),

      updateAviso: (id, avisoData) =>
        set((state) => ({
          avisos: state.avisos.map(aviso =>
            aviso.id === id ? { ...aviso, ...avisoData } : aviso
          ),
        })),

      removeAviso: (id) =>
        set((state) => ({
          avisos: state.avisos.filter(aviso => aviso.id !== id),
        })),

      toggleAviso: (id) =>
        set((state) => ({
          avisos: state.avisos.map(aviso =>
            aviso.id === id ? { ...aviso, ativo: !aviso.ativo } : aviso
          ),
        })),

      updateConfiguracaoAvisos: (config) =>
        set((state) => ({
          configuracaoAvisos: {
            ...state.configuracaoAvisos,
            ...config,
          },
        })),

      getAvisosAtivos: () => {
        const state = get();
        const hoje = new Date().toISOString().split('T')[0];
        
        return state.avisos
          .filter(aviso => {
            if (!aviso.ativo) return false;
            
            // Verificar data de início
            if (aviso.dataInicio && aviso.dataInicio > hoje) return false;
            
            // Verificar data de fim
            if (aviso.dataFim && aviso.dataFim < hoje) return false;
            
            return true;
          })
          .sort((a, b) => b.prioridade - a.prioridade); // Maior prioridade primeiro
      },
    }),
    {
      name: 'config-storage',
    }
  )
);