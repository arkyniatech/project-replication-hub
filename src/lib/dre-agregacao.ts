/**
 * Agregação do DRE a partir dos dados reais do banco.
 *
 * Contexto (relay 65/66): a tela do DRE somava dois mocks encadeados —
 * `expensesData` em DRE.tsx e `mapRealByN2AndCC` em centro-custo-utils.ts —
 * cujos valores foram fabricados para bater entre si (15000 + 13500 = 28500).
 * O total de R$125.430,00 nunca saiu de nenhuma tabela.
 *
 * Restrições do schema, medidas no banco:
 *
 *  - `titulos.categoria` e `titulos_pagar.categoria` são TEXT livre. Não há
 *    categoria_id nem FK para categorias_n2 — o casamento é por NOME. Não é
 *    frágil na prática porque o drawer grava o nome vindo do próprio dropdown
 *    de categorias_n2; ainda assim, nome que não casa vira "Sem categoria" em
 *    vez de sumir, senão o total deixaria de fechar.
 *  - `categorias_n2` tem (id, nome, tipo, ativo, ...). Não tem `codigo` — por
 *    isso as linhas são identificadas por nome, não por código contábil.
 *  - Nenhuma tabela financeira tem `cc_id`: centro de custo só existe em RH e
 *    compras. Por isso não há dimensão de centro de custo aqui.
 *  - `budget_metas` não existe. Não há coluna de meta, delta nem semáforo:
 *    mostrar meta zero faria toda categoria aparecer 100% estourada.
 *
 * Tudo aqui é matemática pura sobre listas já carregadas — sem Supabase, sem
 * React — para poder ser testado sem montar tela.
 */

/** Rótulo das despesas cuja categoria não casa com nenhuma categorias_n2. */
export const SEM_CATEGORIA = 'Sem categoria';

/**
 * Receita é uma linha só. Os títulos a receber são gerados a partir do
 * contrato com `categoria: 'LOCACAO'` fixo (useSupabaseContratos.ts), e não há
 * nenhuma categorias_n2 do tipo RECEITA cadastrada. Subdividir seria inventar
 * dado que não existe.
 */
export const RECEITA_LOCACAO = 'Locação';

export type RegimeDRE = 'COMPETENCIA' | 'CAIXA';

export interface IntervaloDatas {
  inicio: string;
  fim: string;
}

export interface TituloReceberDRE {
  emissao?: string | null;
  vencimento?: string | null;
  valor?: number | null;
  lojaId?: string | null;
}

export interface RecebimentoDRE {
  data?: string | null;
  valorLiquido?: number | null;
  lojaId?: string | null;
}

export interface TituloPagarDRE {
  id?: string | null;
  emissao?: string | null;
  vencimento?: string | null;
  valor?: number | null;
  categoria?: string | null;
  lojaId?: string | null;
}

export interface MovimentoPagarDRE {
  tituloId?: string | null;
  dataPagamento?: string | null;
  valorLiquido?: number | null;
  lojaId?: string | null;
}

export interface CategoriaDRE {
  nome: string;
  tipo?: string | null;
}

export interface LinhaDRE {
  nome: string;
  valor: number;
}

export interface ResultadoDRE {
  competencia: string;
  regime: RegimeDRE;
  receita: LinhaDRE[];
  despesa: LinhaDRE[];
  totalReceita: number;
  totalDespesa: number;
  resultado: number;
}

export interface EntradaAgregacaoDRE {
  competencia: string;
  regime: RegimeDRE;
  lojaId?: string;
  titulos: TituloReceberDRE[];
  recebimentos: RecebimentoDRE[];
  titulosPagar: TituloPagarDRE[];
  movimentosPagar: MovimentoPagarDRE[];
  categorias: CategoriaDRE[];
}

/** Valor ausente ou não-numérico soma zero — nunca NaN no total da tela. */
const numero = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/** Datas do Postgres podem vir como date ou timestamp; só o prefixo importa. */
const soData = (v?: string | null): string | null =>
  typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;

