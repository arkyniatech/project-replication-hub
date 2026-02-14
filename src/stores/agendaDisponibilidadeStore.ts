import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LinhaAgenda, FiltrosAgenda, AgendaDia, StatusDisponibilidade } from '@/types/disponibilidade';
import { useContratosStore } from './contratosStore';
import { useEquipamentosStore } from './equipamentosStore';
import { addDays, format, startOfDay, isWithinInterval } from 'date-fns';

interface AgendaDisponibilidadeState {
  filtros: FiltrosAgenda;
  
  // Actions
  setFiltros: (filtros: Partial<FiltrosAgenda>) => void;
  buildAgenda: (lojaId: string, equipamentos: any[], grupos: any[], modelos: any[], contratos: any[]) => LinhaAgenda[];
  exportarCSV: (linhas: LinhaAgenda[], filtros: FiltrosAgenda) => void;
  exportarPDF: (linhas: LinhaAgenda[], filtros: FiltrosAgenda) => void;
}

const buildAgendaHelper = (
  lojaId: string,
  equipamentos: any[],
  grupos: any[],
  modelos: any[],
  contratos: any[]
): LinhaAgenda[] => {
  
  const hoje = startOfDay(new Date());
  const range30d = Array.from({ length: 30 }, (_, i) => addDays(hoje, i));
  
  // Filtrar equipamentos relacionados à loja
  const equipamentosLoja = equipamentos.filter(e => {
    if (e.tipo === 'SERIALIZADO') {
      return e.loja_atual_id === lojaId;
    } else {
      const saldos = e.saldos_por_loja as Record<string, { qtd: number }> || {};
      return saldos[lojaId]?.qtd > 0;
    }
  });
  
  const contratosLoja = contratos.filter(c => c.loja_id === lojaId);
  
  // Agrupar equipamentos por tipo
  const equipamentosSerie = equipamentosLoja.filter(e => e.tipo === 'SERIALIZADO');
  const equipamentosSaldo = equipamentosLoja.filter(e => e.tipo === 'SALDO');
  
  // Criar mapa de ocupação por equipamento/modelo
  const ocupacaoMap = new Map<string, Map<string, { status: StatusDisponibilidade; contrato?: string; cliente?: string }>>();
  
  // Proteger contra contratos sem itens e usar estrutura do Supabase
  contratosLoja.forEach(contrato => {
    // Usar contrato_itens (estrutura do Supabase) ao invés de itens
    const itens = (contrato as any).contrato_itens || contrato.itens || [];
    
    // Pular contratos que não têm itens
    if (!Array.isArray(itens) || itens.length === 0) {
      return;
    }
    
    // Extrair nome do cliente
    const clienteNome = (contrato as any).clientes?.nome || 
                        (contrato as any).clientes?.razao_social || 
                        (contrato as any).clienteNome || 
                        'Cliente não identificado';
    
    itens.forEach((item: any) => {
      const chave = item.equipamento_id || item.modelo_id;
      if (!chave) return; // Pular itens sem identificação
      
      if (!ocupacaoMap.has(chave)) {
        ocupacaoMap.set(chave, new Map());
      }
      
      const ocupacaoDia = ocupacaoMap.get(chave)!;
      
      // Usar data_locacao e data_devolucao do Supabase
      const inicio = new Date(item.data_locacao || item.periodo?.inicio);
      const fim = new Date(item.data_devolucao || item.periodo?.fim);
      
      range30d.forEach(dia => {
        if (isWithinInterval(dia, { start: inicio, end: fim })) {
          const dataISO = format(dia, 'yyyy-MM-dd');
          ocupacaoDia.set(dataISO, {
            status: item.status === 'RESERVADO' ? 'RESERVADO' : 'LOCADO',
            contrato: contrato.numero,
            cliente: clienteNome
          });
        }
      });
    });
  });
  
  const linhas: LinhaAgenda[] = [];
  
  // Linhas para equipamentos SERIALIZADO
  equipamentosSerie.forEach(equip => {
    const grupo = grupos.find(g => g.id === equip.grupo_id)?.nome || 'Sem Grupo';
    const modelo = modelos.find(m => m.id === equip.modelo_id)?.nome_comercial || 'Sem Modelo';
    
    const ocupacao = ocupacaoMap.get(equip.id) || new Map();
    const dias: AgendaDia[] = range30d.map(dia => {
      const dataISO = format(dia, 'yyyy-MM-dd');
      const ocupacaoDia = ocupacao.get(dataISO);
      
      return {
        dateISO: dataISO,
        status: ocupacaoDia?.status || getStatusFromEquipamento(equip.status_global),
        contratoNumero: ocupacaoDia?.contrato,
        clienteNome: ocupacaoDia?.cliente
      };
    });
    
    linhas.push({
      id: equip.id,
      display: `${equip.codigo_interno} - ${modelo}`,
      grupo,
      modelo,
      tipo: 'SERIALIZADO',
      dias
    });
  });
  
  // Linhas para equipamentos SALDO (agrupados por modelo)
  const modelosMap = new Map<string, typeof equipamentosSaldo>();
  equipamentosSaldo.forEach(equip => {
    const modeloKey = `${equip.grupo_id}-${equip.modelo_id}`;
    if (!modelosMap.has(modeloKey)) {
      modelosMap.set(modeloKey, []);
    }
    modelosMap.get(modeloKey)!.push(equip);
  });
  
  modelosMap.forEach((equipsList, modeloKey) => {
    if (equipsList.length === 0) return;
    
    const primeiro = equipsList[0];
    const grupo = grupos.find(g => g.id === primeiro.grupo_id)?.nome || 'Sem Grupo';
    const modelo = modelos.find(m => m.id === primeiro.modelo_id)?.nome_comercial || 'Sem Modelo';
    const saldos = primeiro.saldos_por_loja as Record<string, { qtd: number }> || {};
    const totalSaldo = saldos[lojaId]?.qtd || 0;
    
    // Consolidar ocupação por dia para o modelo
    const dias: AgendaDia[] = range30d.map(dia => {
      const dataISO = format(dia, 'yyyy-MM-dd');
      let ocupados = 0;
      let statusPrioridade: StatusDisponibilidade = 'DISPONIVEL';
      let contrato: string | undefined;
      let cliente: string | undefined;
      
      equipsList.forEach(equip => {
        const ocupacao = ocupacaoMap.get(equip.id);
        if (ocupacao?.has(dataISO)) {
          const saldos = equip.saldos_por_loja as Record<string, { qtd: number }> || {};
          ocupados += saldos[lojaId]?.qtd || 0;
          const ocupacaoDia = ocupacao.get(dataISO)!;
          if (getStatusPriority(ocupacaoDia.status) > getStatusPriority(statusPrioridade)) {
            statusPrioridade = ocupacaoDia.status;
            contrato = ocupacaoDia.contrato;
            cliente = ocupacaoDia.cliente;
          }
        }
      });
      
      // Se mais da metade está ocupada, mostrar como ocupado
      const finalStatus = ocupados >= totalSaldo / 2 ? statusPrioridade : 'DISPONIVEL';
      
      return {
        dateISO: dataISO,
        status: finalStatus,
        contratoNumero: contrato,
        clienteNome: cliente
      };
    });
    
    linhas.push({
      id: modeloKey,
      display: `${modelo} (${totalSaldo}x)`,
      grupo,
      modelo,
      tipo: 'SALDO',
      dias
    });
  });
  
  return linhas.sort((a, b) => a.display.localeCompare(b.display));
};

