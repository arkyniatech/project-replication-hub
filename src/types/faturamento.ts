// Tipos para o módulo de Faturamento

export interface LancamentoFaturavel {
  id: string;
  contratoId: string;
  contratoNumero: string;
  clienteId: string;
  clienteNome: string;
  itemDescricao: string;
  periodo: {
    inicio: string;
    fim: string;
  };
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  situacao: 'OK' | 'DIVERGENTE';
  motivoDivergencia?: string;
  origem: 'CONTRATO' | 'RENOVACAO' | 'ADITIVO' | 'DEVOLUCAO';
  observacaoImpressao?: string;
  centroCusto?: string;
  selecionado?: boolean;
}

export interface FaturaHeader {
  unidadeId: string;
  clienteId: string;
  clienteNome: string;
  dtCorteInicio: string;
  dtCorteFim: string;
  vencimento: string;
  formaPagamento: 'PIX' | 'BOLETO' | 'OUTRO';
  observacoes?: string;
  instrucoesCobranca?: string;
}

export interface FaturaTotais {
  base: number;
  descontos: number;
  impostos: number; // placeholder
  total: number;
  itensSelecionados: number;
}

export interface FaturaEmitida {
  id: string;
  numero: string;
  unidadeId: string;
  clienteId: string;
  clienteNome: string;
  itens: LancamentoFaturavel[];
  totais: FaturaTotais;
  vencimento: string;
  formaPagamento: string;
  status: 'EMITIDA' | 'ENVIADA' | 'PAGA' | 'CANCELADA';
  observacoes?: string;
  cobrancaId?: string; // ID da cobrança BolePix
  emitidaEm: string;
  emitidaPor: string;
  timeline: FaturaTimelineEvent[];
}

export interface FaturaTimelineEvent {
  id: string;
  tipo: 'EMISSAO' | 'COBRANCA_GERADA' | 'ENVIADA' | 'CANCELADA' | 'ESTORNADA' | 'JUSTIFICATIVA_INADIMPLENCIA';
  descricao: string;
  usuario: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface FaturamentoFilters {
  unidadeId: string;
  clienteId?: string;
  dtIni: string;
  dtFim: string;
  status?: 'A_FATURAR' | 'JA_FATURADO' | 'DIVERGENTE';
  centroCusto?: string;
}

export interface FaturamentoKPIs {
  selecionados: number;
  emAtraso: number;
  proximos7Dias: number;
  ultimoPagamento?: string;
}

export interface FaturamentoException {
  tipo: 'INADIMPLENCIA_BLOQUEADA' | 'ITEM_DIVERGENTE' | 'BOLETO_DUPLICADO' | 'BANCO_OFFLINE';
  titulo: string;
  descricao: string;
  dados?: Record<string, any>;
  acaoRequerida?: 'JUSTIFICATIVA' | 'RETRY' | 'CONTATO_SUPORTE';
}

// Config de templates de mensagem
export interface MensagemTemplate {
  id: string;
  nome: string;
  tipo: 'EMAIL' | 'WHATSAPP';
  assunto?: string;
  corpo: string;
  variaveis: string[];
}

export interface FaturamentoConfig {
  diasProtesto: number;
  multaPercentual: number;
  jurosAoDia: number;
  modelosPadrao: {
    email: string;
    whatsapp: string;
  };
  bloqueioInadimplencia: boolean;
  exigirJustificativa: boolean;
}