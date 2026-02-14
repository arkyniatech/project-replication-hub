// Tipos específicos do módulo de logística

export interface TarefaLogistica {
  id: string;
  tipo: 'ENTREGA' | 'RETIRADA' | 'SUPORTE';
  contratoNumero: string;
  cliente: {
    nome: string;
    fone: string;
  };
  endereco: string;
  telefone?: string;
  janela: {
    inicio: string; // HH:mm
    fim: string; // HH:mm
  };
  status: 'PENDENTE' | 'EM_ROTA' | 'CONCLUIDA' | 'REAGENDADA' | 'NAO_SAIDA' | 'NAO_ENTREGUE';
  motivo?: string;
  reagendadoPara?: string; // ISO string
  kmPrev?: number;
  observacoes?: string;
  checkInGeo?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  prioridade: 'NORMAL' | 'ALTA' | 'CRITICA';
  duracao?: number; // minutos estimados
}

export interface ItinerarioDia {
  id: string;
  dataISO: string;
  lojaId: string;
  motoristaId: string;
  motoristaInfo: {
    id: string;
    nome: string;
    telefone: string;
  };
  veiculoId: string;
  veiculoInfo: {
    id: string;
    placa: string;
    modelo: string;
  };
  tarefas: TarefaLogistica[];
  status: 'PLANEJADO' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  kmInicial?: number;
  kmFinal?: number;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  habilitacao: string;
  ativo: boolean;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ativo: boolean;
  capacidade?: string;
}

export type TipoTarefa = 'ENTREGA' | 'RETIRADA' | 'SUPORTE';
export type StatusTarefa = 'PENDENTE' | 'EM_ROTA' | 'CONCLUIDA' | 'REAGENDADA' | 'NAO_SAIDA' | 'NAO_ENTREGUE';
export type PrioridadeTarefa = 'NORMAL' | 'ALTA' | 'CRITICA';

// Motivos padronizados
export const MOTIVOS_NAO_SAIDA = [
  'Motorista atrasou tarefas anteriores',
  'Cliente solicitou reagendamento', 
  'Equipamento não liberado pela manutenção',
  'Problemas com veículo',
  'Condições climáticas adversas'
];

export const MOTIVOS_NAO_ENTREGA = [
  'Cliente ausente',
  'Local não encontrado',
  'Local de descarga inadequado',
  'Cliente rejeitou entrega',
  'Acesso negado no local',
  'Condições de segurança inadequadas'
];

// Tipo para modal de motivo
export type MotivoTipo = 'NAO_SAIDA' | 'NAO_ENTREGA';