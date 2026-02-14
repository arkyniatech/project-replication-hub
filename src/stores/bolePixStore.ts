// Store para gerenciar BolePix/Inter
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CobrancaData,
  WebhookEvent,
  InterConfig,
  BoletoExportRow,
  BolePixGateway
} from '@/types/bolepix';
import { MockInterAdapter } from '@/services/bolepix/MockInterAdapter';
import { BackendInterAdapter } from '@/services/bolepix/BackendInterAdapter';

interface BolePixState {
  // Config
  config: InterConfig;
  useBackend: boolean;
  
  // Webhook events
  webhookEvents: WebhookEvent[];
  
  // Gateway instance
  gateway: BolePixGateway;
  
  // Actions
  setConfig: (config: Partial<InterConfig>) => void;
  toggleBackend: (useBackend: boolean) => void;
  
  // Webhook management
  addWebhookEvent: (event: WebhookEvent) => void;
  markEventAsProcessed: (eventId: string) => void;
  reprocessWebhookEvent: (eventId: string) => void;
  clearWebhookEvents: () => void;
  
  // Cobrança management
  updateTituloCobranca: (tituloId: string, cobranca: Partial<CobrancaData>) => void;
  
  // Export
  exportBoletos: (titulos: any[]) => void;
  
  // Utils
  generateIdempotencyKey: (tituloId: string, vencimento: string) => string;
  
  // Seed/clear
  seedTestData: () => void;
  clearData: () => void;
}

const createInitialConfig = (): InterConfig => ({
  clientId: '****-****-****-****',
  clientSecret: '****-****-****-****',
  certificadoUpload: false,
  webhookUrl: 'https://api.exemplo.com/webhooks/inter',
  ambiente: 'sandbox'
});

export const useBolePixStore = create<BolePixState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: createInitialConfig(),
      useBackend: false,
      webhookEvents: [],
      gateway: new MockInterAdapter(),
      
      // Config actions
      setConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig }
      })),
      
      toggleBackend: (useBackend) => set((state) => ({
        useBackend,
        gateway: useBackend ? new BackendInterAdapter() : new MockInterAdapter()
      })),
      
      // Webhook actions
      addWebhookEvent: (event) => set((state) => ({
        webhookEvents: [event, ...state.webhookEvents].slice(0, 100) // Keep last 100
      })),
      
      markEventAsProcessed: (eventId) => set((state) => ({
        webhookEvents: state.webhookEvents.map(event =>
          event.id === eventId ? { ...event, processado: true } : event
        )
      })),
      
      reprocessWebhookEvent: (eventId) => {
        const { webhookEvents } = get();
        const event = webhookEvents.find(e => e.id === eventId);
        if (event) {
          // Trigger custom event to reprocess
          window.dispatchEvent(new CustomEvent('bolepix-reprocess', {
            detail: event
          }));
          
          set((state) => ({
            webhookEvents: state.webhookEvents.map(e =>
              e.id === eventId 
                ? { ...e, tentativas: e.tentativas + 1, ultimaTentativa: new Date().toISOString() }
                : e
            )
          }));
        }
      },
      
      clearWebhookEvents: () => set({ webhookEvents: [] }),
      
      // Cobrança management
      updateTituloCobranca: (tituloId, cobrancaData) => {
        // This will be handled by the titles store
        // Dispatch custom event for other stores to listen
        window.dispatchEvent(new CustomEvent('titulo-cobranca-updated', {
          detail: { tituloId, cobrancaData }
        }));
      },
      
      // Export
      exportBoletos: (titulos) => {
        const rows: BoletoExportRow[] = titulos
          .filter(t => t.cobranca && t.cobranca.provider === 'inter')
          .map(titulo => ({
            tituloId: titulo.id,
            contratoId: titulo.contratoId,
            cliente: titulo.clienteNome || 'N/A',
            cnpjCpf: titulo.clienteDoc || 'N/A',
            valor: titulo.valor,
            vencimento: titulo.vencimento,
            status: titulo.cobranca?.status || 'DRAFT',
            provider: titulo.cobranca?.provider || 'none',
            codigoSolicitacao: titulo.cobranca?.codigoSolicitacao,
            linhaDigitavel: titulo.cobranca?.linhaDigitavel,
            pixCopiaECola: titulo.cobranca?.pixCopiaECola,
            dataEmissao: titulo.cobranca?.history?.find(h => h.event === 'EMITIDA')?.tsISO,
            dataStatus: titulo.cobranca?.history?.[0]?.tsISO
          }));

        // Create CSV
        const headers = [
          'TituloId', 'ContratoId', 'Cliente', 'CNPJ/CPF', 'Valor', 'Vencimento',
          'Status', 'Provider', 'CodigoSolicitacao', 'LinhaDigitavel', 'PixCopiaECola',
          'DataEmissao', 'DataStatus'
        ];
        
        const csvContent = [
          '\ufeff', // BOM UTF-8
          headers.join(';'),
          ...rows.map(row => [
            row.tituloId,
            row.contratoId || '',
            row.cliente,
            row.cnpjCpf,
            row.valor.toFixed(2).replace('.', ','),
            row.vencimento,
            row.status,
            row.provider,
            row.codigoSolicitacao || '',
            row.linhaDigitavel || '',
            row.pixCopiaECola || '',
            row.dataEmissao || '',
            row.dataStatus || ''
          ].join(';'))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `boletos_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.csv`;
        link.click();
      },
      
      // Utils
      generateIdempotencyKey: (tituloId, vencimento) => {
        // Generate deterministic key
        const str = `${tituloId}_${vencimento}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return `idem_${Math.abs(hash)}_${Date.now()}`;
      },
      
      // Seed test data
      seedTestData: () => {
        const testEvents: WebhookEvent[] = [
          {
            id: 'wh_test_1',
            tipo: 'COBRANCA_EMITIDA',
            codigoSolicitacao: 'INTER_TEST_001',
            status: 'ISSUED',
            dataEvento: new Date(Date.now() - 3600000).toISOString(),
            payload: { linhaDigitavel: '34191000000000000000000000000000000000000000' },
            processado: true,
            tentativas: 1,
            ultimaTentativa: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'wh_test_2',
            tipo: 'COBRANCA_PAGA',
            codigoSolicitacao: 'INTER_TEST_002',
            status: 'PAID',
            dataEvento: new Date(Date.now() - 1800000).toISOString(),
            payload: { valorPago: 150.00 },
            processado: false,
            tentativas: 0
          }
        ];
        
        set({ webhookEvents: testEvents });
      },
      
      clearData: () => set({
        webhookEvents: [],
        config: createInitialConfig()
      })
    }),
    {
      name: 'bolepix-storage',
      partialize: (state) => ({
        config: state.config,
        useBackend: state.useBackend,
        webhookEvents: state.webhookEvents
      })
    }
  )
);

// Setup webhook listener
if (typeof window !== 'undefined') {
  window.addEventListener('bolepix-webhook', (event: any) => {
    const webhookEvent = event.detail as WebhookEvent;
    useBolePixStore.getState().addWebhookEvent(webhookEvent);
  });
}