import { describe, it, expect } from 'vitest';
import { mapContratosParaListagem, type ContratoListagemRow } from '@/lib/contratos-listagem-mapper';

/**
 * RELAY 34 — item 6.6
 *
 * O mapeamento em Contratos.tsx:39-44 montava o item do contrato só com
 * { id, equipamentoId, quantidade, valorTotal } — sem `preco_unitario` nem
 * `periodo`. RenovarContratoModal lê `item.preco_unitario` para calcular o
 * valor da renovação; como o campo nunca chegava, o cálculo caía no fallback
 * `|| 0` e toda renovação saía com valor zero, mesmo em contrato com preço
 * certo no banco (contrato_itens.preco_unitario = 60, periodo = 'DIARIA').
 */

const contratoRow = (over: Partial<ContratoListagemRow> = {}): ContratoListagemRow => ({
  id: 'ct-1',
  numero: '12',
  cliente_id: 'cli-1',
  loja_id: 'loja-1',
  status: 'ATIVO',
  data_inicio: '2026-08-28',
  data_fim: null,
  data_prevista_fim: '2026-08-31',
  valor_total: 60,
  created_at: '2026-08-17T00:00:00.000Z',
  contrato_itens: [],
  clientes: { nome: 'QA Contrato Wizard', razao_social: null, cpf: '111.444.777-35', cnpj: null },
  ...over,
});

describe('mapContratosParaListagem', () => {
  it('inclui preco_unitario no item, para o modal de renovação calcular o valor', () => {
    const [contrato] = mapContratosParaListagem([
      contratoRow({
        contrato_itens: [
          { id: 'it-1', equipamento_id: 'eq-1', quantidade: 1, preco_total: 60, preco_unitario: 60, periodo: 'DIARIA', modelo_id: null, grupo_id: null },
        ],
      }),
    ]);

    expect(contrato.itens[0].preco_unitario).toBe(60);
  });

  it('inclui periodo no item, para o modal calcular dias/período corretamente', () => {
    const [contrato] = mapContratosParaListagem([
      contratoRow({
        contrato_itens: [
          { id: 'it-1', equipamento_id: 'eq-1', quantidade: 1, preco_total: 420, preco_unitario: 60, periodo: 'SEMANA', modelo_id: null, grupo_id: null },
        ],
      }),
    ]);

    expect(contrato.itens[0].periodo).toBe('SEMANA');
  });

  it('inclui modeloId e grupoId, usados pela política comercial na renovação', () => {
    const [contrato] = mapContratosParaListagem([
      contratoRow({
        contrato_itens: [
          { id: 'it-1', equipamento_id: 'eq-1', quantidade: 1, preco_total: 60, preco_unitario: 60, periodo: 'DIARIA', modelo_id: 'mod-1', grupo_id: 'grp-1' },
        ],
      }),
    ]);

    expect(contrato.itens[0].modeloId).toBe('mod-1');
    expect(contrato.itens[0].grupoId).toBe('grp-1');
  });

  it('preserva os campos já existentes (id, equipamentoId, quantidade, valorTotal)', () => {
    const [contrato] = mapContratosParaListagem([
      contratoRow({
        contrato_itens: [
          { id: 'it-1', equipamento_id: 'eq-1', quantidade: 2, preco_total: 120, preco_unitario: 60, periodo: 'DIARIA', modelo_id: null, grupo_id: null },
        ],
      }),
    ]);

    expect(contrato.itens[0]).toMatchObject({
      id: 'it-1',
      equipamentoId: 'eq-1',
      quantidade: 2,
      valorTotal: 120,
    });
  });

  it('não quebra quando contrato_itens vem vazio', () => {
    const [contrato] = mapContratosParaListagem([contratoRow({ contrato_itens: [] })]);

    expect(contrato.itens).toEqual([]);
  });
});
