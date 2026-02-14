// Tipos para agenda de disponibilidade de equipamentos

export type StatusDisponibilidade = 'DISPONIVEL' | 'RESERVADO' | 'LOCADO' | 'REVISAO';

export interface AgendaDia {
  dateISO: string;
  status: StatusDisponibilidade;
  contratoNumero?: string;
  clienteNome?: string;
}

export interface LinhaAgenda {
  id: string;
  display: string;
  grupo: string;
  modelo: string;
  tipo: 'SERIALIZADO' | 'SALDO';
  dias: AgendaDia[];
}

export interface FiltrosAgenda {
  lojaId: string;
  grupoId?: string;
  modeloId?: string;
  tipo?: 'SERIALIZADO' | 'SALDO' | 'AMBOS';
  busca?: string;
}

export interface ContratoItem {
  equipId?: string;        // para SERIALIZADO
  modeloId?: string;       // para SALDO
  tipoControle: 'SERIALIZADO' | 'SALDO';
  status: 'RESERVADO' | 'LOCADO';
  periodo: {
    inicio: string;        // ISO date
    fim: string;          // ISO date
  };
}

export interface Contrato {
  id: string;
  numero: string;
  lojaId: string;
  clienteNome: string;
  clienteDoc: string;
  itens: ContratoItem[];
}

// Legacy types for backward compatibility
export interface EventoDisponibilidade {
  id: string;
  lojaId: string;
  tipo: "devolucaoPrevista" | "devolucaoAtrasada";
  data: string;
  equipamentoId?: string;
  modeloId: string;
  quantidade: number;
  cliente: { id: string; nome: string };
  contrato: { id: string; numero: string; periodo: "diaria"|"7"|"14"|"21"|"28" };
  statusContrato: "ativo" | "encerrado" | "atrasado";
  origem: "contrato";
  observacao?: string;
}

export interface FiltrosDisponibilidade {
  lojaId: string;
  grupoId?: string;
  modeloId?: string;
  busca?: string;
  somenteComPrevisao: boolean;
  horizonteDias: number;
}

export interface DisponibilidadeState {
  eventos: EventoDisponibilidade[];
  filtros: FiltrosDisponibilidade;
}