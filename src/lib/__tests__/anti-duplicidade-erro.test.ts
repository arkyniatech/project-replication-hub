/**
 * Relay 70 — a constraint vai disparar, e o usuário precisa entender por quê.
 *
 * Sem tratamento, o PostgREST devolve a mensagem crua do Postgres:
 *
 *   duplicate key value violates unique constraint
 *   "idx_titulos_pagar_documento_unico"
 *
 * O operador do financeiro preencheu o formulário inteiro e recebe o nome de
 * um índice. Ele não sabe que a nota já existe, não sabe qual título é o
 * anterior, e a tendência natural é tentar de novo mudando alguma coisa — que
 * é exatamente o caminho para criar a duplicata com um centavo de diferença
 * que a constraint não pega.
 */
import { describe, it, expect } from 'vitest';
import {
  ehErroDeDuplicidade,
  mensagemDeDuplicidade,
  CODIGO_UNIQUE_VIOLATION,
} from '../anti-duplicidade';

const erroChaveFiscal = {
  code: CODIGO_UNIQUE_VIOLATION,
  message:
    'duplicate key value violates unique constraint "idx_titulos_pagar_chave_fiscal_unica"',
};

const erroDocumento = {
  code: CODIGO_UNIQUE_VIOLATION,
  message:
    'duplicate key value violates unique constraint "idx_titulos_pagar_documento_unico"',
};

describe('reconhecer o 23505 dos nossos dois índices', () => {
  it('reconhece violação da chave fiscal', () => {
    expect(ehErroDeDuplicidade(erroChaveFiscal)).toBe(true);
  });

  it('reconhece violação do documento', () => {
    expect(ehErroDeDuplicidade(erroDocumento)).toBe(true);
  });

  it('não confunde com outro erro qualquer', () => {
    expect(ehErroDeDuplicidade({ code: '23503', message: 'foreign key' })).toBe(false);
    expect(ehErroDeDuplicidade({ message: 'network error' })).toBe(false);
    expect(ehErroDeDuplicidade(null)).toBe(false);
    expect(ehErroDeDuplicidade(undefined)).toBe(false);
  });

  it('não sequestra um 23505 de OUTRA constraint', () => {
    // Se um dia titulos_pagar ganhar outro índice único, o erro dele não deve
    // sair na tela como "nota já lançada".
    const outro = {
      code: CODIGO_UNIQUE_VIOLATION,
      message: 'duplicate key value violates unique constraint "titulos_pagar_pkey"',
    };

    expect(ehErroDeDuplicidade(outro)).toBe(false);
  });
});

describe('mensagem que o usuário lê', () => {
  it('explica a chave fiscal sem citar o nome do índice', () => {
    const msg = mensagemDeDuplicidade(erroChaveFiscal);

    expect(msg).toMatch(/já foi lançada/i);
    expect(msg).not.toMatch(/duplicate key|constraint|idx_/i);
  });

  it('explica o documento sem citar o nome do índice', () => {
    const msg = mensagemDeDuplicidade(erroDocumento);

    expect(msg).toMatch(/já foi lançad/i);
    expect(msg).not.toMatch(/duplicate key|constraint|idx_/i);
  });

  it('inclui o número do título existente quando ele é conhecido', () => {
    // "Já existe" sem dizer QUAL manda o usuário procurar no escuro.
    const msg = mensagemDeDuplicidade(erroDocumento, { numero: 'NF 12345' });

    expect(msg).toContain('NF 12345');
  });

  it('não inventa referência quando o título existente não foi encontrado', () => {
    const msg = mensagemDeDuplicidade(erroDocumento, null);

    expect(msg).toBeTruthy();
    expect(msg).not.toMatch(/undefined|null/);
  });
});
