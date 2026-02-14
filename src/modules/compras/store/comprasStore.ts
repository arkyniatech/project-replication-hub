import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface ItemRequisicao {
  id: string;
  sku: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  obs?: string;
}

export interface Requisicao {
  id: string;
  numero: string;
  lojaId: string;
  solicitante: string;
  centroCusto?: string;
  categoria: 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL';
  prioridade: 'baixa' | 'media' | 'alta';
  itens: ItemRequisicao[];
  status: 'rascunho' | 'solicitado' | 'em_cotacao' | 'cotado' | 'cancelado';
  anexos: string[];
  observacoes?: string;
  createdAt: string;
  createdBy: string;
}

export interface PropostaFornecedor {
  fornecedorId: string;
  fornecedorNome: string;
  itens: {
    itemId: string;
    precoUnit: number;
    prazoEntrega: number;
    observacao?: string;
  }[];
  frete: number;
  impostos: number;
  desconto: number;
  total: number;
  prazoGeralDias: number;
  condicoesPagamento: string;
  validadeProposta: string;
}

export interface Cotacao {
  id: string;
  numero: string;
  lojaId: string;
  origem: 'REQ' | 'OS';
  origemId: string;
  comprador: string;
  slaInterno: string;
  itens: ItemRequisicao[];
  propostas: PropostaFornecedor[];
  status: 'em_andamento' | 'para_aprovacao' | 'aprovado' | 'negado' | 'comprado';
  aprovacao?: {
    tipo: 'fornecedor_unico' | 'dividir_por_item';
    justificativa: string;
    aprovadoPor: string;
    aprovadoEm: string;
    snapshot: any;
  };
  createdAt: string;
  createdBy: string;
}

export interface PedidoCompra {
  id: string;
  numero: string;
  lojaId: string;
  fornecedorId: string;
  fornecedorNome: string;
  cotacaoId: string;
  itens: {
    itemId: string;
    sku: string;
    descricao: string;
    quantidade: number;
    precoUnit: number;
    total: number;
  }[];
  total: number;
  status: 'emitido' | 'parcial' | 'total' | 'cancelado';
  condicoesPagamento: string;
  prazoEntrega: number;
  observacoes?: string;
  anexos: string[];
  createdAt: string;
  createdBy: string;
}

export interface Recebimento {
  id: string;
  numero: string;
  pedidoCompraId: string;
  lojaId: string;
  notaFiscal: {
    numero: string;
    emissao: string;
    chave?: string;
  };
  itens: {
    itemId: string;
    quantidadeRecebida: number;
    series?: string[]; // Para items PATRIMONIAL/SERIE
    observacao?: string;
  }[];
  status: 'parcial' | 'total';
  conferente: string;
  createdAt: string;
}

interface ComprasState {
  // Data
  requisicoes: Requisicao[];
  cotacoes: Cotacao[];
  pedidosCompra: PedidoCompra[];
  recebimentos: Recebimento[];
  
  // Actions
  criarRequisicao: (data: Omit<Requisicao, 'id' | 'numero' | 'createdAt' | 'createdBy'>) => string;
  editarRequisicao: (id: string, data: Partial<Requisicao>) => void;
  enviarParaCotacao: (requisicaoId: string) => string;
  criarCotacao: (data: Omit<Cotacao, 'id' | 'numero' | 'createdAt' | 'createdBy'>) => string;
  adicionarFornecedor: (cotacaoId: string, proposta: PropostaFornecedor) => void;
  enviarParaAprovacao: (cotacaoId: string) => void;
  aprovarCotacao: (cotacaoId: string, aprovacao: Cotacao['aprovacao']) => void;
  gerarPOs: (cotacaoId: string) => string[];
  registrarRecebimento: (data: Omit<Recebimento, 'id' | 'numero' | 'createdAt'>) => string;
  
  // Selectors
  getRequisicao: (id: string) => Requisicao | undefined;
  getCotacao: (id: string) => Cotacao | undefined;
  getPedidoCompra: (id: string) => PedidoCompra | undefined;
  getRecebimento: (id: string) => Recebimento | undefined;
  
  // KPIs
  getLeadTimePorEtapa: () => {
    reqToCot: number;
    cotToAprov: number;
    aprovToPo: number;
    poToReceb: number;
  };
  getPercentualCobertura2Fornecedores: () => number;
  getCotacoesDePedidoDePecas: () => Cotacao[];
}

let contadorReq = 1;
let contadorCot = 1;
let contadorPo = 1;
let contadorRec = 1;

