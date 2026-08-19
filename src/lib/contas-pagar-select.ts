/**
 * Queries de contas a pagar alinhadas ao schema real.
 *
 * Contexto (relay 47, medido no banco): as três telas de contas a pagar pediam
 * relações e colunas que nunca existiram no modelo.
 *
 *  - parcelas_pagar tem uma única FK: titulo_id -> titulos_pagar. O fornecedor
 *    está a dois saltos. O embed direto `fornecedor:fornecedores(...)` retornava
 *    400. Criar FK direta duplicaria o vínculo e permitiria parcela e título
 *    apontando para fornecedores diferentes — por isso a correção é aninhar o
 *    embed, não criar constraint.
 *  - titulos_pagar.categoria é TEXT livre. Não há categoria_id nem relação com
 *    categorias_n2; o join pedido nunca foi projetado.
 *  - categorias_n2 tem (id, nome, tipo, ativo, created_at, updated_at). Não tem
 *    codigo nem descricao.
 *
 * Colunas reais de parcelas_pagar: id, titulo_id, numero, vencimento, valor,
 * valor_pago, data_pagamento, status, created_at, updated_at. Não existem
 * loja_id, fornecedor_id, pago, saldo, suspensa — as telas dependiam desses
 * campos, então eles são derivados do título em `normalizarParcelaPagar`.
 */

/** parcelas_pagar: fornecedor alcançado via titulos_pagar (dois saltos). */
export const PARCELAS_PAGAR_SELECT = `
  *,
  titulo:titulos_pagar(
    id,
    numero,
    loja_id,
    categoria,
    subcategoria,
    fornecedor_id,
    fornecedor:fornecedores(id, nome)
  )
`;

/** titulos_pagar: fornecedores tem FK real; categorias_n2 não. */
export const TITULOS_PAGAR_SELECT = `
  *,
  fornecedor:fornecedores(id, nome),
  parcelas:parcelas_pagar(*)
`;

/** categorias_n2: apenas colunas existentes. */
export const CATEGORIAS_N2_SELECT = 'id, nome, tipo, ativo, created_at, updated_at';

export interface ParcelaPagarNormalizada {
  id: string;
  titulo_id: string;
  numero_parcela: number;
  vencimento: string;
  valor: number;
  pago: number;
  saldo: number;
  status: string;
  data_pagamento?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Derivados do título — parcelas_pagar não tem essas colunas. */
  loja_id?: string;
  fornecedor_id?: string;
  categoria_codigo?: string;
  subcategoria?: string;
  fornecedor?: { id?: string; nome: string };
  titulo?: { id?: string; numero?: string };
}

const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Achata a linha do PostgREST no formato que as telas já consomem.
 *
 * `saldo` e `pago` não existem em parcelas_pagar: são derivados de
 * valor/valor_pago. `loja_id`, `fornecedor_id` e a categoria vêm do título.
 */
export function normalizarParcelaPagar(row: any): ParcelaPagarNormalizada {
  const titulo = row?.titulo ?? undefined;
  const valor = numero(row?.valor);
  const pago = numero(row?.valor_pago);

  return {
    id: row?.id,
    titulo_id: row?.titulo_id,
    numero_parcela: numero(row?.numero),
    vencimento: row?.vencimento,
    valor,
    pago,
    // Nunca negativo: pagamento a maior não deve virar saldo negativo nos totais.
    saldo: Math.max(0, valor - pago),
    status: row?.status,
    data_pagamento: row?.data_pagamento ?? null,
    created_at: row?.created_at,
    updated_at: row?.updated_at,
    loja_id: titulo?.loja_id ?? undefined,
    fornecedor_id: titulo?.fornecedor_id ?? undefined,
    categoria_codigo: titulo?.categoria ?? undefined,
    subcategoria: titulo?.subcategoria ?? undefined,
    fornecedor: titulo?.fornecedor
      ? { id: titulo.fornecedor.id, nome: titulo.fornecedor.nome }
      : undefined,
    titulo: titulo ? { id: titulo.id, numero: titulo.numero } : undefined,
  };
}
