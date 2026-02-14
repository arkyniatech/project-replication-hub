// Legacy types for backward compatibility with old disponibilidade system

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

export interface LinhaAgendaLegacy {
  id: string;
  tipo: 'SERIE' | 'SALDO';
  codigo: string;
  descricao: string;
  grupoNome: string;
  modeloNome: string;
  eventos: EventoDisponibilidade[];
}

export interface DisponibilidadeState {
  eventos: EventoDisponibilidade[];
  filtros: FiltrosDisponibilidade;
}