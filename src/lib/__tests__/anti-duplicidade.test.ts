/**
 * Relay 70 — anti-duplicidade de nota fiscal.
 *
 * A proteção anterior não era fraca: ela nunca existiu. `updateDupIndex` estava
 * importado no drawer e nunca era chamado, `localStorage['titulosPagar']` nunca
 * era escrito por ninguém, e `dupSearch` percorria um índice permanentemente
 * vazio — sempre devolvendo `[]`. O DuplicityReviewModal, com 379 linhas, alçada
 * por valor e justificativa obrigatória, nunca abriu uma vez em produção.
 *
 * Agora a checagem é do BANCO: dois índices únicos. Este arquivo testa a
 * montagem da chave que o banco vai indexar — se o cliente calcular uma chave
 * diferente da que o SQL calcula, a tela diz "tudo certo" e o insert é recusado
 * com 23505. Por isso o último teste compara as duas normalizações caractere a
 * caractere.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeDocNumber,
  normalizeFiscalKey,
  chaveDocumento,
  chaveFiscalIndexavel,
  colidemPorDocumento,
  colidemPorChaveFiscal,
  normalizarComoSQL,
} from '../anti-duplicidade';

const FORNECEDOR_A = '11111111-1111-1111-1111-111111111111';
const FORNECEDOR_B = '22222222-2222-2222-2222-222222222222';
const CHAVE_44 = '35260812345678000199550010000012341000012345';

describe('chave fiscal — identificador nacional, vale entre lojas', () => {
  it('mesma chave fiscal em lojas diferentes colide', () => {
    // A chave de 44 dígitos já contém CNPJ do emitente, modelo, série e
    // número. Duas notas com a mesma chave SÃO a mesma nota. A loja não entra
    // na comparação de propósito: nota lançada na 001 e de novo na 002 é
    // exatamente o caso que se quer barrar.
    const naLoja001 = { chaveFiscal44: CHAVE_44, lojaId: 'loja-001' };
    const naLoja002 = { chaveFiscal44: CHAVE_44, lojaId: 'loja-002' };

    expect(colidemPorChaveFiscal(naLoja001, naLoja002)).toBe(true);
  });

  it('chave meio digitada não entra no índice', () => {
    // Guard de 44 dígitos: indexar chave incompleta criaria colisão entre duas
    // notas diferentes que o operador ainda estava digitando.
    expect(chaveFiscalIndexavel('3526081234')).toBeNull();
    expect(chaveFiscalIndexavel(CHAVE_44)).toBe(CHAVE_44);
  });

  it('pontuação na chave não impede a colisão', () => {
    const comPontuacao = { chaveFiscal44: '3526 0812.345/678000199550010000012341000012345' };
    const limpa = { chaveFiscal44: CHAVE_44 };

    expect(colidemPorChaveFiscal(comPontuacao, limpa)).toBe(true);
  });
});

describe('fornecedor + tipo + número — para despesa sem NF-e', () => {
  it('mesmo fornecedor e número com pontuação diferente colide', () => {
    const a = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '12.345' };
    const b = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '12345' };

    expect(colidemPorDocumento(a, b)).toBe(true);
  });

  it('mesmo fornecedor e número com VALORES DIFERENTES colide', () => {
    // Este é o teste que justifica manter valor FORA da chave. Se o valor
    // entrasse, o operador que redigita a nota e erra um centavo produziria
    // uma chave diferente e passaria pela constraint — o erro de digitação
    // viraria bypass, no exato cenário que a proteção existe para pegar.
    const a = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '12345', valor: 1500.0 };
    const b = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '12345', valor: 1500.01 };

    expect(colidemPorDocumento(a, b)).toBe(true);
  });

  it('fornecedores diferentes com o mesmo número NÃO colidem', () => {
    // Numeração de nota é sequencial POR emitente: dois fornecedores emitem
    // "NF 1" no primeiro dia de operação de cada um.
    const a = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '12345' };
    const b = { fornecedorId: FORNECEDOR_B, docTipo: 'NF', docNumero: '12345' };

    expect(colidemPorDocumento(a, b)).toBe(false);
  });

  it('documento nulo ou vazio não colide com nada, nem consigo mesmo', () => {
    // Despesa sem documento (reembolso, ajuste) tem que poder ser lançada
    // muitas vezes. No índice parcial do banco isso é o WHERE que exclui
    // NULL e string vazia.
    const semDoc = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '' };
    const outroSemDoc = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: null };

    expect(chaveDocumento(semDoc)).toBeNull();
    expect(colidemPorDocumento(semDoc, outroSemDoc)).toBe(false);
  });

  it('tipos de documento diferentes não colidem', () => {
    // Boleto 123 e NF 123 do mesmo fornecedor são documentos distintos.
    const nota = { fornecedorId: FORNECEDOR_A, docTipo: 'NF', docNumero: '123' };
    const boleto = { fornecedorId: FORNECEDOR_A, docTipo: 'Boleto', docNumero: '123' };

    expect(colidemPorDocumento(nota, boleto)).toBe(false);
  });
});

describe('normalização do cliente e do SQL produzem o MESMO resultado', () => {
  /**
   * O teste que impede a divergência entre tela e banco. `normalizarComoSQL`
   * reimplementa em JS exatamente o que o índice funcional faz em Postgres:
   *
   *   regexp_replace(upper(doc_numero), '[^A-Z0-9]', '', 'g')
   *
   * A ORDEM importa e foi medida: `upper()` PRIMEIRO, filtro depois. Na ordem
   * inversa — regexp_replace com [^A-Za-z0-9] e upper por fora — 'ß' e 'ﬁ'
   * são descartados antes de virarem 'SS' e 'FI', enquanto o cliente, que faz
   * toUpperCase() primeiro, os expande e conserva. Duas chaves diferentes para
   * a mesma entrada.
   */
  const ENTRADAS = [
    'NF 12345',
    'nf-12345',
    '12.345',
    '12345',
    'ABC/2026-01',
    'nf 000123',
    'Ç123',
    'Nº 45',
    'ß123',
    'ﬁ123',
    '  ',
    '',
  ];

  it.each(ENTRADAS)('cliente e SQL normalizam %j de forma idêntica', (entrada) => {
    expect(normalizarComoSQL(entrada)).toBe(normalizeDocNumber(entrada));
  });

  it('normalizeFiscalKey mantém só dígitos, como o SQL da chave fiscal', () => {
    expect(normalizeFiscalKey('3526 0812.345/678')).toBe('35260812345678');
  });
});
