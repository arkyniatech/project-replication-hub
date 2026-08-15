import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contrato } from '@/types/disponibilidade';
import {
  mapContratosParaAgenda,
  type ContratoRow,
} from '@/lib/contratos-agenda-mapper';
import { addDays, format, startOfDay } from 'date-fns';

interface ContratosState {
  contratos: Contrato[];
  
  // Actions
  getContratosPorLoja: (lojaId: string) => Contrato[];
  getContratoById: (id: string) => Contrato | undefined;
  syncFromStorage: () => void;
}

export const useContratosStore = create<ContratosState>()(
  persist(
    (set, get) => ({
      contratos: [],

  syncFromStorage: async () => {
    // Sincronizar do Supabase ao invés de localStorage
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: contratos, error } = await supabase
        .from('contratos')
        .select(`
          id,
          numero,
          loja_id,
          cliente_id,
          status,
          data_inicio,
          data_fim,
          clientes(nome, razao_social, cpf, cnpj),
          contrato_itens(
            id,
            equipamento_id,
            modelo_id,
            controle,
            quantidade
          )
        `)
        .eq('ativo', true);

      if (error) throw error;

      // A tradução banco (SERIE/GRUPO) -> tela (SERIALIZADO/SALDO) vive no
      // mapper, ponto único. Ver src/lib/controle-vocabulario.ts.
      const contratosAgenda: Contrato[] = mapContratosParaAgenda(
        (contratos || []) as unknown as ContratoRow[]
      );

      set({ contratos: contratosAgenda });
    } catch (error) {
      console.error('Erro ao sincronizar contratos:', error);
      set({ contratos: [] });
    }
  },

      getContratosPorLoja: (lojaId) => {
        return get().contratos.filter(c => c.lojaId === lojaId);
      },

      getContratoById: (id) => {
        return get().contratos.find(c => c.id === id);
      },
    }),
    {
      name: 'contratos-agenda-store-v1',
    }
  )
);