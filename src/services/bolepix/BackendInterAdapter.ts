// Backend Adapter para BolePix - Integração via Edge Function
import {
  BolePixGateway,
  EmitChargePayload,
  ChargeDTO,
  ListChargesFilters
} from '@/types/bolepix';
import { supabase } from '@/integrations/supabase/client';

export class BackendInterAdapter implements BolePixGateway {
  private lojaId: string;

  constructor(lojaId: string = '') {
    this.lojaId = lojaId;
  }

  setLojaId(lojaId: string) {
    this.lojaId = lojaId;
  }

  private async invokeProxy(action: string, payload?: any) {
    const { data, error } = await supabase.functions.invoke('inter-proxy', {
      body: {
        action,
        loja_id: this.lojaId,
        payload: payload || {},
      },
    });

    if (error) throw new Error(`Erro na Edge Function: ${error.message}`);
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async emitCharge(payload: EmitChargePayload): Promise<{ codigoSolicitacao: string; status: 'REQUESTED' }> {
    const interPayload = {
      seuNumero: payload.seuNumero || payload.idempotencyKey,
      valorNominal: payload.valor,
      dataVencimento: payload.vencimento,
      numDiasAgenda: 30,
      pagador: {
        cpfCnpj: payload.sacado.cpfCnpj,
        tipoPessoa: payload.sacado.cpfCnpj.length > 11 ? 'JURIDICA' : 'FISICA',
        nome: payload.sacado.nome,
        email: payload.sacado.email,
        endereco: payload.sacado.endereco ? {
          cep: payload.sacado.endereco.cep,
          logradouro: payload.sacado.endereco.logradouro,
          numero: payload.sacado.endereco.numero,
          bairro: payload.sacado.endereco.bairro,
          cidade: payload.sacado.endereco.cidade,
          uf: payload.sacado.endereco.uf,
        } : undefined,
      },
      ...(payload.multa && { multa: { codigoMulta: 'PERCENTUAL', taxa: payload.multa } }),
      ...(payload.juros && { mora: { codigoMora: 'TAXAMENSAL', taxa: payload.juros } }),
    };

    const result = await this.invokeProxy('emitir-boleto', interPayload);
    return {
      codigoSolicitacao: result.codigoSolicitacao || result.nossoNumero || 'PENDING',
      status: 'REQUESTED',
    };
  }

  async getCharge(codigoSolicitacao: string): Promise<ChargeDTO> {
    const result = await this.invokeProxy('consultar-boleto', { codigoSolicitacao });
    
    return {
      codigoSolicitacao: result.codigoSolicitacao || codigoSolicitacao,
      status: result.situacao || result.status || 'PROCESSING',
      valor: result.valorNominal || 0,
      vencimento: result.dataVencimento || '',
      sacado: {
        nome: result.pagador?.nome || '',
        cpfCnpj: result.pagador?.cpfCnpj || '',
        email: result.pagador?.email || '',
      },
      linhaDigitavel: result.linhaDigitavel,
      codigoBarras: result.codigoBarras,
      pixCopiaECola: result.pixCopiaECola,
    };
  }

  async listCharges(filters?: ListChargesFilters): Promise<ChargeDTO[]> {
    // Inter API uses date-range based listing
    const payload: any = {};
    if (filters?.dataInicio) payload.dataInicio = filters.dataInicio;
    if (filters?.dataFim) payload.dataFim = filters.dataFim;
    if (filters?.statusIn) payload.filtrarSituacao = filters.statusIn.join(',');

    const result = await this.invokeProxy('consultar-boleto', payload);
    return Array.isArray(result) ? result : [];
  }

  async cancelCharge(codigoSolicitacao: string, reason?: string): Promise<{ status: string }> {
    return await this.invokeProxy('cancelar-boleto', { codigoSolicitacao, motivo: reason });
  }

  async getPdf(codigoSolicitacao: string): Promise<{ pdfBlob?: Blob; url?: string }> {
    const result = await this.invokeProxy('get-pdf', { codigoSolicitacao });
    
    if (result.pdf_base64) {
      const binaryString = atob(result.pdf_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { pdfBlob: new Blob([bytes], { type: 'application/pdf' }) };
    }

    return {};
  }

  async registerWebhook(url: string): Promise<void> {
    // Webhook is configured via Inter dashboard, not API
    console.log('Webhook URL to register in Inter dashboard:', url);
  }

  async deleteWebhook(id: string): Promise<void> {
    // Webhook is managed via Inter dashboard
    console.log('Webhook to delete in Inter dashboard:', id);
  }
}
