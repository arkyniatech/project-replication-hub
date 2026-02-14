import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contrato } from '@/types/disponibilidade';
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

      const contratosAgenda: Contrato[] = (contratos || []).map(c => ({
        id: String(c.id),
        numero: c.numero,
        lojaId: c.loja_id,
        clienteNome: c.clientes?.nome || c.clientes?.razao_social || '',
        clienteDoc: c.clientes?.cpf || c.clientes?.cnpj || '',
        itens: (c.contrato_itens || []).map(item => ({
          equipId: item.controle === 'SERIALIZADO' ? item.equipamento_id : undefined,
          modeloId: item.modelo_id || '',
          tipoControle: item.controle as 'SERIALIZADO' | 'SALDO',
          status: c.status === 'ATIVO' ? 'LOCADO' : 'RESERVADO',
          periodo: {
            inicio: c.data_inicio,
            fim: c.data_fim || c.data_inicio
          }
        }))
      }));
      
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