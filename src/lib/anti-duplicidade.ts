/**
 * Relay 70 — anti-duplicidade de nota fiscal a pagar.
 *
 * ANTES DESTE RELAY A PROTEÇÃO NÃO EXISTIA. Não era "fraca por viver em
 * localStorage": `updateDupIndex` estava importado no NovoTituloDrawer e nunca
 * era chamado, `localStorage['titulosPagar']` nunca era escrito por nenhum
 * código do repo, e `dupSearch` percorria um índice permanentemente vazio
 * contra uma lista vazia — retornando `[]` em toda execução. O
 * DuplicityReviewModal, com alçada por valor, justificativa obrigatória e
 * comparação lado a lado, nunca abriu uma única vez.
 *
 * A checagem agora é do BANCO, via dois índices únicos (migration
 * 20260821170000). O cliente continua consultando ANTES do insert para poder
 * mostrar QUAL título colidiu — mas quem decide é a constraint, e o insert que
 * escapar da consulta é recusado com 23505.
 *
 * O QUE FICA FORA DA CHAVE, E POR QUÊ
 * Valor e emissão não entram. O `fpExact` antigo incluía valor, e isso é uma
 * armadilha: se o operador redigita a mesma nota e erra um centavo, a chave
 * muda e a constraint deixa passar — o erro de digitação vira bypass no exato
 * cenário que a proteção existe para pegar. Valor e emissão continuam úteis
 * como ALERTA (checagem forte), nunca como componente de chave única.
 */

/** Colunas de titulos_pagar que participam da identidade do documento. */
export interface DocumentoTitulo {
  fornecedorId?: string | null;
  docTipo?: string | null;
  docNumero?: string | null;
  chaveFiscal44?: string | null;
}

/**
 * Normaliza o número do documento: maiúsculas, só alfanumérico.
 * Faz "12.345", "12345" e "nf 12345" colidirem entre si.
 *
 * A ORDEM É PARTE DA REGRA: `toUpperCase()` primeiro, filtro depois. Ver
 * `normalizarComoSQL` — o índice do banco reproduz esta função exatamente, e
 * inverter a ordem faz as duas divergirem.
 */
export function normalizeDocNumber(docNumero?: string | null): string {
  return docNumero?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
}

/** Normaliza a chave de acesso da NF-e: só dígitos. */
export function normalizeFiscalKey(chaveFiscal44?: string | null): string {
  return chaveFiscal44?.replace(/[^0-9]/g, '') || '';
}

/**
 * Espelho em JS do que o índice funcional faz em Postgres:
 *
 *   regexp_replace(upper(doc_numero), '[^A-Z0-9]', '', 'g')
 *
 * Existe para ser comparado com `normalizeDocNumber` no teste. Se as duas
 * divergirem, a tela aprova um lançamento que o banco recusa — o usuário vê
 * um erro sem explicação depois de preencher o formulário inteiro.
 *
 * Medido: com o filtro ANTES do upper (`upper(regexp_replace(doc,'[^A-Za-z0-9]',...))`)
 * as duas divergem em 'ß' e 'ﬁ', que o cliente expande para 'SS' e 'FI' ao
 * fazer toUpperCase() primeiro, e que o SQL descartaria antes disso.
 */
