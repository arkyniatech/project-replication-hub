/**
 * Parser ESTRITO da data do extrato bancario (Relay 18 / 2.1).
 *
 * A UI pede o CSV em "Data;Historico;Valor;Tipo(C/D);Doc;Saldo" com a data em
 * DD/MM/YYYY, mas `fin_extrato_linhas.data` e uma coluna DATE. Gravar a string
 * BR crua fazia o Postgres recusar a linha inteira com
 * `date/time field value out of range: "15/08/2026"`.
 *
 * Por que nao usar `toISODateLocal` de date-utils: ele e permissivo de
 * proposito (formata o que ja esta no banco). Para 32/13/2026 ele devolve
 * "2026-13-32" — a mesma string torta que o banco recusa — e le "1/8/2026"
 * como 8 de JANEIRO. Numa importacao de extrato, data invalida tem que virar
 * erro visivel na hora, nunca um valor que so explode no INSERT ou, pior, uma
 * data silenciosamente errada.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Dias por mes, com fevereiro resolvido pela regra bissexta real. */
function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) {
    const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
    return bissexto ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}

/**
 * Converte a data de uma linha de extrato para 'YYYY-MM-DD'.
 * Aceita DD/MM/YYYY (com 1 ou 2 digitos em dia/mes) e YYYY-MM-DD.
 * Devolve `null` para qualquer coisa invalida — o chamador decide o que fazer.
 */
export function parseDataExtratoBR(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  let ano: number;
  let mes: number;
  let dia: number;

  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (br) {
    dia = Number(br[1]);
    mes = Number(br[2]);
    ano = Number(br[3]);
  } else {
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!iso) return null;
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  }

  if (mes < 1 || mes > 12) return null;
  if (dia < 1 || dia > diasNoMes(ano, mes)) return null;

  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/**
 * Converte a coluna Tipo(C/D) de uma linha de extrato.
 *
 * Antes disso, ConciliacaoTab fazia `columns[3]?.toUpperCase() === 'D' ? 'D' :
 * 'C'` — qualquer coisa que nao fosse exatamente "D" virava CREDITO em
 * silencio, inclusive coluna ausente ou lixo. `tipoCompativel` (Relay 20) so
 * fail-closa se o valor que chega ja for 'C'/'D'; um CREDITO fabricado aqui
 * passa por ele igual a um CREDITO de verdade e o auto-match pareia um
 * credito falso contra um CREDITO interno real.
 *
 * Aceita 'C'/'D' com espaco em volta e em qualquer caixa — e entrada de CSV
 * de banco, igual a data. Nao aceita sinonimo nenhum (CR/DB/1/0 etc.): nao
 * apareceram no codigo, entao nao tem convencao para adivinhar.
 * Devolve `null` para qualquer coisa invalida — o chamador decide o que fazer,
 * mesmo padrao de `parseDataExtratoBR`.
 */
export function parseTipoExtrato(input: string | null | undefined): 'C' | 'D' | null {
  if (!input) return null;
  const s = String(input).trim().toUpperCase();
  if (s === 'C' || s === 'D') return s;
  return null;
}
