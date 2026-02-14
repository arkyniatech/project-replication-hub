import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EventoDisponibilidade, FiltrosDisponibilidade, LinhaAgendaLegacy } from '@/types/disponibilidade-legacy';
import { getLojaAtivaId } from '@/hooks/useMultiunidade';
import { addDays, format, isAfter, isBefore, startOfDay } from 'date-fns';

interface DisponibilidadeState {
  eventos: EventoDisponibilidade[];
  filtros: FiltrosDisponibilidade;
  
  // Actions
  setFiltros: (filtros: Partial<FiltrosDisponibilidade>) => void;
  seedMock: (lojaId: string) => void;
  exportarCSV: (eventos: EventoDisponibilidade[]) => void;
  
  // Selectors
  eventosFiltrados: () => EventoDisponibilidade[];
  mapPorLinha: () => LinhaAgendaLegacy[];
  getEventosPorDia: (data: string) => EventoDisponibilidade[];
}

const generateMockEventos = (lojaId: string): EventoDisponibilidade[] => {
  const hoje = startOfDay(new Date());
  const eventos: EventoDisponibilidade[] = [];
  
  // Simular equipamentos com devoluções nos próximos 30 dias
  const equipamentosMock = [
    { id: 'BET001', modeloId: 'BET', tipo: 'SERIADO', descricao: 'Betoneira 400L Elite' },
    { id: 'BET002', modeloId: 'BET', tipo: 'SERIADO', descricao: 'Betoneira 400L Elite' },
    { id: 'ESC001', modeloId: 'ESC', tipo: 'SERIADO', descricao: 'Escavadeira Hidráulica' },
    { id: 'COMP001', modeloId: 'COMP', tipo: 'SALDO', descricao: 'Compressor 10HP' },
  ];

  const clientesMock = [
    { id: '1', nome: 'Construtora ABC' },
    { id: '2', nome: 'Engenharia XYZ' },
    { id: '3', nome: 'Obras & Cia' },
    { id: '4', nome: 'Construções Silva' },
  ];

  equipamentosMock.forEach((equip, index) => {
    // Gerar alguns eventos aleatórios
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      const diasAFrente = Math.floor(Math.random() * 35) + 1;
      const dataEvento = addDays(hoje, diasAFrente);
      const cliente = clientesMock[Math.floor(Math.random() * clientesMock.length)];
      
      // Alguns atrasados
      const isAtrasado = Math.random() < 0.2 && diasAFrente < 0;
      
      eventos.push({
        id: `evt-${equip.id}-${i}`,
        lojaId,
        tipo: isAtrasado ? 'devolucaoAtrasada' : 'devolucaoPrevista',
        data: format(dataEvento, 'yyyy-MM-dd'),
        equipamentoId: equip.tipo === 'SERIADO' ? equip.id : undefined,
        modeloId: equip.modeloId,
        quantidade: equip.tipo === 'SALDO' ? Math.floor(Math.random() * 3) + 1 : 1,
        cliente,
        contrato: {
          id: `LOC-${2024}${String(index * 10 + i).padStart(3, '0')}`,
          numero: `LOC-${2024}${String(index * 10 + i).padStart(3, '0')}`,
          periodo: ['7', '14', '21', '28'][Math.floor(Math.random() * 4)] as any,
        },
        statusContrato: isAtrasado ? 'atrasado' : 'ativo',
        origem: 'contrato',
      });
    }
  });

  return eventos;
};

export const useDisponibilidadeStore = create<DisponibilidadeState>()(
  persist(
    (set, get) => ({
      eventos: [],
      filtros: {
        lojaId: getLojaAtivaId() || '',
        somenteComPrevisao: true,
        horizonteDias: 30,
      },

      setFiltros: (novosFiltros) => {
        set((state) => ({
          filtros: { ...state.filtros, ...novosFiltros }
        }));
      },

      seedMock: (lojaId) => {
        const eventos = generateMockEventos(lojaId);
        set({ eventos });
      },

      exportarCSV: (eventos) => {
        const headers = [
          'Data',
          'Código/Modelo', 
          'Tipo',
          'Qtd Prevista',
          'Cliente',
          'Nº Contrato',
          'Loja'
        ];
        
        const rows = eventos.map(evento => [
          evento.data,
          evento.equipamentoId || evento.modeloId,
          evento.equipamentoId ? 'seriado' : 'saldo',
          evento.quantidade.toString(),
          evento.cliente.nome,
          evento.contrato.numero,
          evento.lojaId
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(';'))
          .join('\n');

        // Download CSV
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `agenda-disponibilidade-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
      },

      eventosFiltrados: () => {
        const { eventos, filtros } = get();
        const hoje = startOfDay(new Date());
        const dataLimite = addDays(hoje, filtros.horizonteDias);

        return eventos.filter(evento => {
          // Filtro por loja
          if (evento.lojaId !== filtros.lojaId) return false;

          // Filtro por horizonte de dias
          const dataEvento = new Date(evento.data);
          if (isAfter(dataEvento, dataLimite)) return false;

          // Filtro por grupo/modelo (implementar quando tiver integração)
          if (filtros.modeloId && evento.modeloId !== filtros.modeloId) return false;

          // Filtro por busca
          if (filtros.busca) {
            const busca = filtros.busca.toLowerCase();
            const matches = 
              (evento.equipamentoId?.toLowerCase().includes(busca)) ||
              evento.modeloId.toLowerCase().includes(busca) ||
              evento.cliente.nome.toLowerCase().includes(busca) ||
              evento.contrato.numero.toLowerCase().includes(busca);
            
            if (!matches) return false;
          }

          return true;
        });
      },

      mapPorLinha: () => {
        const eventosFiltrados = get().eventosFiltrados();
        const linhasMap = new Map<string, LinhaAgendaLegacy>();

        eventosFiltrados.forEach(evento => {
          const chave = evento.equipamentoId || evento.modeloId;
          
          if (!linhasMap.has(chave)) {
            linhasMap.set(chave, {
              id: chave,
              tipo: evento.equipamentoId ? 'SERIE' : 'SALDO',
              codigo: chave,
              descricao: evento.equipamentoId ? `Equipamento ${chave}` : `Modelo ${evento.modeloId}`,
              grupoNome: 'Grupo Mock', // TODO: integrar com equipamentosStore
              modeloNome: `Modelo ${evento.modeloId}`,
              eventos: []
            });
          }

          linhasMap.get(chave)!.eventos.push(evento);
        });

        return Array.from(linhasMap.values())
          .filter(linha => !get().filtros.somenteComPrevisao || linha.eventos.length > 0)
          .sort((a, b) => a.codigo.localeCompare(b.codigo));
      },

      getEventosPorDia: (data) => {
        return get().eventosFiltrados().filter(evento => evento.data === data);
      },
    }),
    {
      name: 'disponibilidade-store-v1',
    }
  )
);