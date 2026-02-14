import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface CatalogoItem {
  id: string;
  tipo: 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL';
  sku: string;
  descricao: string;
  unidade: string;
  grupo: string;
  modelo?: string;
  controle: 'SERIE' | 'SALDO';
  ativo: boolean;
  min?: number;
  max?: number;
  estoqueMinimo?: number;
  estoqueMaximo?: number;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstoqueItem {
  id: string;
  lojaId: string;
  itemId: string;
  controle: 'SERIE' | 'SALDO';
  saldo: number;
  series?: string[];
  custoMedio?: number;
  ultimaMovimentacao?: string;
}

export interface MovimentoEstoque {
  id: string;
  itemId: string;
  lojaId: string;
  tipo: 'ENTRADA_PO' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'CONSUMO' | 'TRANSFERENCIA_SAIDA' | 'TRANSFERENCIA_ENTRADA' | 'BAIXA_PATRIMONIAL' | 'DEVOLUCAO_FORNECEDOR';
  quantidade: number;
  custoUnitario?: number;
  referencia?: string;
  observacao?: string;
  createdBy?: string;
  createdAt: string;
}

export interface SessaoContagem {
  id: string;
  numero: string;
  lojaId: string;
  tipo: 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | 'TODOS';
  status: 'aberta' | 'em_contagem' | 'em_revisao' | 'processada' | 'fechada';
  filtros: {
    grupo?: string;
    ativo?: boolean;
  };
  itens: {
    itemId: string;
    sku: string;
    descricao: string;
    saldoSistema: number;
    quantidadeContada?: number;
    divergencia?: number;
    divergenciaPerc?: number;
    justificativa?: string;
    acao?: 'AJUSTAR' | 'INVESTIGAR' | 'BAIXA';
    processado?: boolean;
  }[];
  criadoPor: string;
  criadoEm: string;
  processadoPor?: string;
  processadoEm?: string;
}

interface AlmoxState {
  // Data
  catalogoItens: CatalogoItem[];
  estoque: EstoqueItem[];
  movimentos: MovimentoEstoque[];
  sessoesContagem: SessaoContagem[];
  
  // Actions - Catálogo
  cadastrarItem: (data: Omit<CatalogoItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  editarItem: (id: string, data: Partial<CatalogoItem>) => void;
  inativarItem: (id: string) => void;
  
  // Actions - Estoque
  entradaPorRecebimento: (recebimento: {
    itemId: string;
    lojaId: string;
    quantidade: number;
    series?: string[];
    custoUnitario?: number;
    referencia: string;
  }) => void;
  ajustarSaldo: (itemId: string, lojaId: string, diferenca: number, justificativa: string) => void;
  registrarBaixaPatrimonial: (data: {
    itemId: string;
    lojaId: string;
    quantidade: number;
    motivo: string;
    usuario: string;
  }) => void;
  
  // Actions - Contagem
  criarSessaoContagem: (data: Omit<SessaoContagem, 'id' | 'numero' | 'criadoEm'>) => string;
  lancarContagem: (sessaoId: string, itemId: string, quantidadeContada: number) => void;
  processarDivergencias: (sessaoId: string, processamento: {
    [itemId: string]: {
      acao: 'AJUSTAR' | 'INVESTIGAR' | 'BAIXA';
      justificativa: string;
    };
  }) => void;
  
  // Selectors
  getItem: (id: string) => CatalogoItem | undefined;
  getEstoquePorLoja: (lojaId: string, tipo?: CatalogoItem['tipo']) => (EstoqueItem & { item: CatalogoItem })[];
  getMovimentosPorItem: (itemId: string, lojaId?: string) => MovimentoEstoque[];
  getSessaoContagem: (id: string) => SessaoContagem | undefined;
  
  // KPIs
  getItensEstoqueCritico: (lojaId?: string) => (EstoqueItem & { item: CatalogoItem })[];
  getCoberturaItensCriticos: () => number;
  getRupturasMes: (lojaId?: string) => number;
}

let contadorItem = 1;
let contadorSessao = 1;

export const useAlmoxStore = create<AlmoxState>()(
  persist(
    (set, get) => ({
      // Initial state
      catalogoItens: [],
      estoque: [],
      movimentos: [],
      sessoesContagem: [],

      // Actions - Catálogo
      cadastrarItem: (data) => {
        const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const item: CatalogoItem = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          catalogoItens: [...state.catalogoItens, item]
        }));

        return id;
      },

      editarItem: (id, data) => {
        set(state => ({
          catalogoItens: state.catalogoItens.map(item =>
            item.id === id ? { ...item, ...data } : item
          )
        }));
      },

      inativarItem: (id) => {
        get().editarItem(id, { ativo: false });
      },

      // Actions - Estoque
      entradaPorRecebimento: (recebimento) => {
        const { itemId, lojaId, quantidade, series, custoUnitario, referencia } = recebimento;
        
        // Find or create estoque entry
        const existingEstoque = get().estoque.find(e => 
          e.itemId === itemId && e.lojaId === lojaId
        );

        if (existingEstoque) {
          // Update existing
          set(state => ({
            estoque: state.estoque.map(e =>
              e.id === existingEstoque.id
                ? {
                    ...e,
                    saldo: e.saldo + quantidade,
                    series: series ? [...(e.series || []), ...series] : e.series,
                    custoMedio: custoUnitario || e.custoMedio,
                    ultimaMovimentacao: new Date().toISOString()
                  }
                : e
            )
          }));
        } else {
          // Create new
          const newEstoque: EstoqueItem = {
            id: `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            lojaId,
            itemId,
            controle: series ? 'SERIE' : 'SALDO',
            saldo: quantidade,
            series: series || undefined,
            custoMedio: custoUnitario,
            ultimaMovimentacao: new Date().toISOString()
          };

          set(state => ({
            estoque: [...state.estoque, newEstoque]
          }));
        }

        // Create movement
        const movimento: MovimentoEstoque = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId,
          lojaId,
          tipo: 'ENTRADA_PO',
          quantidade,
          custoUnitario,
          referencia,
          createdBy: 'admin',
          createdAt: new Date().toISOString()
        };

        set(state => ({
          movimentos: [...state.movimentos, movimento]
        }));
      },

  ajustarSaldo: (itemId: string, lojaId: string, diferenca: number, justificativa: string) => {
    const estoque = get().estoque.find(e => 
      e.itemId === itemId && e.lojaId === lojaId
    );

    if (estoque) {
      const novoSaldo = estoque.saldo + diferenca;
      
      set(state => ({
        estoque: state.estoque.map(e =>
          e.id === estoque.id
            ? { ...e, saldo: novoSaldo, ultimaMovimentacao: new Date().toISOString() }
            : e
        )
      }));

      const movimento: MovimentoEstoque = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        itemId,
        lojaId,
        tipo: diferenca > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
        quantidade: diferenca,
        observacao: justificativa,
        createdBy: 'Admin',
        createdAt: new Date().toISOString()
      };

      set(state => ({
        movimentos: [...state.movimentos, movimento]
      }));
    }
  },

      registrarBaixaPatrimonial: (data) => {
        const { itemId, lojaId, quantidade, motivo, usuario } = data;
        
        const estoque = get().estoque.find(e => 
          e.itemId === itemId && e.lojaId === lojaId
        );

        if (estoque) {
          // Update estoque
          set(state => ({
            estoque: state.estoque.map(e =>
              e.id === estoque.id
                ? { 
                    ...e, 
                    saldo: Math.max(0, e.saldo - quantidade),
                    ultimaMovimentacao: new Date().toISOString() 
                  }
                : e
            )
          }));

          // Create movement
          const movimento: MovimentoEstoque = {
            id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            itemId,
            lojaId,
            tipo: 'BAIXA_PATRIMONIAL',
            quantidade: -quantidade,
            observacao: motivo,
            createdBy: usuario,
            createdAt: new Date().toISOString()
          };

          set(state => ({
            movimentos: [...state.movimentos, movimento]
          }));
        }
      },

      // Actions - Contagem
      criarSessaoContagem: (data) => {
        const id = `sessao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const numero = `CNT-${String(contadorSessao++).padStart(6, '0')}`;
        
        // Get items based on filters
        const itensParaContar = get().catalogoItens
          .filter(item => {
            if (data.tipo !== 'TODOS' && item.tipo !== data.tipo) return false;
            if (data.filtros.ativo !== undefined && item.ativo !== data.filtros.ativo) return false;
            if (data.filtros.grupo && item.grupo !== data.filtros.grupo) return false;
            return true;
          })
          .map(item => {
            const estoque = get().estoque.find(e => 
              e.itemId === item.id && e.lojaId === data.lojaId
            );
            
            return {
              itemId: item.id,
              sku: item.sku,
              descricao: item.descricao,
              saldoSistema: estoque?.saldo || 0
            };
          });
        
        const sessao: SessaoContagem = {
          ...data,
          id,
          numero,
          itens: itensParaContar,
          criadoEm: new Date().toISOString()
        };

        set(state => ({
          sessoesContagem: [...state.sessoesContagem, sessao]
        }));

        return id;
      },

      lancarContagem: (sessaoId, itemId, quantidadeContada) => {
        set(state => ({
          sessoesContagem: state.sessoesContagem.map(sessao =>
            sessao.id === sessaoId
              ? {
                  ...sessao,
                  itens: sessao.itens.map(item =>
                    item.itemId === itemId
                      ? {
                          ...item,
                          quantidadeContada,
                          divergencia: quantidadeContada - item.saldoSistema,
                          divergenciaPerc: item.saldoSistema > 0 
                            ? Math.round(((quantidadeContada - item.saldoSistema) / item.saldoSistema) * 100)
                            : 0
                        }
                      : item
                  )
                }
              : sessao
          )
        }));
      },

      processarDivergencias: (sessaoId, processamento) => {
        const sessao = get().getSessaoContagem(sessaoId);
        if (!sessao) return;

        // Apply actions based on processamento
        Object.entries(processamento).forEach(([itemId, config]) => {
          if (config.acao === 'AJUSTAR') {
            const item = sessao.itens.find(i => i.itemId === itemId);
            if (item && item.quantidadeContada !== undefined) {
              const diferenca = item.quantidadeContada - item.saldoSistema;
              get().ajustarSaldo(itemId, sessao.lojaId, diferenca, `Contagem Cega ${sessao.numero}: ${config.justificativa}`);
            }
          }
        });

        // Update session
        set(state => ({
          sessoesContagem: state.sessoesContagem.map(s =>
            s.id === sessaoId
              ? {
                  ...s,
                  status: 'processada',
                  processadoPor: 'admin',
                  processadoEm: new Date().toISOString(),
                  itens: s.itens.map(item => ({
                    ...item,
                    ...processamento[item.itemId],
                    processado: true
                  }))
                }
              : s
          )
        }));
      },

      // Selectors
      getItem: (id) => get().catalogoItens.find(item => item.id === id),

      getEstoquePorLoja: (lojaId, tipo) => {
        const catalogoItens = get().catalogoItens;
        return get().estoque
          .filter(e => e.lojaId === lojaId)
          .map(estoque => {
            const item = catalogoItens.find(i => i.id === estoque.itemId);
            return item ? { ...estoque, item } : null;
          })
          .filter((e): e is EstoqueItem & { item: CatalogoItem } => 
            e !== null && (!tipo || e.item.tipo === tipo)
          );
      },

      getMovimentosPorItem: (itemId, lojaId) => {
        return get().movimentos.filter(m => 
          m.itemId === itemId && (!lojaId || m.lojaId === lojaId)
        );
      },

      getSessaoContagem: (id) => get().sessoesContagem.find(s => s.id === id),

      // KPIs
      getItensEstoqueCritico: (lojaId) => {
        return get().getEstoquePorLoja(lojaId || 'loja-1')
          .filter(e => 
            e.item.estoqueMinimo !== undefined && 
            e.saldo <= e.item.estoqueMinimo
          );
      },

      getCoberturaItensCriticos: () => {
        // Mock calculation
        return 85; // 85% coverage
      },

      getRupturasMes: (lojaId) => {
        // Mock calculation - would check movements for CONSUMO with saldo = 0
        return 3;
      }
    }),
    {
      name: 'almox-store',
      version: 1
    }
  )
);

export const seedAlmoxData = () => {
  const store = useAlmoxStore.getState();
  
  if (store.catalogoItens.length === 0) {
    // Patrimônio
    const pat001Id = store.cadastrarItem({
      tipo: 'PATRIMONIAL',
      sku: 'PAT001',
      descricao: 'Notebook Dell Inspiron 15',
      unidade: 'UN',
      grupo: 'Informática',
      controle: 'SERIE',
      ativo: true,
      estoqueMinimo: 2,
      estoqueMaximo: 10
    });

    const pat002Id = store.cadastrarItem({
      tipo: 'PATRIMONIAL', 
      sku: 'PAT002',
      descricao: 'Mesa para Escritório',
      unidade: 'UN',
      grupo: 'Mobiliário',
      controle: 'SERIE',
      ativo: true,
      estoqueMinimo: 1,
      estoqueMaximo: 5
    });

    // Peças
    const pec001Id = store.cadastrarItem({
      tipo: 'PECA',
      sku: 'PEC001',
      descricao: 'Filtro de Óleo Motor',
      unidade: 'UN',
      grupo: 'Motor',
      modelo: 'Universal',
      controle: 'SALDO',
      ativo: true,
      estoqueMinimo: 10,
      estoqueMaximo: 50
    });

    const pec002Id = store.cadastrarItem({
      tipo: 'PECA',
      sku: 'PEC002', 
      descricao: 'Pastilha de Freio Dianteira',
      unidade: 'JG',
      grupo: 'Freios',
      modelo: 'Civic/Corolla',
      controle: 'SALDO',
      ativo: true,
      estoqueMinimo: 5,
      estoqueMaximo: 20
    });

    // Consumíveis
    const con001Id = store.cadastrarItem({
      tipo: 'CONSUMIVEL',
      sku: 'CON001',
      descricao: 'Óleo Lubrificante 5W30',
      unidade: 'L',
      grupo: 'Lubrificantes',
      controle: 'SALDO',
      ativo: true,
      estoqueMinimo: 20,
      estoqueMaximo: 100
    });

    const con002Id = store.cadastrarItem({
      tipo: 'CONSUMIVEL',
      sku: 'CON002',
      descricao: 'Papel Sulfite A4',
      unidade: 'PCT',
      grupo: 'Papelaria',
      controle: 'SALDO',
      ativo: true,
      estoqueMinimo: 10,
      estoqueMaximo: 50
    });

    // Add some initial stock using the returned IDs
    store.entradaPorRecebimento({
      itemId: pec001Id, // PEC001
      lojaId: 'loja-1',
      quantidade: 25,
      custoUnitario: 35.50,
      referencia: 'seed-inicial'
    });

    store.entradaPorRecebimento({
      itemId: con001Id, // CON001
      lojaId: 'loja-1', 
      quantidade: 45,
      custoUnitario: 18.90,
      referencia: 'seed-inicial'
    });

    console.log('🔄 Almoxarifado seeded with initial data');
  }
};

// Call seed function on module initialization
// Call seed function on module initialization
seedAlmoxData();

// Call seed function on module initialization
seedAlmoxData();