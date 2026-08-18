// Backend Adapter para BolePix - Integração via Edge Function
import {
  BolePixGateway,
  EmitChargePayload,
  ChargeDTO,
  ListChargesFilters
} from '@/types/bolepix';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Lê o campo `error` do corpo de uma resposta não-2xx da Edge Function.
 * Devolve null quando não há corpo utilizável — HTML de gateway, corpo vazio,
 * JSON sem o campo — para que o chamador caia no genérico em vez de estourar.
 */
async function lerErroDoCorpo(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const corpo = await error.context.json();
    const mensagem = corpo?.error;
    return typeof mensagem === 'string' && mensagem.trim() ? mensagem : null;
  } catch {
    // Corpo não-JSON (ex.: HTML 502 do gateway) ou já consumido.
    return null;
  }
}

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

    if (error) {
      // supabase.functions.invoke DESCARTA o corpo da resposta quando o status
      // não é 2xx: error.message vira sempre "Edge Function returned a non-2xx
      // status code". O motivo real — "Credenciais Inter não configuradas para
      // esta loja" (404), "Sem acesso a esta loja" (403), "Apenas master/admin
      // pode alterar credenciais bancárias" (403) — fica no corpo, acessível
      // via error.context, que é a Response do fetch.
      // Sem isto, NENHUMA mensagem útil do inter-proxy chega ao operador, e a
      // tela mostra um genérico que não diz o que fazer.
      const especifico = await lerErroDoCorpo(error);
      // A mensagem específica vai crua para a tela: ela já é escrita para o
      // operador. O prefixo genérico só sobra quando não há corpo legível.
      throw new Error(especifico ?? `Erro na Edge Function: ${error.message}`);
    }
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
