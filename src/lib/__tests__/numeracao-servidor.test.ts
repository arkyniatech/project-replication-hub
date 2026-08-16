import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { generateNumber } from '@/lib/numeracao';
import { useNumeracao } from '@/hooks/useNumeracao';

/**
 * RELAY 26 — a numeração de titulo e fatura migrou para o banco (trigger BEFORE
 * INSERT com contador dedicado por loja).
 *
 * Estes testes travam o lado do FRONTEND: que a geração local está desligada
 * para esses dois tipos e continua viva para os demais.
 *
 * O comportamento do trigger em si (atomicidade, sequências por loja, respeito a
 * número preenchido) é testado em SQL, contra um Postgres real:
 *   - supabase/tests/numeracao_titulos_faturas.test.sql   (pgTAP)
 *   - scripts/test-numeracao-concorrencia.sql             (pgbench, 2 sessões)
 * Não dá para provar bloqueio de linha com mock — por isso não há mock aqui.
 */
describe('numeração server-side (RELAY 26)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('tipos numerados no servidor', () => {
    it('generateNumber("titulo") lança em vez de gerar número local', () => {
      expect(() => generateNumber('titulo')).toThrow(/gerada pelo banco/i);
    });

    it('generateNumber("fatura") lança em vez de gerar número local', () => {
      expect(() => generateNumber('fatura')).toThrow(/gerada pelo banco/i);
    });

    it('a mensagem de erro orienta a omitir a coluna numero', () => {
      expect(() => generateNumber('titulo')).toThrow(/omita a coluna "numero"/i);
    });

    it('lança mesmo quando uma unidade é informada', () => {
      expect(() => generateNumber('fatura', 'loja-001')).toThrow(/gerada pelo banco/i);
    });
  });

  describe('tipos NÃO migrados continuam funcionando', () => {
    // ATENÇÃO: estes testes documentam o comportamento ATUAL, que inclui um bug
    // PRÉ-EXISTENTE de prefixo duplicado ("LOCLOC-", "ADTADT-", "OSOS-").
    // numeracao.ts faz `tipoConfig.prefixo + tipoConfig.template`, mas o template
    // já embute o prefixo ("LOC-{YYYY}-{SEQ:5}"), então ele entra duas vezes.
    //
    // NÃO corrigido aqui de propósito: contrato tem UNIQUE(loja_id, numero) e
    // dados gravados com esse formato. Consertar mudaria a numeração de contratos
    // em produção, que o RELAY 26 manda explicitamente não tocar.
    // Anotado no PR para relay futuro.
    it('contrato ainda gera número local (com prefixo duplicado pré-existente)', () => {
      expect(generateNumber('contrato')).toMatch(/^LOCLOC-\d{4}-\d{5}$/);
    });

    it('aditivo ainda gera número local (com prefixo duplicado pré-existente)', () => {
      expect(generateNumber('aditivo')).toMatch(/^ADTADT-\d{4}-\d{4}$/);
    });

    it('os ainda gera número local (com prefixo duplicado pré-existente)', () => {
      expect(generateNumber('os')).toMatch(/^OSOS-\d{4}-\d{2}-\d{4}$/);
    });
  });
});

describe('useNumeracao — fallback Date.now() (RELAY 26)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('NÃO mascara titulo com TITULO-{Date.now()}: propaga o erro', () => {
    const { result } = renderHook(() => useNumeracao());

    // O fallback antigo devolveria `TITULO-1765...`, gravando um número fora da
    // sequência da loja — e esse valor vira seuNumero no boleto do Inter.
    expect(() => result.current.gerarNumero('titulo')).toThrow(/gerada pelo banco/i);
  });

  it('NÃO mascara fatura com FATURA-{Date.now()}: propaga o erro', () => {
    const { result } = renderHook(() => useNumeracao());

    expect(() => result.current.gerarNumero('fatura')).toThrow(/gerada pelo banco/i);
  });

  it('mantém o fallback para tipos não migrados (contrato)', () => {
    const { result } = renderHook(() => useNumeracao());

    expect(result.current.gerarNumero('contrato')).toMatch(/^LOCLOC-/);
  });
});
