export interface EmissaoAvulsaConfig {
  enabled: boolean;
  maxItensPorFatura: number;
  telemetria: {
    contadorMensal: number;
    ultimoUso: string | null;
    usuarioId: string;
  };
}

export interface EmissaoAvulsaStats {
  totalEmissoes: number;
  mesAtual: number;
  mediaMensal: number;
  formasPreferidas: Record<string, number>;
}

export interface EmissaoAvulsaEvent {
  tipo: 'PREVIEW' | 'GERADA' | 'COBRANCA' | 'ENVIADA';
  timestamp: string;
  usuario: string;
  faturaId?: string;
  valor?: number;
  canal?: 'EMAIL' | 'WHATSAPP';
}

export type EmissaoAvulsaTipo = 'AVULSA';
export type EmissaoAvulsaFormaPagamento = 'PIX' | 'BOLETO' | 'OUTRO';

export interface ItemAvulso {
  id: string;
  descricao: string;
  quantidade: number;
  valor: number;
  subtotal: number;
  tipo: 'FRETE' | 'AJUSTE' | 'TAXA_ADMIN' | 'DIFERENCA' | 'OUTRO';
}

export interface FaturaAvulsa {
  id: string;
  numero: string;
  tipo: EmissaoAvulsaTipo;
  serie: string; // FAV-{LOJA}-{seq6}
  clienteId: string;
  clienteNome: string;
  contratoId?: string;
  contratoNumero?: string;
  emissao: string;
  vencimento: string;
  itens: ItemAvulso[];
  subtotal: number;
  acrescimos: number;
  descontos: number;
  total: number;
  formaPagamento: EmissaoAvulsaFormaPagamento;
  observacoes?: string;
  instrucoesCobranca?: string;
  status: 'EMITIDA' | 'ENVIADA' | 'CANCELADA';
  cobrancaId?: string;
  origem: 'EMISSAO_AVULSA';
  emitidaEm: string;
  emitidaPor: string;
  timeline: EmissaoAvulsaEvent[];
}