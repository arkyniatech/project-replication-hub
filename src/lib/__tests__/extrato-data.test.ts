import { describe, it, expect } from 'vitest';
import { parseDataExtratoBR, parseTipoExtrato } from '../extrato-data';

/**
 * Relay 18 / 2.1: o extrato bancario chega em DD/MM/YYYY (o formato que a
 * propria UI pede: "Data;Historico;Valor;Tipo(C/D);Doc;Saldo"), mas a coluna
 * `data` de fin_extrato_linhas e DATE. Gravar a string BR crua fazia o Postgres
 * recusar com `date/time field value out of range: "15/08/2026"`.
 *
 * O parser precisa ser ESTRITO: uma data invalida tem que virar erro visivel na
 * importacao, nunca uma string que so explode la no banco.
 */
describe('parseDataExtratoBR', () => {
  it('converte a data BR do extrato para ISO', () => {
    expect(parseDataExtratoBR('15/08/2026')).toBe('2026-08-15');
  });

  it('preserva dia e mes sem trocar a ordem', () => {
    // 01/12 e 12/01 nao podem colidir: e o erro classico de DD/MM vs MM/DD.
    expect(parseDataExtratoBR('01/12/2026')).toBe('2026-12-01');
    expect(parseDataExtratoBR('12/01/2026')).toBe('2026-01-12');
  });

  it('aceita dia/mes com um digito so', () => {
    // toISODateLocal lia "1/8/2026" como 2026-01-08 (janeiro): data errada,
    // silenciosa, pior que erro.
    expect(parseDataExtratoBR('1/8/2026')).toBe('2026-08-01');
  });

  it('tolera espaco em volta', () => {
    expect(parseDataExtratoBR(' 15/08/2026 ')).toBe('2026-08-15');
  });

  it('aceita data que ja veio em ISO', () => {
    expect(parseDataExtratoBR('2026-08-15')).toBe('2026-08-15');
  });

  // --- casos de borda: todos tem que devolver null, nunca string torta ---

  it('rejeita mes maior que 12', () => {
    expect(parseDataExtratoBR('15/13/2026')).toBeNull();
  });

  it('rejeita dia maior que o mes comporta', () => {
    expect(parseDataExtratoBR('32/01/2026')).toBeNull();
    expect(parseDataExtratoBR('31/04/2026')).toBeNull(); // abril tem 30
    expect(parseDataExtratoBR('30/02/2026')).toBeNull();
  });

  it('valida ano bissexto de verdade', () => {
    expect(parseDataExtratoBR('29/02/2024')).toBe('2024-02-29'); // bissexto
    expect(parseDataExtratoBR('29/02/2026')).toBeNull(); // nao bissexto
  });

  it('rejeita dia ou mes zero', () => {
    expect(parseDataExtratoBR('00/08/2026')).toBeNull();
    expect(parseDataExtratoBR('15/00/2026')).toBeNull();
  });

  it('rejeita ano com 2 digitos', () => {
    // Ambiguo: 26 e 1926 ou 2026? Recusar e mais honesto que adivinhar.
    expect(parseDataExtratoBR('15/08/26')).toBeNull();
  });

  it('rejeita campo vazio', () => {
    expect(parseDataExtratoBR('')).toBeNull();
    expect(parseDataExtratoBR('   ')).toBeNull();
    expect(parseDataExtratoBR(null)).toBeNull();
    expect(parseDataExtratoBR(undefined)).toBeNull();
  });

  it('rejeita lixo que nao e data', () => {
    expect(parseDataExtratoBR('abc')).toBeNull();
    expect(parseDataExtratoBR('15-08-2026')).toBeNull();
    expect(parseDataExtratoBR('15/08/2026 SAQUE')).toBeNull();
  });
});

/**
 * Relay 21: `columns[3]?.toUpperCase() === 'D' ? 'D' : 'C'` fazia tipo ausente
 * ou lixo virar CREDITO em silencio. O fail-closed do auto-match (Relay 20)
 * so ajuda se o que chega ate ele ja for 'C'/'D' de verdade — por isso o
 * parser tem que recusar tipo invalido na entrada, igual a data invalida.
 */
describe('parseTipoExtrato', () => {
  it('aceita D', () => {
    expect(parseTipoExtrato('D')).toBe('D');
  });

  it('aceita C', () => {
    expect(parseTipoExtrato('C')).toBe('C');
  });

  it('rejeita tipo vazio', () => {
    expect(parseTipoExtrato('')).toBeNull();
    expect(parseTipoExtrato('   ')).toBeNull();
    expect(parseTipoExtrato(null)).toBeNull();
    expect(parseTipoExtrato(undefined)).toBeNull();
  });

  it('rejeita tipo desconhecido', () => {
    expect(parseTipoExtrato('X')).toBeNull();
  });

  it('rejeita sinonimos nao vistos no codigo', () => {
    expect(parseTipoExtrato('CR')).toBeNull();
    expect(parseTipoExtrato('DB')).toBeNull();
    expect(parseTipoExtrato('CREDITO')).toBeNull();
    expect(parseTipoExtrato('DEBITO')).toBeNull();
    expect(parseTipoExtrato('1')).toBeNull();
    expect(parseTipoExtrato('0')).toBeNull();
  });

  it('normaliza minuscula', () => {
    expect(parseTipoExtrato('d')).toBe('D');
    expect(parseTipoExtrato('c')).toBe('C');
  });

  it('tolera espaco em volta', () => {
    expect(parseTipoExtrato(' D ')).toBe('D');
    expect(parseTipoExtrato(' c ')).toBe('C');
  });
});
