import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PoliticaID = 'P0' | 'P1' | 'P2';

export interface WindowConfig {
  startDay: number;
  endDay: number;
  billDay: number;
  dueDay: number;
  billMonthShift: number;
  dueMonthShift: number;
}

export interface PoliticaComercial {
  id: PoliticaID;
  nome: string;
  descontoPct: number;
  faturamento: {
    windows: WindowConfig[];
  };
}

export const politicas: Record<PoliticaID, PoliticaComercial> = {
  P0: {
    id: 'P0',
    nome: 'P0 — 5% + Agrupar dia 30 → Venc. dia 10',
    descontoPct: 5,
    faturamento: {
      windows: [
        { 
          startDay: 1, 
          endDay: 30, 
          billDay: 30, 
          dueDay: 10, 
          billMonthShift: 0, 
          dueMonthShift: 1 
        }
      ],
    }
  },
  P1: {
    id: 'P1',
    nome: 'P1 — 10% + Agrupar dia 30 → Venc. dia 5',
    descontoPct: 10,
    faturamento: {
      windows: [
        { 
          startDay: 1, 
          endDay: 30, 
          billDay: 30, 
          dueDay: 5, 
          billMonthShift: 0, 
          dueMonthShift: 1 
        }
      ],
    }
  },
  P2: {
    id: 'P2',
    nome: 'P2 — 15% + Duas janelas (15/20 e 01/05)',
    descontoPct: 15,
    faturamento: {
      windows: [
        { 
          startDay: 1, 
          endDay: 14, 
          billDay: 15, 
          dueDay: 20, 
          billMonthShift: 0, 
          dueMonthShift: 0 
        },
        { 
          startDay: 15, 
          endDay: 30, 
          billDay: 1, 
          dueDay: 5, 
          billMonthShift: 1, 
          dueMonthShift: 1 
        },
      ],
    }
  },
} as const;

interface PoliticasState {
  politicasCustom: Record<PoliticaID, PoliticaComercial>;
  getPolitica: (id: PoliticaID) => PoliticaComercial;
  getAllPoliticas: () => PoliticaComercial[];
  updatePolitica: (id: PoliticaID, politica: PoliticaComercial) => void;
  resetToDefaults: () => void;
}

export const usePoliticasStore = create<PoliticasState>()(
  persist(
    (set, get) => ({
      politicasCustom: {} as Record<PoliticaID, PoliticaComercial>,
      
      getPolitica: (id: PoliticaID) => {
        const custom = get().politicasCustom[id];
        return custom || politicas[id];
      },
      
      getAllPoliticas: () => {
        const custom = get().politicasCustom;
        return (['P0', 'P1', 'P2'] as PoliticaID[]).map(id => 
          custom[id] || politicas[id]
        );
      },
      
      updatePolitica: (id: PoliticaID, politica: PoliticaComercial) => {
        set(state => ({
          politicasCustom: {
            ...state.politicasCustom,
            [id]: politica
          }
        }));
      },
      
      resetToDefaults: () => {
        set({ politicasCustom: {} as Record<PoliticaID, PoliticaComercial> });
      },
    }),
    {
      name: 'politicas-comerciais-storage',
    }
  )
);
