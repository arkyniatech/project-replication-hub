import { describe, it, expect } from 'vitest';
import {
  tipoCompativel,
  regra1DocEValor,
  regra2ValorEData,
} from '../conciliacao-match';
import type { ExtratoLinha, Lancamento } from '@/types/financeiro';

const extrato = (over: Partial<ExtratoLinha> = {}): ExtratoLinha => ({
  id: 'e1',
  conciliacaoId: 'c1',
  data: '2026-08-16',
  historico: 'QA transferencia',
  valor: 100,
  tipo: 'D',
  ...over,
});

const lancamento = (over: Partial<Lancamento> = {}): Lancamento => ({
  id: 'l1',
  contaId: 'conta1',
  lojaId: 'loja1',
  tipo: 'DEBITO',
  valor: 100,
  data: '2026-08-16',
  origem: 'MANUAL',
  createdAtISO: '2026-08-16T00:00:00.000Z',
  ...over,
});

describe('tipoCompativel — convencao D<->DEBITO / C<->CREDITO', () => {
  it('D casa com DEBITO', () => {
    expect(tipoCompativel('D', 'DEBITO')).toBe(true);
  });

  it('C casa com CREDITO', () => {
    expect(tipoCompativel('C', 'CREDITO')).toBe(true);
  });

  it('D NAO casa com CREDITO (saida vs entrada)', () => {
    expect(tipoCompativel('D', 'CREDITO')).toBe(false);
  });

  it('C NAO casa com DEBITO (entrada vs saida)', () => {
    expect(tipoCompativel('C', 'DEBITO')).toBe(false);
  });

  it('fail-closed: tipo ausente ou desconhecido nunca casa', () => {
    expect(tipoCompativel(undefined, 'DEBITO')).toBe(false);
    expect(tipoCompativel(null, 'CREDITO')).toBe(false);
    expect(tipoCompativel('' as ExtratoLinha['tipo'], 'DEBITO')).toBe(false);
    expect(tipoCompativel('X' as ExtratoLinha['tipo'], 'DEBITO')).toBe(false);
    expect(tipoCompativel('d' as ExtratoLinha['tipo'], 'DEBITO')).toBe(false);
    expect(tipoCompativel('D', undefined)).toBe(false);
    expect(tipoCompativel('D', 'ESTORNO' as Lancamento['tipo'])).toBe(false);
  });
});

describe('Regra 2 — mesmo valor em +-3 dias', () => {
  it('D com DEBITO, mesmo valor e data -> PAREIA', () => {
    expect(regra2ValorEData(extrato({ tipo: 'D' }), lancamento({ tipo: 'DEBITO' }))).toBe(true);
  });

  it('C com CREDITO, mesmo valor e data -> PAREIA', () => {
    expect(regra2ValorEData(extrato({ tipo: 'C' }), lancamento({ tipo: 'CREDITO' }))).toBe(true);
  });

  it('D com CREDITO, mesmo valor e data -> NAO PAREIA (o bug do Relay 20)', () => {
    const linha = extrato({ tipo: 'D', historico: 'QA transferencia enviada' });
    const lanc = lancamento({ tipo: 'CREDITO', descricao: 'Transferência recebida · Estorno' });
    expect(regra2ValorEData(linha, lanc)).toBe(false);
  });

  it('C com DEBITO, mesmo valor e data -> NAO PAREIA', () => {
    expect(regra2ValorEData(extrato({ tipo: 'C' }), lancamento({ tipo: 'DEBITO' }))).toBe(false);
  });

  it('tipo ausente ou desconhecido no extrato -> NAO PAREIA (fail-closed)', () => {
    const semTipo = extrato({ tipo: undefined as unknown as ExtratoLinha['tipo'] });
    const desconhecido = extrato({ tipo: 'X' as ExtratoLinha['tipo'] });
    expect(regra2ValorEData(semTipo, lancamento({ tipo: 'DEBITO' }))).toBe(false);
    expect(regra2ValorEData(desconhecido, lancamento({ tipo: 'DEBITO' }))).toBe(false);
  });

  it('mantem o comportamento antigo de valor e janela quando o tipo bate', () => {
    const linha = extrato({ tipo: 'D' });
    // dentro da janela
    expect(regra2ValorEData(linha, lancamento({ data: '2026-08-19' }))).toBe(true);
    expect(regra2ValorEData(linha, lancamento({ data: '2026-08-13' }))).toBe(true);
    // fora da janela
    expect(regra2ValorEData(linha, lancamento({ data: '2026-08-20' }))).toBe(false);
    // valor diferente
    expect(regra2ValorEData(linha, lancamento({ valor: 100.5 }))).toBe(false);
    // centavos dentro da tolerancia
    expect(regra2ValorEData(linha, lancamento({ valor: 100.005 }))).toBe(true);
  });
});

describe('Regra 1 — mesmo valor e doc', () => {
  const comDoc = (over: Partial<ExtratoLinha> = {}) => extrato({ doc: 'DOC123', ...over });
  const casaDoc = (over: Partial<Lancamento> = {}) => lancamento({ refId: 'ref-DOC123', ...over });

  it('D com DEBITO, mesmo valor e doc -> PAREIA', () => {
    expect(regra1DocEValor(comDoc({ tipo: 'D' }), casaDoc({ tipo: 'DEBITO' }))).toBe(true);
  });

  it('C com CREDITO, mesmo valor e doc -> PAREIA', () => {
    expect(regra1DocEValor(comDoc({ tipo: 'C' }), casaDoc({ tipo: 'CREDITO' }))).toBe(true);
  });

  it('D com CREDITO, mesmo valor e doc -> NAO PAREIA (mesmo defeito da Regra 2)', () => {
    expect(regra1DocEValor(comDoc({ tipo: 'D' }), casaDoc({ tipo: 'CREDITO' }))).toBe(false);
  });

  it('C com DEBITO, mesmo valor e doc -> NAO PAREIA', () => {
    expect(regra1DocEValor(comDoc({ tipo: 'C' }), casaDoc({ tipo: 'DEBITO' }))).toBe(false);
  });

  it('tipo ausente ou desconhecido no extrato -> NAO PAREIA (fail-closed)', () => {
    const semTipo = comDoc({ tipo: undefined as unknown as ExtratoLinha['tipo'] });
    const desconhecido = comDoc({ tipo: 'X' as ExtratoLinha['tipo'] });
    expect(regra1DocEValor(semTipo, casaDoc({ tipo: 'DEBITO' }))).toBe(false);
    expect(regra1DocEValor(desconhecido, casaDoc({ tipo: 'DEBITO' }))).toBe(false);
  });

  it('mantem o comportamento antigo de doc e valor quando o tipo bate', () => {
    // casa por descricao, nao so por refId
    expect(
      regra1DocEValor(comDoc(), lancamento({ descricao: 'pagamento DOC123 loja' })),
    ).toBe(true);
    // linha sem doc nunca entra na Regra 1
    expect(regra1DocEValor(extrato({ doc: undefined }), casaDoc())).toBe(false);
    // doc que nao aparece no lancamento
    expect(regra1DocEValor(comDoc(), lancamento({ refId: 'ref-OUTRO' }))).toBe(false);
    // valor diferente
    expect(regra1DocEValor(comDoc(), casaDoc({ valor: 250 }))).toBe(false);
  });
});