export const useComprasStore = create<ComprasState>()(
  persist(
    (set, get) => ({
      // Initial state
      requisicoes: [],
      cotacoes: [],
      pedidosCompra: [],
      recebimentos: [],

      // Actions
      criarRequisicao: (data) => {
        const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const numero = `REQ-${String(contadorReq++).padStart(6, '0')}`;
        
        const requisicao: Requisicao = {
          ...data,
          id,
          numero,
          status: 'rascunho',
          createdAt: new Date().toISOString(),
          createdBy: 'admin' // Mock user
        };

        set(state => ({
          requisicoes: [...state.requisicoes, requisicao]
        }));

        return id;
      },

      editarRequisicao: (id, data) => {
        set(state => ({
          requisicoes: state.requisicoes.map(req => 
            req.id === id ? { ...req, ...data } : req
          )
        }));
      },

      enviarParaCotacao: (requisicaoId) => {
        const requisicao = get().getRequisicao(requisicaoId);
        if (!requisicao) return '';

        // Update requisition status
        get().editarRequisicao(requisicaoId, { status: 'em_cotacao' });

        // Create cotacao
        const cotacaoId = get().criarCotacao({
          lojaId: requisicao.lojaId,
          origem: 'REQ',
          origemId: requisicaoId,
          comprador: 'admin', // Mock
          slaInterno: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
          itens: requisicao.itens,
          propostas: [],
          status: 'em_andamento'
        });

        return cotacaoId;
      },

      criarCotacao: (data) => {
        const id = `cot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const numero = `COT-${String(contadorCot++).padStart(6, '0')}`;
        
        const cotacao: Cotacao = {
          ...data,
          id,
          numero,
          createdAt: new Date().toISOString(),
          createdBy: 'admin' // Mock user
        };

        set(state => ({
          cotacoes: [...state.cotacoes, cotacao]
        }));

        return id;
      },

      adicionarFornecedor: (cotacaoId, proposta) => {
        set(state => ({
          cotacoes: state.cotacoes.map(cot =>
            cot.id === cotacaoId 
              ? { ...cot, propostas: [...cot.propostas, proposta] }
              : cot
          )
        }));
      },

      enviarParaAprovacao: (cotacaoId) => {
        set(state => ({
          cotacoes: state.cotacoes.map(cot =>
            cot.id === cotacaoId 
              ? { ...cot, status: 'para_aprovacao' }
              : cot
          )
        }));
      },

      aprovarCotacao: (cotacaoId, aprovacao) => {
        set(state => ({
          cotacoes: state.cotacoes.map(cot =>
            cot.id === cotacaoId 
              ? { ...cot, status: 'aprovado', aprovacao }
              : cot
          )
        }));
      },

      gerarPOs: (cotacaoId) => {
        const cotacao = get().getCotacao(cotacaoId);
        if (!cotacao || !cotacao.aprovacao) return [];

        const poIds: string[] = [];

        if (cotacao.aprovacao.tipo === 'fornecedor_unico') {
          // Generate single PO for best supplier
          const melhorProposta = cotacao.propostas.reduce((best, current) =>
            current.total < best.total ? current : best
          );

          const poId = `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const numero = `PO-${String(contadorPo++).padStart(6, '0')}`;

          const po: PedidoCompra = {
            id: poId,
            numero,
            lojaId: cotacao.lojaId,
            fornecedorId: melhorProposta.fornecedorId,
            fornecedorNome: melhorProposta.fornecedorNome,
            cotacaoId,
            itens: cotacao.itens.map(item => {
              const propItem = melhorProposta.itens.find(p => p.itemId === item.id);
              return {
                itemId: item.id,
                sku: item.sku,
                descricao: item.descricao,
                quantidade: item.quantidade,
                precoUnit: propItem?.precoUnit || 0,
                total: (propItem?.precoUnit || 0) * item.quantidade
              };
            }),
            total: melhorProposta.total,
            status: 'emitido',
            condicoesPagamento: melhorProposta.condicoesPagamento,
            prazoEntrega: melhorProposta.prazoGeralDias,
            anexos: [],
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
          };

          set(state => ({
            pedidosCompra: [...state.pedidosCompra, po]
          }));

          poIds.push(poId);
        }

        // Update cotacao status
        set(state => ({
          cotacoes: state.cotacoes.map(cot =>
            cot.id === cotacaoId 
              ? { ...cot, status: 'comprado' }
              : cot
          )
        }));

        return poIds;
      },

      registrarRecebimento: (data) => {
        const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const numero = `REC-${String(contadorRec++).padStart(6, '0')}`;
        
        const recebimento: Recebimento = {
          ...data,
          id,
          numero,
          createdAt: new Date().toISOString()
        };

        set(state => ({
          recebimentos: [...state.recebimentos, recebimento]
        }));

        // Update PO status
        const po = get().getPedidoCompra(data.pedidoCompraId);
        if (po) {
          const totalRecebido = data.itens.reduce((sum, item) => sum + item.quantidadeRecebida, 0);
          const totalPedido = po.itens.reduce((sum, item) => sum + item.quantidade, 0);
          
          const novoStatus = totalRecebido >= totalPedido ? 'total' : 'parcial';
          
          set(state => ({
            pedidosCompra: state.pedidosCompra.map(p =>
              p.id === data.pedidoCompraId 
                ? { ...p, status: novoStatus }
                : p
            )
          }));
        }

        return id;
      },

      // Selectors
      getRequisicao: (id) => get().requisicoes.find(r => r.id === id),
      getCotacao: (id) => get().cotacoes.find(c => c.id === id),
      getPedidoCompra: (id) => get().pedidosCompra.find(p => p.id === id),
      getRecebimento: (id) => get().recebimentos.find(r => r.id === id),

      // KPIs
      getLeadTimePorEtapa: () => {
        // Mock calculation - in real app would calculate from timestamps
        return {
          reqToCot: 2.1,
          cotToAprov: 1.5,
          aprovToPo: 0.8,
          poToReceb: 7.2
        };
      },

      getPercentualCobertura2Fornecedores: () => {
        const cotacoes = get().cotacoes;
        if (cotacoes.length === 0) return 0;
        
        const comDoisOuMais = cotacoes.filter(c => c.propostas.length >= 2).length;
        return Math.round((comDoisOuMais / cotacoes.length) * 100);
      },

      getCotacoesDePedidoDePecas: () => {
        return get().cotacoes.filter(c => c.origem === 'OS');
      }
    }),
    {
      name: 'compras-store',
      version: 1
    }
  )
);