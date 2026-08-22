/**
 * Relay 61 — montagem dos payloads de criação de título a pagar.
 *
 * Fica fora do componente porque é a parte testável: o drawer coleta o
 * formulário, este módulo traduz para colunas reais. Antes disso, o drawer
 * montava o objeto direto contra um schema imaginário e o insert quebrava no
 * PostgREST.
 */
import { sanitizarTituloPagar, sanitizarParcelaPagar } from './contas-pagar-payload';

export interface FormularioNovoTitulo {
  fornecedorId: string;
  categoriaCodigo: string;
  valorTotal: string;
  qtdParcelas: number;
  vencimentoInicial: string;
  condicao: string;
  observacao: string;
  docTipo: string;
  docNumero: string;
  chaveFiscal44: string;
  emissaoISO: string;
}

export interface ParcelaEditavel {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
}

/**
 * `numero` é NOT NULL em titulos_pagar e a tela nunca o enviava — o insert
 * quebrava antes, em `anexos`, então isso nunca chegou a aparecer.
 *
 * Usamos o documento fiscal digitado (ex.: "NF 456") por ser o identificador
 * que o usuário reconhece na conversa com o fornecedor. Sem documento, cai
 * para um número derivado da emissão.
 */
function numeroDoTitulo(form: FormularioNovoTitulo): string {
  const doc = form.docNumero?.trim();
  if (doc) {
    const tipo = form.docTipo?.trim() || 'DOC';
    return `${tipo} ${doc}`;
  }
  return `${form.docTipo?.trim() || 'DOC'} ${form.emissaoISO || ''}`.trim();
}

/**
 * O título tem UM vencimento (não "inicial"): usamos o primeiro vencimento
 * informado. As datas das demais parcelas vivem em parcelas_pagar.
 */
export function montarTituloParaInsert({
  form,
  lojaId,
  enviarAprovacao,
}: {
  form: FormularioNovoTitulo;
  lojaId: string;
  enviarAprovacao: boolean;
}): Record<string, unknown> {
  const valor = parseFloat(form.valorTotal) || 0;

  return sanitizarTituloPagar({
    loja_id: lojaId,
    fornecedor_id: form.fornecedorId || null,
    numero: numeroDoTitulo(form),
    valor,
    // titulos_pagar.categoria é TEXT livre e o Select já entrega o nome.
    categoria: form.categoriaCodigo || null,
    emissao: form.emissaoISO,
    vencimento: form.vencimentoInicial || form.emissaoISO,
    observacoes: form.observacao || null,
    status: enviarAprovacao ? 'AGUARDANDO_APROVACAO' : 'EM_EDICAO',
    // Relay 70: as três colunas de identidade do documento. `numero` continua
    // sendo o rótulo legível ("NF 456"), mas quem decide duplicidade são
    // estas — texto concatenado não é indexável por fornecedor + tipo +
    // número, e a chave fiscal se perdia inteira.
    //
    // Vazio vira NULL e não string vazia: string vazia entra no índice único e
    // colide consigo mesma, bloqueando o segundo lançamento sem documento do
    // mesmo fornecedor.
    doc_tipo: form.docTipo?.trim() || null,
    doc_numero: form.docNumero?.trim() || null,
    chave_fiscal_44: form.chaveFiscal44?.trim() || null,
  });
}

/**
 * As parcelas nunca eram gravadas: o drawer só as gerava na tela. Sem isto o
 * item 8.1 cria título sem parcela nenhuma, e a tela de Parcelas fica vazia.
 */
export function montarParcelasParaInsert(
  parcelas: ParcelaEditavel[],
  tituloId: string
): Record<string, unknown>[] {
  return parcelas.map((parcela, indice) =>
    sanitizarParcelaPagar({
      titulo_id: tituloId,
      numero: parcela.numero ?? indice + 1,
      vencimento: parcela.vencimento,
      valor: parcela.valor,
      status: 'ABERTA',
    })
  );
}