const getStatusFromEquipamento = (status: string): StatusDisponibilidade => {
  switch (status) {
    case 'DISPONIVEL': return 'DISPONIVEL';
    case 'RESERVADO': return 'RESERVADO';
    case 'LOCADO': return 'LOCADO';
    case 'EM_REVISAO': return 'REVISAO';
    case 'MANUTENCAO': return 'REVISAO';
    case 'EM_TRANSPORTE': return 'REVISAO';
    case 'INATIVO': return 'REVISAO';
    default: return 'DISPONIVEL';
  }
};

const getStatusPriority = (status: StatusDisponibilidade): number => {
  switch (status) {
    case 'LOCADO': return 4;
    case 'RESERVADO': return 3;
    case 'REVISAO': return 2;
    case 'DISPONIVEL': return 1;
    default: return 0;
  }
};

export const useAgendaDisponibilidadeStore = create<AgendaDisponibilidadeState>()(
  persist(
    (set, get) => ({
      filtros: {
        lojaId: '',
        tipo: 'AMBOS',
      },

      setFiltros: (novosFiltros) => {
        set((state) => ({
          filtros: { ...state.filtros, ...novosFiltros }
        }));
      },

      buildAgenda: (lojaId, equipamentos, grupos, modelos, contratos) => {
        return buildAgendaHelper(lojaId, equipamentos, grupos, modelos, contratos);
      },

      exportarCSV: (linhas, filtros) => {
        const headers = [
          'Loja',
          'Linha',
          'Grupo',
          'Modelo', 
          'Tipo',
          'Dia1', 'Dia2', 'Dia3', 'Dia4', 'Dia5', 'Dia6', 'Dia7',
          'Dia8', 'Dia9', 'Dia10', 'Dia11', 'Dia12', 'Dia13', 'Dia14',
          'Dia15', 'Dia16', 'Dia17', 'Dia18', 'Dia19', 'Dia20', 'Dia21',
          'Dia22', 'Dia23', 'Dia24', 'Dia25', 'Dia26', 'Dia27', 'Dia28',
          'Dia29', 'Dia30'
        ];
        
        const statusMap = {
          'DISPONIVEL': 'D',
          'RESERVADO': 'R', 
          'LOCADO': 'L',
          'REVISAO': 'V'
        };
        
        const rows = linhas.map(linha => [
          filtros.lojaId,
          linha.display,
          linha.grupo,
          linha.modelo,
          linha.tipo,
          ...linha.dias.map(dia => statusMap[dia.status])
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(';'))
          .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `agenda-disponibilidade-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
      },

      exportarPDF: (linhas, filtros) => {
        // Mock PDF generation - open print dialog
        const printContent = `
          <div style="font-family: Arial, sans-serif; font-size: 12px;">
            <h2>Agenda de Disponibilidade (30 dias)</h2>
            <p>Loja: ${filtros.lojaId} | Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Usuário: Admin</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ccc; padding: 4px; text-align: left;">Equipamento/Modelo</th>
                  ${Array.from({ length: 30 }, (_, i) => {
                    const dia = addDays(new Date(), i);
                    return `<th style="border: 1px solid #ccc; padding: 2px; text-align: center; font-size: 10px;">${format(dia, 'dd/MM')}</th>`;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${linhas.map(linha => `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 4px;">${linha.display}</td>
                    ${linha.dias.map(dia => `<td style="border: 1px solid #ccc; padding: 2px; text-align: center; font-size: 10px;">${dia.status.charAt(0)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.print();
        }
      },
    }),
    {
      name: 'agenda-disponibilidade-store-v1',
    }
  )
);