// Tipos específicos do módulo de Equipamentos

export type TipoItem = 'SERIALIZADO' | 'SALDO';

export type StatusEquipamento = 'DISPONIVEL' | 'RESERVADO' | 'LOCADO' | 'EM_REVISAO' | 'MANUTENCAO' | 'EM_TRANSPORTE' | 'INATIVO';

export type StatusTransferencia = 'EM_TRANSITO' | 'PENDENTE_ACEITE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';

// Estruturas base
export interface Loja {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
}

export interface Grupo {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Modelo {
  id: string;
  grupoId: string;
  fabricante?: string;
  nomeComercial: string;
  fotos?: string[];
  links?: {
    manual?: string;
    video?: string;
  };
  tabelaPorLoja: Record<string, {
    DIARIA: number;
    SEMANA: number;
    QUINZENA: number;
    D21: number;
    MES: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface EquipamentoCompleto {
  id: string; // código interno global, ex: BET015
  tipo: TipoItem;
  modeloId: string;
  grupoId: string;
  numeroSerie: string | string[]; // string para SERIALIZADO, array para SALDO
  valorIndenizacao: number; // obrigatório
  fotos?: string[];
  links?: {
    manual?: string;
    video?: string;
    nfCompra?: string;
  };
  dataCompra?: string;
  // Disponibilidade multiunidade
  saldosPorLoja: Record<string, { qtd: number }>; // para SALDO
  lojaAtualId?: string; // para SERIALIZADO (onde está fisicamente)
  statusGlobal: StatusEquipamento;
  historico: TimelineEventEquipamento[];
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transferencia {
  id: string;
  equipId: string;
  origemLojaId: string;
  destinoLojaId: string;
  qtd: number; // para SALDO; para SERIALIZADO = 1
  status: StatusTransferencia;
  criadoPor: {
    id: string;
    nome: string;
    perfil: string;
  };
  criadoEm: string;
  recebidoPor?: {
    id: string;
    nome: string;
  };
  recebidoEm?: string;
  motivoRecusa?: string;
}

export interface TimelineEventEquipamento {
  id: string;
  timestamp: string;
  tipo: 'CRIACAO' | 'TRANSFERENCIA_ENVIADA' | 'TRANSFERENCIA_RECEBIDA' | 'TRANSFERENCIA_RECUSADA' | 'ALTERACAO_STATUS' | 'ALTERACAO_PRECO' | 'INATIVACAO' | 'CONTRATO_CRIADO' | 'CONTRATO_RENOVADO' | 'CONTRATO_DEVOLVIDO' | 'CONTRATO_SUBSTITUIDO';
  descricao: string;
  usuario: string;
  meta?: {
    // Transferências
    quantidade?: number;
    origemLojaId?: string;
    origemLojaNome?: string;
    destinoLojaId?: string;
    destinoLojaNome?: string;
    transferenciaId?: string;
    transferenciaNumero?: number;
    motivoRecusa?: { tipo: string; detalhe: string };
    tempoTransito?: number; // minutos
    
    // Alteração de Status
    statusAnterior?: string;
    statusNovo?: string;
    motivoAlteracao?: string;
    contratoId?: string;
    contratoNumero?: string;
    osId?: string;
    
    // Alteração de Preço
    periodo?: string;
    valorAnterior?: number;
    valorNovo?: number;
    lojaId?: string;
    lojaNome?: string;
    percentualVariacao?: number;
    
    // Criação
    quantidadeInicial?: number;
    lojaInicialId?: string;
    lojaInicialNome?: string;
    valorIndenizacao?: number;
    
    // Inativação
    motivoInativacao?: string;
    saldosFinais?: Record<string, number>;
    contratosAtivos?: string[];
    
    // Contratos
    periodoAnterior?: string;
    novaDataFim?: string;
    valorRenovacao?: number;
    dataLocacao?: string;
    dataDevolucao?: string;
    dataInicio?: string;
    dataFim?: string;
  };
}

// Tipos para agenda/disponibilidade
export interface EventoAgenda {
  id: string;
  equipamentoId: string;
  inicio: string;
  fim: string;
  tipo: 'LOCACAO' | 'MANUTENCAO' | 'RESERVA';
  contratoId?: string;
  descricao: string;
  status: 'AGENDADO' | 'ATIVO' | 'CONCLUIDO';
}

// Filtros para listagem
export interface FiltrosEquipamento {
  lojaId?: string;
  grupoId?: string;
  modeloId?: string;
  status?: StatusEquipamento;
  search?: string;
  tipo?: TipoItem;
}

// Relatórios
export interface TaxaUtilizacao {
  equipamentoId: string;
  periodo: string;
  diasTotais: number;
  diasLocados: number;
  taxa: number; // percentual
}

export interface RankingEquipamento {
  equipamentoId: string;
  equipamento: EquipamentoCompleto;
  metrica: number;
  posicao: number;
}