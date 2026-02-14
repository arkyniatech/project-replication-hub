// Tipos para o módulo Financeiro (Transferências + Conciliação)

export interface Conta {
  id: string;
  lojaId: string;
  codigo: string;
  nome: string;
  banco: string;
  agencia: string;
  numero: string;
  moeda: 'BRL';
  saldoAtual: number;
  bloqueios?: number;
  ativo: boolean;
  createdAt: string;
}

export interface Transfer {
  id: string;
  lojaId: string;
  origemId: string;
  destinoId: string;
  valor: number;
  taxa?: number;
  data: string;
  status: 'PENDENTE' | 'EFETIVADA' | 'CANCELADA';
  createdBy: string;
  createdAtISO: string;
  ref?: string;
  descricao?: string;
  anexo?: string;
  centrosCusto?: string;
  observacoes?: string;
  estornoDe?: string;
}

export interface Lancamento {
  id: string;
  contaId: string;
  tipo: 'DEBITO' | 'CREDITO';
  valor: number;
  data: string;
  origem: 'TRANSFERENCIA' | 'AJUSTE' | 'MANUAL';
  refId?: string;
  cc?: string;
  descricao?: string;
  createdAtISO: string;
}

export interface Conciliacao {
  id: string;
  lojaId: string;
  contaId: string;
  periodo: {
    ini: string;
    fim: string;
  };
  saldoInicialExtrato: number;
  saldoFinalExtrato: number;
  status: 'ABERTA' | 'FECHADA';
  criadoPor: string;
  criadoEmISO: string;
}

export interface ExtratoLinha {
  id: string;
  conciliacaoId: string;
  data: string;
  historico: string;
  valor: number;
  tipo: 'C' | 'D';  // Crédito/Débito
  doc?: string;
  saldo?: number;
  pareado?: boolean;
}

export interface Match {
  id: string;
  conciliacaoId: string;
  extratoId: string;
  lancamentoId: string;
  modo: 'AUTO' | 'MANUAL';
  criadoEmISO: string;
}

export interface SaldoExport {
  dataRef: string;
  loja: string;
  contaCodigo: string;
  contaNome: string;
  banco: string;
  agencia: string;
  numero: string;
  moeda: string;
  saldoInicial: number;
  creditos: number;
  debitos: number;
  saldoFinal: number;
  saldoDisponivel: number;
  conciliadoAte?: string;
}

// Config para transferências
export interface TransferConfig {
  allowOverdraft: boolean;
  toleranciaDias: number;
  taxaPadrao: number;
}