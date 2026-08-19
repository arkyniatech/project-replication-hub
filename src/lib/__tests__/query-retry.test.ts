import { describe, it, expect } from 'vitest';
import { isRetryablePostgrestError } from '../query-retry';

/**
 * RELAY 48 — item 10.5 (extra). /manutencao/pecas/novo chamava useOS("novo").
 * Medido ao vivo: o Postgres responde 400 com code 22P02 ("invalid input
 * syntax for type uuid") de forma IMEDIATA e determinística — não é falha de
 * rede. O QueryClient global (App.tsx) usa retry:3 sem exceção, então a tela
 * refazia a mesma query 4 vezes (1 tentativa + 3 retries) antes de assentar
 * em "OS não encontrada" — não trava para sempre, mas multiplica requests e
 * atraso visível para um erro que já era conhecido na primeira resposta.
 *
 * 22P02 é permanente: repetir a mesma query com o mesmo id inválido nunca
 * muda o resultado. Não deve ser retentado.
 */
describe('isRetryablePostgrestError', () => {
  it('não retenta 22P02 (uuid malformado — erro permanente, não de rede)', () => {
    const erro = { code: '22P02', message: 'invalid input syntax for type uuid: "novo"' };
    expect(isRetryablePostgrestError(0, erro)).toBe(false);
  });

  it('retenta erros sem code de Postgres (ex.: falha de rede)', () => {
    const erroRede = new TypeError('Failed to fetch');
    expect(isRetryablePostgrestError(0, erroRede)).toBe(true);
  });

  it('respeita o teto de 3 tentativas mesmo para erros retentáveis', () => {
    const erroRede = new TypeError('Failed to fetch');
    expect(isRetryablePostgrestError(3, erroRede)).toBe(false);
  });

  it('não retenta PGRST116 (single() sem linha — 0 ou >1 resultados, também permanente)', () => {
    const erro = { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' };
    expect(isRetryablePostgrestError(0, erro)).toBe(false);
  });
});
