import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ItinerarioDia, TarefaLogistica, Motorista, Veiculo, MOTIVOS_NAO_SAIDA, MOTIVOS_NAO_ENTREGA } from '../types';
import { format, addDays } from 'date-fns';

interface ItinerarioState {
  itinerarios: ItinerarioDia[];
  motoristas: Motorista[];
  veiculos: Veiculo[];
  // Actions
  addItinerario: (itinerario: ItinerarioDia) => void;
  updateItinerario: (id: string, updates: Partial<ItinerarioDia>) => void;
  updateTarefa: (itinerarioId: string, tarefaId: string, updates: Partial<TarefaLogistica>) => void;
  addTarefa: (itinerarioId: string, tarefa: TarefaLogistica) => void;
  removeTarefa: (itinerarioId: string, tarefaId: string) => void;
  getItinerarioByDate: (dataISO: string, lojaId: string) => ItinerarioDia[];
  initializeWithMockData: () => void;
}

// Mock data para desenvolvimento
const mockMotoristas: Motorista[] = [
  { id: '1', nome: 'João Silva', telefone: '(11) 98765-4321', habilitacao: 'B, C', ativo: true },
  { id: '2', nome: 'Maria Santos', telefone: '(11) 99876-5432', habilitacao: 'B', ativo: true },
  { id: '3', nome: 'Carlos Lima', telefone: '(11) 97654-3210', habilitacao: 'B, C, D', ativo: true },
];

const mockVeiculos: Veiculo[] = [
  { id: '1', placa: 'ABC-1234', modelo: 'Sprinter', marca: 'Mercedes', ativo: true, capacidade: '3.5t' },
  { id: '2', placa: 'DEF-5678', modelo: 'HR', marca: 'Hyundai', ativo: true, capacidade: '2.5t' },
  { id: '3', placa: 'GHI-9012', modelo: 'Ducato', marca: 'Fiat', ativo: true, capacidade: '3.0t' },
];

// Gerar tarefas mock para os próximos dias
const generateMockTarefas = (data: string, count: number = 8): TarefaLogistica[] => {
  const tarefas: TarefaLogistica[] = [];
  const tipos: ('ENTREGA' | 'RETIRADA' | 'SUPORTE')[] = ['ENTREGA', 'RETIRADA', 'SUPORTE'];
  const prioridades: ('NORMAL' | 'ALTA' | 'CRITICA')[] = ['NORMAL', 'ALTA', 'CRITICA'];
  const clientes = [
    { nome: 'Construtora ABC Ltda', fone: '(11) 99876-5432' },
    { nome: 'Metalúrgica XYZ', fone: '(11) 98765-4321' },
    { nome: 'Indústria Moderna S/A', fone: '(11) 97654-3210' },
    { nome: 'Empreiteira Central', fone: '(11) 96543-2109' },
    { nome: 'Obras & Construções', fone: '(11) 95432-1098' },
    { nome: 'TecnoEdifica Ltda', fone: '(11) 94321-0987' },
    { nome: 'BuildMax Construções', fone: '(11) 93210-9876' },
    { nome: 'Estrutural Engenharia', fone: '(11) 92109-8765' }
  ];
  
  const enderecos = [
    'Rua das Flores, 123 - Centro',
    'Av. Industrial, 456 - Zona Norte', 
    'Rua Comercial, 789 - Bairro Novo',
    'Estrada Municipal, km 15',
    'Av. Construção, 321 - Distrito Industrial',
    'Rua Obras, 654 - Vila Operária',
    'Rodovia BR-101, km 25',
    'Alameda Progresso, 987 - Centro'
  ];

  for (let i = 0; i < count; i++) {
    const horaInicio = Math.floor(Math.random() * 10) + 8; // 8-17h
    const duracao = Math.floor(Math.random() * 3) + 1; // 1-3h
    
    tarefas.push({
      id: `tarefa-${data}-${i + 1}`,
      tipo: tipos[Math.floor(Math.random() * tipos.length)],
      contratoNumero: `LOC-${2024}${(i + 1).toString().padStart(3, '0')}`,
      cliente: clientes[i % clientes.length],
      endereco: enderecos[i % enderecos.length],
      telefone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      janela: {
        inicio: `${horaInicio.toString().padStart(2, '0')}:00`,
        fim: `${(horaInicio + duracao).toString().padStart(2, '0')}:00`
      },
      status: i < 2 ? 'CONCLUIDA' : i < 4 ? 'EM_ROTA' : 'PENDENTE',
      prioridade: prioridades[Math.floor(Math.random() * prioridades.length)],
      duracao: duracao * 60,
      kmPrev: Math.floor(Math.random() * 50) + 10,
      observacoes: i % 3 === 0 ? 'Equipamento grande - acesso difícil' : undefined
    });
  }
  
  return tarefas.sort((a, b) => a.janela.inicio.localeCompare(b.janela.inicio));
};

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

      initializeWithMockData: () => {
        const today = new Date();
        const mockItinerarios: ItinerarioDia[] = [];
        
        // Criar itinerários para os próximos 7 dias
        for (let i = 0; i < 7; i++) {
          const data = format(addDays(today, i), 'yyyy-MM-dd');
          
          mockItinerarios.push({
            id: `itinerario-${data}-1`,
            dataISO: data,
            lojaId: 'loja-1', // Default para mock
            motoristaId: mockMotoristas[0].id,
            motoristaInfo: {
              id: mockMotoristas[0].id,
              nome: mockMotoristas[0].nome,
              telefone: mockMotoristas[0].telefone,
            },
            veiculoId: mockVeiculos[0].id,
            veiculoInfo: {
              id: mockVeiculos[0].id,
              placa: mockVeiculos[0].placa,
              modelo: mockVeiculos[0].modelo,
            },
            tarefas: generateMockTarefas(data, 6),
            status: i === 0 ? 'EM_ANDAMENTO' : i < 3 ? 'PLANEJADO' : 'PLANEJADO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          // Segundo motorista em alguns dias
          if (i % 2 === 1) {
            mockItinerarios.push({
              id: `itinerario-${data}-2`,
              dataISO: data,
              lojaId: 'loja-1',
              motoristaId: mockMotoristas[1].id,
              motoristaInfo: {
                id: mockMotoristas[1].id,
                nome: mockMotoristas[1].nome,
                telefone: mockMotoristas[1].telefone,
              },
              veiculoId: mockVeiculos[1].id,
              veiculoInfo: {
                id: mockVeiculos[1].id,
                placa: mockVeiculos[1].placa,
                modelo: mockVeiculos[1].modelo,
              },
              tarefas: generateMockTarefas(data, 4),
              status: 'PLANEJADO',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        set({
          motoristas: mockMotoristas,
          veiculos: mockVeiculos,
          itinerarios: mockItinerarios,
        });
      },
    }),
    {
      name: 'itinerario-logistica-store',
      version: 1,
    }
  )
);

// Initialize with mock data if empty
if (typeof window !== 'undefined') {
  const store = useItinerarioStore.getState();
  if (store.itinerarios.length === 0) {
    store.initializeWithMockData();
  }
}