export function normalizarComoSQL(docNumero?: string | null): string {
  if (docNumero === null || docNumero === undefined) return '';
  return docNumero.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Chave fiscal pronta para indexar, ou null se não deve entrar no índice.
 *
 * O guard de 44 dígitos evita indexar chave meio digitada: um prefixo
 * indexado colidiria com outra nota cuja digitação parou no mesmo ponto.
 */
export function chaveFiscalIndexavel(chaveFiscal44?: string | null): string | null {
  const normalizada = normalizeFiscalKey(chaveFiscal44);
  return normalizada.length === 44 ? normalizada : null;
}

/**
 * Chave de documento (fornecedor + tipo + número normalizado), ou null quando
 * o título não tem documento — despesa sem nota pode repetir à vontade, e é o
 * que o `WHERE doc_numero IS NOT NULL AND doc_numero <> ''` do índice parcial
 * expressa no banco.
 */
export function chaveDocumento(titulo: DocumentoTitulo): string | null {
  const numero = normalizeDocNumber(titulo.docNumero);
  if (!numero) return null;
  if (!titulo.fornecedorId) return null;

  const tipo = titulo.docTipo?.trim() || '';
  return `${titulo.fornecedorId}|${tipo}|${numero}`;
}

/** Dois títulos colidem pela chave fiscal (ignora loja: é identificador nacional). */
export function colidemPorChaveFiscal(a: DocumentoTitulo, b: DocumentoTitulo): boolean {
  const chaveA = chaveFiscalIndexavel(a.chaveFiscal44);
  const chaveB = chaveFiscalIndexavel(b.chaveFiscal44);
  return chaveA !== null && chaveA === chaveB;
}

/** Dois títulos colidem por fornecedor + tipo + número (ignora valor e emissão). */
export function colidemPorDocumento(a: DocumentoTitulo, b: DocumentoTitulo): boolean {
  const chaveA = chaveDocumento(a);
  const chaveB = chaveDocumento(b);
  return chaveA !== null && chaveA === chaveB;
}

// ---------------------------------------------------------------------------
// Tratamento do 23505
// ---------------------------------------------------------------------------

/** `unique_violation` do Postgres. */
export const CODIGO_UNIQUE_VIOLATION = '23505';

export const INDICE_CHAVE_FISCAL = 'idx_titulos_pagar_chave_fiscal_unica';
export const INDICE_DOCUMENTO = 'idx_titulos_pagar_documento_unico';

interface ErroPostgrest {
  code?: string;
  message?: string;
}

/**
 * O erro é violação de UM DOS NOSSOS DOIS índices de duplicidade?
 *
 * Checa o nome do índice, não só o código: um 23505 de outra constraint
 * (a PK, ou qualquer índice único futuro) não pode sair na tela como
 * "nota já lançada" — seria explicar errado um erro diferente.
 */
export function ehErroDeDuplicidade(erro: unknown): boolean {
  const e = erro as ErroPostgrest | null | undefined;
  if (!e || e.code !== CODIGO_UNIQUE_VIOLATION) return false;

  const mensagem = e.message ?? '';
  return mensagem.includes(INDICE_CHAVE_FISCAL) || mensagem.includes(INDICE_DOCUMENTO);
}

/**
 * Mensagem para o usuário no lugar da mensagem crua do Postgres.
 *
 * Sem isto o operador recebe `duplicate key value violates unique constraint
 * "idx_titulos_pagar_documento_unico"` depois de preencher o formulário
 * inteiro: não fica sabendo que a nota já existe, não sabe qual é o título
 * anterior, e a reação natural é tentar de novo mudando algum campo — o
 * caminho para criar a duplicata com um centavo de diferença.
 *
 * `tituloExistente` é opcional porque a consulta que o localiza pode falhar ou
 * ser barrada por RLS; nesse caso a mensagem continua correta, só menos
 * específica.
 */
export function mensagemDeDuplicidade(
  erro: unknown,
  tituloExistente?: { numero?: string | null } | null
): string {
  const e = erro as ErroPostgrest | null | undefined;
  const porChaveFiscal = (e?.message ?? '').includes(INDICE_CHAVE_FISCAL);

  const causa = porChaveFiscal
    ? 'Esta nota fiscal já foi lançada: a chave de acesso é a mesma de um título existente.'
    : 'Este documento já foi lançado para este fornecedor.';

  const referencia = tituloExistente?.numero
    ? ` Veja o título ${tituloExistente.numero}.`
    : '';

  return `${causa}${referencia}`;
}
