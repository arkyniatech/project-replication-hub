import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ItinerarioDia, TarefaLogistica, Motorista, Veiculo } from '../types';

interface ItinerarioState {
  itinerarios: ItinerarioDia[];
  motoristas: Motorista[];
  veiculos: Veiculo[];
  addItinerario: (itinerario: ItinerarioDia) => void;
  updateItinerario: (id: string, updates: Partial<ItinerarioDia>) => void;
  updateTarefa: (itinerarioId: string, tarefaId: string, updates: Partial<TarefaLogistica>) => void;
  addTarefa: (itinerarioId: string, tarefa: TarefaLogistica) => void;
  removeTarefa: (itinerarioId: string, tarefaId: string) => void;
  getItinerarioByDate: (dataISO: string, lojaId: string) => ItinerarioDia[];
}

export const useItinerarioStore = create<ItinerarioState>()(
  persist(
    (set, get) => ({
      itinerarios: [],
      motoristas: [],
      veiculos: [],

      addItinerario: (itinerario) =>
        set((state) => ({
          itinerarios: [...state.itinerarios, itinerario]
        })),

      updateItinerario: (id, updates) =>
        set((state) => ({
          itinerarios: state.itinerarios.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
          )
        })),

      updateTarefa: (itinerarioId, tarefaId, updates) =>
        set((state) => ({
          itinerarios: state.itinerarios.map((itinerario) =>
            itinerario.id === itinerarioId
              ? {
                  ...itinerario,
                  tarefas: itinerario.tarefas.map((tarefa) =>
                    tarefa.id === tarefaId ? { ...tarefa, ...updates } : tarefa
                  ),
                  updatedAt: new Date().toISOString()
                }
              : itinerario
          )
        })),

      addTarefa: (itinerarioId, tarefa) =>
        set((state) => ({
          itinerarios: state.itinerarios.map((itinerario) =>
            itinerario.id === itinerarioId
              ? {
                  ...itinerario,
                  tarefas: [...itinerario.tarefas, tarefa],
                  updatedAt: new Date().toISOString()
                }
              : itinerario
          )
        })),

      removeTarefa: (itinerarioId, tarefaId) =>
        set((state) => ({
          itinerarios: state.itinerarios.map((itinerario) =>
            itinerario.id === itinerarioId
              ? {
                  ...itinerario,
                  tarefas: itinerario.tarefas.filter((tarefa) => tarefa.id !== tarefaId),
                  updatedAt: new Date().toISOString()
                }
              : itinerario
          )
        })),

      getItinerarioByDate: (dataISO, lojaId) => {
        const state = get();
        return state.itinerarios.filter(
          (itinerario) => itinerario.dataISO === dataISO && itinerario.lojaId === lojaId
        );
      },
    }),
    {
      name: 'itinerario-logistica-store',
      version: 2,
    }
  )
);