/** Competência 'YYYY-MM' -> primeiro e último dia do mês. */
export function competenciaParaIntervalo(competencia: string): IntervaloDatas {
  const [ano, mes] = competencia.split('-').map(Number);
  // Dia 0 do mês seguinte é o último dia deste mês — cobre bissexto sozinho.
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, '0');
  return {
    inicio: `${competencia}-01`,
    fim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

/** Comparação lexicográfica: em ISO 'YYYY-MM-DD' equivale à cronológica. */
export function dentroDoPeriodo(
  data: string | null | undefined,
  intervalo: IntervaloDatas
): boolean {
  const d = soData(data);
  if (!d) return false;
  return d >= intervalo.inicio && d <= intervalo.fim;
}

const mesmaLoja = (lojaDoRegistro?: string | null, lojaId?: string): boolean =>
  !lojaId || lojaDoRegistro === lojaId;

const chaveCategoria = (nome: string): string =>
  nome.trim().toLocaleLowerCase('pt-BR');

/**
 * Índice nome-normalizado -> nome cadastrado, apenas para categorias de
 * DESPESA. Uma categoria cadastrada como RECEITA não deve rotular linha de
 * despesa: leria como se a receita fosse custo. O valor continua somando, só
 * cai em "Sem categoria".
 */
function indexarCategoriasDespesa(categorias: CategoriaDRE[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const c of categorias) {
    if (!c?.nome) continue;
    if (c.tipo && c.tipo.trim().toLocaleUpperCase('pt-BR') !== 'DESPESA') continue;
    index.set(chaveCategoria(c.nome), c.nome);
  }
  return index;
}

/**
 * Resolve o rótulo da linha. Categoria vazia, só espaços, ou que não casa com
 * nenhuma categorias_n2 de despesa vira "Sem categoria" — nunca é descartada.
 */
function rotularCategoria(
  categoria: string | null | undefined,
  index: Map<string, string>
): string {
  const bruta = typeof categoria === 'string' ? categoria.trim() : '';
  if (!bruta) return SEM_CATEGORIA;
  return index.get(chaveCategoria(bruta)) ?? SEM_CATEGORIA;
}

/** Data de competência do título: emissão, com vencimento como reserva. */
const dataCompetencia = (t: { emissao?: string | null; vencimento?: string | null }) =>
  soData(t.emissao) ?? soData(t.vencimento);

/** Ordena por nome, com "Sem categoria" sempre por último. */
function ordenarLinhas(linhas: LinhaDRE[]): LinhaDRE[] {
  return linhas.sort((a, b) => {
    if (a.nome === SEM_CATEGORIA) return b.nome === SEM_CATEGORIA ? 0 : 1;
    if (b.nome === SEM_CATEGORIA) return -1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

function agregarReceita(entrada: EntradaAgregacaoDRE, intervalo: IntervaloDatas): number {
  const { regime, lojaId } = entrada;

  if (regime === 'CAIXA') {
    return entrada.recebimentos
      .filter((r) => mesmaLoja(r.lojaId, lojaId) && dentroDoPeriodo(r.data, intervalo))
      .reduce((soma, r) => soma + numero(r.valorLiquido), 0);
  }

  return entrada.titulos
    .filter(
      (t) => mesmaLoja(t.lojaId, lojaId) && dentroDoPeriodo(dataCompetencia(t), intervalo)
    )
    .reduce((soma, t) => soma + numero(t.valor), 0);
}

function agregarDespesa(
  entrada: EntradaAgregacaoDRE,
  intervalo: IntervaloDatas
): LinhaDRE[] {
  const { regime, lojaId } = entrada;
  const index = indexarCategoriasDespesa(entrada.categorias);
  const porCategoria = new Map<string, number>();

  const somar = (rotulo: string, valor: number) => {
    porCategoria.set(rotulo, (porCategoria.get(rotulo) ?? 0) + valor);
  };

  if (regime === 'CAIXA') {
    // A categoria não está no movimento: vem do título que ele paga.
    const categoriaPorTitulo = new Map<string, string | null | undefined>();
    for (const t of entrada.titulosPagar) {
      if (t.id) categoriaPorTitulo.set(t.id, t.categoria);
    }

    for (const m of entrada.movimentosPagar) {
      if (!mesmaLoja(m.lojaId, lojaId)) continue;
      if (!dentroDoPeriodo(m.dataPagamento, intervalo)) continue;
      const categoria = m.tituloId ? categoriaPorTitulo.get(m.tituloId) : undefined;
      somar(rotularCategoria(categoria, index), numero(m.valorLiquido));
    }
  } else {
    for (const t of entrada.titulosPagar) {
      if (!mesmaLoja(t.lojaId, lojaId)) continue;
      if (!dentroDoPeriodo(dataCompetencia(t), intervalo)) continue;
      somar(rotularCategoria(t.categoria, index), numero(t.valor));
    }
  }

  const linhas = Array.from(porCategoria, ([nome, valor]) => ({ nome, valor }));
  return ordenarLinhas(linhas);
}

/**
 * Monta o DRE do período. Sem lançamento no período, os totais são ZERO — a
 * linha de receita permanece zerada em vez de sumir, porque zero honesto é
 * informação e linha ausente parece esquecimento.
 */
export function agregarDRE(entrada: EntradaAgregacaoDRE): ResultadoDRE {
  const intervalo = competenciaParaIntervalo(entrada.competencia);

  const totalReceita = agregarReceita(entrada, intervalo);
  const despesa = agregarDespesa(entrada, intervalo);
  const totalDespesa = despesa.reduce((soma, l) => soma + l.valor, 0);

  return {
    competencia: entrada.competencia,
    regime: entrada.regime,
    receita: [{ nome: RECEITA_LOCACAO, valor: totalReceita }],
    despesa,
    totalReceita,
    totalDespesa,
    resultado: totalReceita - totalDespesa,
  };
}

/**
 * Opções de competência para o seletor, do mês atual para trás.
 * O seletor antigo tinha seis opções fixas de 2024 e abria em branco, porque o
 * default era o mês corrente — valor que não estava na lista.
 */
export function competenciasDisponiveis(hoje: Date, quantidade = 12): string[] {
  const opcoes: string[] = [];
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - i, 1));
    opcoes.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    );
  }
  return opcoes;
}

/** Competência do mês corrente, no mesmo formato do seletor. */
export function competenciaAtual(hoje: Date): string {
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' -> 'Agosto 2026'. */
export function formatPeriodoDisplay(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${meses[parseInt(mes, 10) - 1]} ${ano}`;
}

/** CSV do DRE real. Sem colunas de meta: não existe fonte para elas. */
export function exportarDRECSV(dre: ResultadoDRE): string {
  let csv = 'Bloco;Linha;Valor\n';
  for (const l of dre.receita) csv += `RECEITA;${l.nome};${l.valor.toFixed(2)}\n`;
  for (const l of dre.despesa) csv += `DESPESA;${l.nome};${l.valor.toFixed(2)}\n`;
  csv += `TOTAL;Receita;${dre.totalReceita.toFixed(2)}\n`;
  csv += `TOTAL;Despesa;${dre.totalDespesa.toFixed(2)}\n`;
  csv += `TOTAL;Resultado;${dre.resultado.toFixed(2)}\n`;
  return csv;
}
