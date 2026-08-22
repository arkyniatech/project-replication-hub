/**
 * Relay 61 — saneamento de payload de contas a pagar.
 *
 * Contexto: as telas de contas a pagar foram escritas contra um schema que
 * nunca existiu (`valor_total`, `qtd_parcelas`, `anexos`, `timeline`,
 * `conta_preferencial_id`, `reprogramacoes`...). Os hooks mascaravam isso com
 * `as any` + `@ts-nocheck`, então o erro só aparecia em produção — e o
 * PostgREST reporta UMA coluna desconhecida por vez, o que transformava a
 * correção numa sequência de tentativas.
 *
 * Estas listas são a fronteira única: nada sai daqui para o Supabase que não
 * seja coluna real. Medido no banco em 2026-08-21.
 */

/** Colunas reais de titulos_pagar. */
export const COLUNAS_TITULOS_PAGAR = [
  'id',
  'loja_id',
  'fornecedor_id',
  'numero',
  'valor',
  'pago',
  'saldo',
  'emissao',
  'vencimento',
  'status',
  'categoria',
  'subcategoria',
  'observacoes',
  'created_at',
  'updated_at',
  'created_by',
  // Relay 70: criadas em 20260821170000_titulos_pagar_anti_duplicidade.sql.
  // Eram exatamente três dos "campos fantasma" do relay 61 — o formulário já
  // os coletava e não havia onde gravar. Agora sustentam os dois índices
  // únicos que impedem a mesma nota de entrar duas vezes.
  'doc_tipo',
  'doc_numero',
  'chave_fiscal_44',
] as const;

/** Colunas reais de parcelas_pagar. */
export const COLUNAS_PARCELAS_PAGAR = [
  'id',
  'titulo_id',
  'numero',
  'valor',
  'vencimento',
  'status',
  'data_pagamento',
  'valor_pago',
  'created_at',
  'updated_at',
] as const;

/** Colunas reais de movimentos_pagar. */
export const COLUNAS_MOVIMENTOS_PAGAR = [
  'id',
  'parcela_id',
  'titulo_id',
  'conta_id',
  'loja_id',
  'data_pagamento',
  'valor_bruto',
  'juros',
  'multa',
  'desconto',
  'valor_liquido',
  'forma',
  'comprovante_url',
  'observacoes',
  'created_by',
  'created_at',
] as const;

/**
 * Devolve só os pares cuja chave é coluna real da tabela, descartando
 * `undefined` (que o PostgREST serializaria como null e sobrescreveria valor
 * existente num update).
 */
function filtrarPorColunas<T extends Record<string, unknown>>(
  payload: T,
  colunas: readonly string[]
): Record<string, unknown> {
  const permitidas = new Set(colunas);
  const saida: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(payload ?? {})) {
    if (permitidas.has(chave) && valor !== undefined) {
      saida[chave] = valor;
    }
  }

  return saida;
}

export const sanitizarTituloPagar = (payload: Record<string, unknown>) =>
  filtrarPorColunas(payload, COLUNAS_TITULOS_PAGAR);

export const sanitizarParcelaPagar = (payload: Record<string, unknown>) =>
  filtrarPorColunas(payload, COLUNAS_PARCELAS_PAGAR);

export const sanitizarMovimentoPagar = (payload: Record<string, unknown>) =>
  filtrarPorColunas(payload, COLUNAS_MOVIMENTOS_PAGAR);
