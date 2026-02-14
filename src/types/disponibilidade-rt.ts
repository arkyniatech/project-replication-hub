export interface DisponibilidadeConflito {
  tipo: 'RESERVA' | 'MANUTENCAO' | 'TRANSFERENCIA' | 'CONTAGEM_CEGA' | 'LOCADO';
  origem: string; // ID do contrato, transferência, etc.
  detalhes: string;
  periodo?: {
    inicio: string;
    fim: string;
  };
  gravidade: 'BLOQUEANTE' | 'AVISO';
}

export interface DisponibilidadeResultado {
  disponivel: boolean;
  quantidade: number; // Para itens SALDO
  conflitos: DisponibilidadeConflito[];
  alternativas?: {
    outrosPeriodos?: string[];
    outrasQuantidades?: number[];
    outrosSeries?: string[];
  };
}

export interface ReservaSoft {
  id: string;
  contratoRascunhoId: string;
  equipamentoId?: string;
  modeloId?: string;
  tipoControle: 'SERIALIZADO' | 'SALDO';
  quantidade: number;
  periodo: {
    inicio: string;
    fim: string;
  };
  criadoEm: string;
  expiresAt: string; // 15 minutos por padrão
}

export interface BloqueioContagem {
  equipamentoId: string;
  sessaoId: string;
  motivo: 'EM_CONTAGEM' | 'AGUARDANDO_AJUSTE';
  bloqueadoEm: string;
}

export interface TransferenciaEmTransito {
  id: string;
  equipamentoId: string;
  origemLojaId: string;
  destinoLojaId: string;
  status: 'EM_TRANSITO';
  iniciadoEm: string;
}