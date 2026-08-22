/**
 * Relay 70 — a consulta de duplicidade lê o BANCO, não o localStorage.
 *
 * O `dupSearch` anterior comparava contra `localStorage['titulosPagar']`, que
 * nenhum código jamais escreveu. Estes testes fixam o que a substituta precisa
 * enxergar — em particular o caso que motivou o relay: a mesma nota lançada em
 * duas lojas diferentes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Linhas que o "banco" devolve. Cada teste ajusta antes de chamar. */
let linhasNoBanco: Record<string, unknown>[] = [];
let devolverErro = false;

vi.mock('@/integrations/supabase/client', () => {
  const builder = () => {
    const query: Record<string, unknown> = {};
    const encadeavel = {
      select: () => encadeavel,
      eq: () => encadeavel,
      not: () => encadeavel,
      then: (resolve: (v: unknown) => unknown) =>
        resolve(
          devolverErro
            ? { data: null, error: { message: 'rls' } }
            : { data: linhasNoBanco, error: null }
        ),
    };
    return Object.assign(encadeavel, query);
  };

  return { supabase: { from: builder } };
});

const { buscarDuplicidades } = await import('../anti-duplicidade-consulta');

const FORNECEDOR = '11111111-1111-1111-1111-111111111111';
const CHAVE = '35260812345678000199550010000012341000012345';

const linha = (extra: Record<string, unknown>) => ({
  id: 'titulo-existente',
  loja_id: 'loja-001',
  fornecedor_id: FORNECEDOR,
  numero: 'NF 12345',
  valor: 1500,
  emissao: '2026-03-10',
  status: 'EM_EDICAO',
  doc_tipo: 'NF',
  doc_numero: '12345',
  chave_fiscal_44: null,
  ...extra,
});

beforeEach(() => {
  linhasNoBanco = [];
  devolverErro = false;
});

describe('buscarDuplicidades', () => {
  it('acha a mesma nota lançada em OUTRA loja', () => {
    // O cenário do relay: 4 lojas, e a proteção só vale se enxergar entre elas.
    linhasNoBanco = [linha({ loja_id: 'loja-002' })];

    return buscarDuplicidades({
      fornecedorId: FORNECEDOR,
      docTipo: 'NF',
      docNumero: '12345',
    }).then((matches) => {
      expect(matches).toHaveLength(1);
      expect(matches[0].unidadeId).toBe('loja-002');
      expect(matches[0].tipo).toBe('BLOQUEANTE');
    });
  });

  it('acha apesar da pontuação diferente no número', async () => {
    linhasNoBanco = [linha({ doc_numero: '12.345' })];

    const matches = await buscarDuplicidades({
      fornecedorId: FORNECEDOR,
      docTipo: 'NF',
      docNumero: '12345',
    });

    expect(matches).toHaveLength(1);
  });

  it('acha por chave fiscal mesmo com tipo de documento diferente', async () => {
    linhasNoBanco = [linha({ chave_fiscal_44: CHAVE, doc_tipo: 'Outro', doc_numero: '999' })];

    const matches = await buscarDuplicidades({ chaveFiscal44: CHAVE });

    expect(matches).toHaveLength(1);
    expect(matches[0].motivo).toBe('fiscal');
  });

  it('ignora tipo de documento diferente na regra do número', async () => {
    linhasNoBanco = [linha({ doc_tipo: 'Boleto' })];

    const matches = await buscarDuplicidades({
      fornecedorId: FORNECEDOR,
      docTipo: 'NF',
      docNumero: '12345',
    });

    expect(matches).toHaveLength(0);
  });

  it('não casa o título consigo mesmo ao editar', async () => {
    linhasNoBanco = [linha({})];

    const matches = await buscarDuplicidades({
      fornecedorId: FORNECEDOR,
      docTipo: 'NF',
      docNumero: '12345',
      idAtual: 'titulo-existente',
    });

    expect(matches).toHaveLength(0);
  });

  it('não duplica o match quando as duas regras apontam o mesmo título', async () => {
    linhasNoBanco = [linha({ chave_fiscal_44: CHAVE })];

    const matches = await buscarDuplicidades({
      fornecedorId: FORNECEDOR,
      docTipo: 'NF',
      docNumero: '12345',
      chaveFiscal44: CHAVE,
    });

    expect(matches).toHaveLength(1);
  });

  it('erro na consulta não vira falso "sem duplicidade" que bloqueia o fluxo', async () => {
    // Se a consulta falhar (RLS, rede), ela devolve vazio e o insert segue —
    // e é o índice único que recusa. O oposto (travar o lançamento) puniria o
    // usuário por uma falha de leitura.
    devolverErro = true;
    linhasNoBanco = [linha({})];

    const matches = await buscarDuplicidades({
      fornecedorId: FORNECEDOR,
      docTipo: 'NF',
      docNumero: '12345',
    });

    expect(matches).toEqual([]);
  });

  it('sem documento e sem chave, não consulta nada', async () => {
    linhasNoBanco = [linha({})];

    const matches = await buscarDuplicidades({ fornecedorId: FORNECEDOR, docNumero: '' });

    expect(matches).toEqual([]);
  });
});
