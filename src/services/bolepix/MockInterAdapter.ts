// Mock Adapter para BolePix - Simula API do Banco Inter
import { 
  BolePixGateway, 
  EmitChargePayload, 
  ChargeDTO, 
  ListChargesFilters 
} from '@/types/bolepix';

export class MockInterAdapter implements BolePixGateway {
  private charges = new Map<string, ChargeDTO>();
  private callbacks = new Map<string, NodeJS.Timeout>();

  async emitCharge(payload: EmitChargePayload): Promise<{ codigoSolicitacao: string; status: 'REQUESTED' }> {
    // Simular delay de rede
    await this.delay(500 + Math.random() * 1000);

    const codigoSolicitacao = this.generateCodigoSolicitacao();
    
    // Criar charge inicial
    const charge: ChargeDTO = {
      codigoSolicitacao,
      status: 'REQUESTED',
      valor: payload.valor,
      vencimento: payload.vencimento,
      sacado: payload.sacado
    };

    this.charges.set(codigoSolicitacao, charge);

    // Simular processamento assíncrono (webhook)
    const timeout = setTimeout(() => {
      this.processChargeAsync(codigoSolicitacao, payload);
    }, 2000 + Math.random() * 3000);

    this.callbacks.set(codigoSolicitacao, timeout);

    return { codigoSolicitacao, status: 'REQUESTED' };
  }

  async getCharge(codigoSolicitacao: string): Promise<ChargeDTO> {
    await this.delay(200 + Math.random() * 300);
    
    const charge = this.charges.get(codigoSolicitacao);
    if (!charge) {
      throw new Error(`Cobrança não encontrada: ${codigoSolicitacao}`);
    }
    
    return charge;
  }

  async listCharges(filters?: ListChargesFilters): Promise<ChargeDTO[]> {
    await this.delay(300 + Math.random() * 500);
    
    let charges = Array.from(this.charges.values());
    
    if (filters?.statusIn) {
      charges = charges.filter(c => filters.statusIn!.includes(c.status));
    }
    
    if (filters?.limit) {
      charges = charges.slice(0, filters.limit);
    }
    
    return charges;
  }

  async cancelCharge(codigoSolicitacao: string, reason?: string): Promise<{ status: string }> {
    await this.delay(500 + Math.random() * 800);
    
    const charge = this.charges.get(codigoSolicitacao);
    if (!charge) {
      throw new Error(`Cobrança não encontrada: ${codigoSolicitacao}`);
    }
    
    if (charge.status === 'PAID') {
      throw new Error('Não é possível cancelar cobrança já paga');
    }
    
    // Cancelar timeout pendente
    const timeout = this.callbacks.get(codigoSolicitacao);
    if (timeout) {
      clearTimeout(timeout);
      this.callbacks.delete(codigoSolicitacao);
    }
    
    charge.status = 'CANCELLED';
    this.charges.set(codigoSolicitacao, charge);
    
    // Simular webhook de cancelamento
    setTimeout(() => {
      this.triggerWebhook('COBRANCA_CANCELADA', codigoSolicitacao, { reason });
    }, 1000);
    
    return { status: 'CANCELLED' };
  }

  async getPdf(codigoSolicitacao: string): Promise<{ url: string }> {
    await this.delay(800 + Math.random() * 1200);
    
    const charge = this.charges.get(codigoSolicitacao);
    if (!charge || charge.status !== 'ISSUED') {
      throw new Error('PDF não disponível para esta cobrança');
    }
    
    // Retornar URL mock
    return { 
      url: `data:application/pdf;base64,mock-pdf-${codigoSolicitacao}` 
    };
  }

  async registerWebhook(url: string): Promise<void> {
    await this.delay(300);
    console.log(`[MockInterAdapter] Webhook registrado: ${url}`);
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.delay(300);
    console.log(`[MockInterAdapter] Webhook removido: ${id}`);
  }

  // Métodos auxiliares mock
  private async processChargeAsync(codigoSolicitacao: string, payload: EmitChargePayload) {
    const charge = this.charges.get(codigoSolicitacao);
    if (!charge) return;

    // Simular sucesso 90% das vezes
    if (Math.random() < 0.9) {
      charge.status = 'ISSUED';
      charge.linhaDigitavel = this.generateLinhaDigitavel();
      charge.codigoBarras = this.generateCodigoBarras();
      
      if (payload.pixHabilitado) {
        charge.pixCopiaECola = this.generatePixCopiaECola(payload.valor);
        charge.qrCodeDataUrl = this.generateQRCodeDataUrl(charge.pixCopiaECola);
      }
      
      charge.pdfUrl = `data:application/pdf;base64,mock-pdf-${codigoSolicitacao}`;
      
      this.charges.set(codigoSolicitacao, charge);
      
      // Trigger webhook
      this.triggerWebhook('COBRANCA_EMITIDA', codigoSolicitacao, {
        linhaDigitavel: charge.linhaDigitavel,
        pixCopiaECola: charge.pixCopiaECola
      });
    } else {
      // Simular erro 10%
      charge.status = 'EXPIRED';
      this.charges.set(codigoSolicitacao, charge);
      
      this.triggerWebhook('COBRANCA_EXPIRADA', codigoSolicitacao, {
        erro: 'Erro no processamento bancário'
      });
    }
    
    this.callbacks.delete(codigoSolicitacao);
  }

  private triggerWebhook(tipo: string, codigoSolicitacao: string, payload: any) {
    // Simular evento de webhook
    const event = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      codigoSolicitacao,
      status: this.charges.get(codigoSolicitacao)?.status || 'UNKNOWN',
      dataEvento: new Date().toISOString(),
      payload,
      processado: false,
      tentativas: 0
    };

    // Disparar evento customizado para ser capturado pelo store
    window.dispatchEvent(new CustomEvent('bolepix-webhook', {
      detail: event
    }));
  }

  private generateCodigoSolicitacao(): string {
    return `INTER_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private generateLinhaDigitavel(): string {
    // Linha digitável mock no formato padrão
    const banco = '341';
    const random = Math.random().toString().substr(2, 20);
    return `${banco}9.${random.substr(0, 5)} ${random.substr(5, 5)}.${random.substr(10, 6)} ${random.substr(16, 1)} ${random.substr(17, 3)}${Date.now().toString().substr(-10)}`;
  }

  private generateCodigoBarras(): string {
    return `34191${Date.now().toString().substr(-10)}${Math.random().toString().substr(2, 20)}`;
  }

  private generatePixCopiaECola(valor: number): string {
    const pixKey = 'pix@bancointer.com.br';
    const random = Math.random().toString(36).substr(2, 9);
    return `00020126580014BR.GOV.BCB.PIX0136${pixKey}0208${random}520400005303986540${valor.toFixed(2)}5802BR5913Banco Inter6008BRASILIA62070503***6304${Math.random().toString().substr(2, 4).toUpperCase()}`;
  }

  private generateQRCodeDataUrl(pixString: string): string {
    // QR Code mock - seria gerado pelo backend real
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Método público para testes - simular pagamento manual
  simulatePayment(codigoSolicitacao: string) {
    const charge = this.charges.get(codigoSolicitacao);
    if (charge && charge.status === 'ISSUED') {
      charge.status = 'PAID';
      this.charges.set(codigoSolicitacao, charge);
      
      this.triggerWebhook('COBRANCA_PAGA', codigoSolicitacao, {
        valorPago: charge.valor,
        dataPagamento: new Date().toISOString()
      });
    }
  }
}