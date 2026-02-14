// Tipos para BolePix (Banco Inter) - Camada de Abstração

export interface CobrancaData {
  provider: 'inter' | 'none';
  metodo: 'boleto_pix';
  status: 'DRAFT' | 'REQUESTED' | 'PROCESSING' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  idempotencyKey: string;
  codigoSolicitacao?: string;
  linhaDigitavel?: string;
  codigoBarras?: string;
  pixCopiaECola?: string;
  qrCodeDataUrl?: string;
  pdfUrl?: string;
  history: CobrancaHistoryEvent[];
}

export interface CobrancaHistoryEvent {
  tsISO: string;
  event: string;
  payloadSummary?: any;
  requestId?: string;
}

// DTOs da API Inter (mock)
export interface ChargeDTO {
  codigoSolicitacao: string;
  status: 'REQUESTED' | 'PROCESSING' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  valor: number;
  vencimento: string;
  sacado: SacadoData;
  linhaDigitavel?: string;
  codigoBarras?: string;
  pixCopiaECola?: string;
  qrCodeDataUrl?: string;
  pdfUrl?: string;
}

export interface SacadoData {
  nome: string;
  cpfCnpj: string;
  email: string;
  endereco?: EnderecoData;
}

export interface EnderecoData {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface EmitChargePayload {
  valor: number;
  vencimento: string;
  sacado: SacadoData;
  multa?: number;
  juros?: number;
  descontos?: DescontoData[];
  instrucoes?: string;
  pixHabilitado: boolean;
  idempotencyKey: string;
  seuNumero?: string;
}

export interface DescontoData {
  tipo: 'FIXO' | 'PERCENTUAL';
  valor: number;
  dataLimite: string;
}

// Interface do Gateway (adapter pattern)
export interface BolePixGateway {
  emitCharge(payload: EmitChargePayload): Promise<{ codigoSolicitacao: string; status: 'REQUESTED' }>;
  getCharge(codigoSolicitacao: string): Promise<ChargeDTO>;
  listCharges(filters?: ListChargesFilters): Promise<ChargeDTO[]>;
  cancelCharge(codigoSolicitacao: string, reason?: string): Promise<{ status: string }>;
  getPdf(codigoSolicitacao: string): Promise<{ pdfBlob?: Blob; url?: string }>;
  registerWebhook(url: string): Promise<void>;
  deleteWebhook(id: string): Promise<void>;
}

export interface ListChargesFilters {
  statusIn?: string[];
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  tipo: 'COBRANCA_EMITIDA' | 'COBRANCA_PAGA' | 'COBRANCA_CANCELADA' | 'COBRANCA_EXPIRADA';
  codigoSolicitacao: string;
  status: string;
  valor?: number;
  dataEvento: string;
  payload: any;
  processado: boolean;
  tentativas: number;
  ultimaTentativa?: string;
  erro?: string;
}

// Config types
export interface InterConfig {
  clientId: string; // placeholder mascarado
  clientSecret: string; // placeholder mascarado
  certificadoUpload: boolean; // sempre false no front
  webhookUrl: string;
  ambiente: 'sandbox' | 'producao';
}

// Export types
export interface BoletoExportRow {
  tituloId: string;
  contratoId?: string;
  cliente: string;
  cnpjCpf: string;
  valor: number;
  vencimento: string;
  status: string;
  provider: string;
  codigoSolicitacao?: string;
  linhaDigitavel?: string;
  pixCopiaECola?: string;
  dataEmissao?: string;
  dataStatus?: string;
}