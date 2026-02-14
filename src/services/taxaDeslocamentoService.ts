import { AditivoContratual, Titulo, EventoTimeline } from "@/types";
import { contratoStorage } from "@/lib/storage";
import { useTaxaDeslocamentoStore } from "@/stores/taxaDeslocamentoStore";

export interface TaxaDeslocamentoData {
  contratoId: string;
  valor: number;
  justificativa?: string;
  motivo: 'NAO_ENTREGA' | 'MANUAL' | 'SUBSTITUICAO' | 'DEVOLUCAO';
  usuarioId: string;
  usuarioNome: string;
}

export class TaxaDeslocamentoService {
  
  static async aplicarTaxa(data: TaxaDeslocamentoData): Promise<{
    aditivo: AditivoContratual;
    titulo?: Titulo;
    evento: EventoTimeline;
  }> {
    const { contratoId, valor, justificativa, motivo, usuarioId, usuarioNome } = data;
    
    // Get contract
    const contrato = contratoStorage.getById(contratoId);
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    // Create aditivo
    const aditivoId = Date.now().toString();
    const numeroAditivo = (contrato.aditivos?.length || 0) + 1;
    
    const aditivo: AditivoContratual = {
      id: aditivoId,
      contratoId: contratoId,
      numero: `ADT-${numeroAditivo.toString().padStart(3, '0')}`,
      tipo: 'TAXA',
      valor: valor,
      descricao: `Taxa de deslocamento - ${this.getMotivoDescription(motivo)}`,
      justificativa: justificativa || 'Taxa aplicada conforme configuração padrão',
      vinculacao: 'CONTRATO',
      status: 'ATIVO',
      criadoPor: usuarioNome,
      criadoEm: new Date().toISOString()
    };

    // Create título CR if valor > 0
    let titulo: Titulo | undefined;
    if (valor > 0) {
      const tituloId = `TAX-${Date.now()}`;
      
      titulo = {
        id: tituloId,
        numero: `TAX-${numeroAditivo.toString().padStart(4, '0')}`,
        contratoId: contratoId,
        contrato: contrato,
        clienteId: contrato.clienteId,
        cliente: contrato.cliente,
        aditivoId: aditivoId,
        lojaId: contrato.lojaId,
        categoria: 'Locação',
        subcategoria: 'Taxa de Deslocamento',
        emissao: new Date().toISOString(),
        vencimento: contrato.pagamento.vencimentoISO,
        valor: valor,
        pago: 0,
        saldo: valor,
        forma: contrato.pagamento.forma === 'BOLETO' ? 'Boleto' : 
               contrato.pagamento.forma === 'PIX' ? 'PIX' :
               contrato.pagamento.forma === 'CARTAO' ? 'Cartão' : 'Dinheiro',
        status: 'Em aberto',
        origem: 'ADITIVO',
        timeline: [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          tipo: 'criacao',
          descricao: `Título criado por taxa de deslocamento - ${this.getMotivoDescription(motivo)}`,
          usuario: usuarioNome
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Link titulo to aditivo
      aditivo.tituloId = tituloId;
    }

    // Create timeline event
    const evento: EventoTimeline = {
      id: Date.now().toString(),
      contratoId: contratoId,
      ts: Date.now(),
      usuarioId: usuarioId,
      usuarioNome: usuarioNome,
      tipo: 'ADITIVO_CRIADO',
      resumo: `Taxa de deslocamento adicionada: R$ ${valor.toFixed(2).replace('.', ',')}${justificativa ? ` - ${justificativa}` : ''}`,
      dados: {
        tipo: 'TAXA',
        valor: valor,
        motivo: motivo,
        justificativa: justificativa
      }
    };

    // Update contract
    const updatedContract = {
      ...contrato,
      aditivos: [...(contrato.aditivos || []), aditivo],
      timeline: [...contrato.timeline, evento],
      updatedAt: new Date().toISOString()
    };

    contratoStorage.update(contratoId, updatedContract);

    // Mock save título to CR system
    if (titulo) {
      // In real app, would save to títulos store
      console.log('Título criado:', titulo);
    }

    return { aditivo, titulo, evento };
  }

  static getMotivoDescription(motivo: string): string {
    switch (motivo) {
      case 'NAO_ENTREGA':
        return 'não entrega';
      case 'SUBSTITUICAO':
        return 'substituição com não entrega';
      case 'DEVOLUCAO':
        return 'devolução com não entrega';
      case 'MANUAL':
        return 'cobrança manual';
      default:
        return 'taxa aplicada';
    }
  }

  static getValorPadraoLoja(lojaId: string): number {
    const store = useTaxaDeslocamentoStore.getState();
    const config = store.getConfigByLoja(lojaId);
    return config?.valorPadrao || 50.00;
  }

  static isAtivaNaLoja(lojaId: string): boolean {
    const store = useTaxaDeslocamentoStore.getState();
    const config = store.getConfigByLoja(lojaId);
    return config?.ativo ?? true;
  }
}