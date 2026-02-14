// Backend Adapter para BolePix - Stub para integração futura
import {
  BolePixGateway,
  EmitChargePayload,
  ChargeDTO,
  ListChargesFilters
} from '@/types/bolepix';

export class BackendInterAdapter implements BolePixGateway {
  private baseUrl: string;

  constructor(baseUrl = '/api/inter') {
    this.baseUrl = baseUrl;
  }

  async emitCharge(payload: EmitChargePayload): Promise<{ codigoSolicitacao: string; status: 'REQUESTED' }> {
    // TODO: Implementar quando backend estiver pronto
    const response = await fetch(`${this.baseUrl}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erro ao emitir cobrança: ${response.statusText}`);
    }

    return response.json();
  }

  async getCharge(codigoSolicitacao: string): Promise<ChargeDTO> {
    // TODO: Implementar quando backend estiver pronto
    const response = await fetch(`${this.baseUrl}/charges/${codigoSolicitacao}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar cobrança: ${response.statusText}`);
    }

    return response.json();
  }

  async listCharges(filters?: ListChargesFilters): Promise<ChargeDTO[]> {
    // TODO: Implementar quando backend estiver pronto
    const params = new URLSearchParams();
    
    if (filters?.statusIn) {
      params.append('status', filters.statusIn.join(','));
    }
    if (filters?.dataInicio) {
      params.append('dataInicio', filters.dataInicio);
    }
    if (filters?.dataFim) {
      params.append('dataFim', filters.dataFim);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const response = await fetch(`${this.baseUrl}/charges?${params}`);

    if (!response.ok) {
      throw new Error(`Erro ao listar cobranças: ${response.statusText}`);
    }

    return response.json();
  }

  async cancelCharge(codigoSolicitacao: string, reason?: string): Promise<{ status: string }> {
    // TODO: Implementar quando backend estiver pronto
    const response = await fetch(`${this.baseUrl}/charges/${codigoSolicitacao}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao cancelar cobrança: ${response.statusText}`);
    }

    return response.json();
  }

  async getPdf(codigoSolicitacao: string): Promise<{ pdfBlob?: Blob; url?: string }> {
    // TODO: Implementar quando backend estiver pronto
    const response = await fetch(`${this.baseUrl}/charges/${codigoSolicitacao}/pdf`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar PDF: ${response.statusText}`);
    }

    const pdfBlob = await response.blob();
    return { pdfBlob };
  }

  async registerWebhook(url: string): Promise<void> {
    // TODO: Implementar quando backend estiver pronto
    const response = await fetch(`${this.baseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao registrar webhook: ${response.statusText}`);
    }
  }

  async deleteWebhook(id: string): Promise<void> {
    // TODO: Implementar quando backend estiver pronto
    const response = await fetch(`${this.baseUrl}/webhooks/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro ao remover webhook: ${response.statusText}`);
    }
  }
}