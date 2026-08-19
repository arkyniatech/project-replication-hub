/**
 * RELAY 55 — LOTE C, migration 1 (#14.4).
 *
 * Não há acesso ao banco a partir daqui (a divisão de papéis é: o usuário
 * aplica migrations). O que dá para travar em teste é o TEXTO da migration,
 * que é onde as três decisões de segurança do item vivem:
 *
 *  1. o predicado tem que ser o mesmo de user_lojas_permitidas usado pela
 *     política de SELECT — não um predicado inventado;
 *  2. tem que ter USING **e** WITH CHECK, senão o admin move a loja para fora
 *     do próprio escopo;
 *  3. não pode encostar em master, INSERT nem DELETE.
 *
 * Se alguém editar a migration e quebrar qualquer uma das três, isto falha.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
  join(__dirname, '..', '20260819120000_lojas_update_admin_escopo.sql'),
  'utf8'
);

/** SQL sem comentários — para afirmar o que a migration REALMENTE executa. */
const EXECUTABLE = SQL.replace(/--[^\n]*/g, '');

describe('migration 1 — política de UPDATE em lojas (#14.4)', () => {
  it('cria exatamente uma política, de UPDATE, em public.lojas', () => {
    expect(EXECUTABLE.match(/CREATE POLICY/g)).toHaveLength(1);
    expect(EXECUTABLE).toMatch(/ON public\.lojas\s+FOR UPDATE/);
  });

  it('replica o predicado da política de SELECT (user_lojas_permitidas)', () => {
    const predicado =
      /id IN \(\s*SELECT loja_id FROM public\.user_lojas_permitidas WHERE user_id = auth\.uid\(\)\s*\)/;
    // uma vez no USING, outra no WITH CHECK
    expect(EXECUTABLE.match(predicado)).not.toBeNull();
    expect(
      EXECUTABLE.match(new RegExp(predicado.source, 'g'))
    ).toHaveLength(2);
  });

  it('tem USING e WITH CHECK — sem WITH CHECK o admin tira a loja do escopo', () => {
    expect(EXECUTABLE).toMatch(/USING \(/);
    expect(EXECUTABLE).toMatch(/WITH CHECK \(/);
  });

  it('exige o papel admin nos dois lados', () => {
    expect(
      EXECUTABLE.match(/has_role\(auth\.uid\(\), 'admin'::app_role\)/g)
    ).toHaveLength(2);
  });

  it('não mexe em INSERT, DELETE, nem na política de master', () => {
    expect(EXECUTABLE).not.toMatch(/FOR INSERT/);
    expect(EXECUTABLE).not.toMatch(/FOR DELETE/);
    expect(EXECUTABLE).not.toMatch(/FOR ALL/);
    expect(EXECUTABLE).not.toMatch(/is_master/);
    // o único DROP permitido é o da própria política, para idempotência
    const drops = EXECUTABLE.match(/DROP POLICY[^;]*/g) ?? [];
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatch(/"Admin pode atualizar suas lojas"/);
  });

  it('é idempotente (DROP ... IF EXISTS antes do CREATE)', () => {
    expect(EXECUTABLE).toMatch(/DROP POLICY IF EXISTS "Admin pode atualizar suas lojas"/);
  });
});
