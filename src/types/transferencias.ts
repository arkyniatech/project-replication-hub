export type TransferItem = {
  id: string; // uuid
  tipo: 'SERIAL' | 'SALDO';
  codigoInterno?: string; // ex: BET015 (apenas SERIAL)
  modeloId: string;
  grupoId: string;
  descricao: string;
  serie?: string;      // se SERIAL
  quantidade: number;  // se SALDO
};

export type TransferStatus = 'CRIADA' | 'EM_TRANSITO' | 'RECEBIDA' | 'RECUSADA' | 'CANCELADA';

export type MotivoRecusa = 'NUMERACAO' | 'DANO' | 'DESTINO' | 'OUTRO';

export type TransferLog = {
  em: string;
  porUsuarioId: string;
  porUsuarioNome: string;
  acao: string;
  detalhe?: string;
};

export type Transferencia = {
  id: string;              // nº transferência (exibir simples, só numeral)
  numero: number;          // número sequencial simples
  origemLojaId: string;
  origemLojaNome: string;
  destinoLojaId: string;
  destinoLojaNome: string;
  itens: TransferItem[];
  motorista?: string;
  veiculo?: string;
  observacoes?: string;
  status: TransferStatus;
  criadoEm: string;        // ISO
  atualizadoEm: string;    // ISO
  logs: TransferLog[];
  recusa?: { 
    motivo: MotivoRecusa; 
    detalhe?: string; 
    porUsuarioId?: string;
    porUsuarioNome?: string;
    em?: string; 
  };
};

export interface FiltrosTransferencia {
  periodo?: {
    inicio: string;
    fim: string;
  };
  origemLojaId?: string;
  destinoLojaId?: string;
  status?: TransferStatus[];
  grupoId?: string;
  modeloId?: string;
  texto?: string;
  // New fields for expanded filter support
  dataInicio?: string;
  dataFim?: string;
  origemLojaIds?: string[];
  destinoLojaIds?: string[];
  tipo?: 'SERIAL' | 'SALDO';
}

export type KPIsTransferencia = {
  pendenciasRecebidas: number;
  pendenciasEnviadas: number;
  recebidasHoje: number;
  recusadasMes: number;
};