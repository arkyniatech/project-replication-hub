import { describe, it, expect } from 'vitest';
import {
  mapContratosParaAgenda,
  type ContratoRow,
} from '@/lib/contratos-agenda-mapper';

/**
 * Dados fictícios em memória — nenhuma chamada de rede/banco.
 *
 * Regressão coberta: `contrato_itens.controle` é gravado com o vocabulário do
 * BANCO ('SERIE' | 'GRUPO'), garantido por CHECK constraint. O mapeamento
 * antigo comparava contra 'SERIALIZADO' (vocabulário de TELA), então a
 * condição nunca era verdadeira e `equipId` saía sempre `undefined`, mesmo
 * para item de série com equipamento vinculado.
 */
const contratoRow = (over: Partial<ContratoRow> = {}): ContratoRow => ({
  id: 'ct-1',
  numero: '0001',
  loja_id: 'loja-1',
  status: 'ATIVO',
  data_inicio: '2026-01-10',
  data_fim: '2026-01-20',
  clientes: { nome: 'Cliente Teste' },
  contrato_itens: [],
  ...over,
});

describe('mapContratosParaAgenda', () => {
  it('preenche equipId para item com controle SERIE (vocabulário do banco)', () => {
    const [contrato] = mapContratosParaAgenda([
      contratoRow({
        contrato_itens: [
          {
            equipamento_id: 'equip-abc',
            modelo_id: 'mod-1',
            controle: 'SERIE',
            quantidade: 1,
          },
        ],
      }),
    ]);

    expect(contrato.itens[0].equipId).toBe('equip-abc');
    expect(contrato.itens[0].tipoControle).toBe('SERIALIZADO');
  });

  it('não preenche equipId para item com controle GRUPO', () => {
    const [contrato] = mapContratosParaAgenda([
      contratoRow({
        contrato_itens: [
          {
            equipamento_id: 'equip-grupo',
            modelo_id: 'mod-2',
            controle: 'GRUPO',
            quantidade: 3,
          },
        ],
      }),
    ]);

    expect(contrato.itens[0].equipId).toBeUndefined();
    expect(contrato.itens[0].tipoControle).toBe('SALDO');
  });

  it('aceita o valor legado SERIALIZADO vindo de gravações antigas', () => {
    const [contrato] = mapContratosParaAgenda([
      contratoRow({
        contrato_itens: [
          { equipamento_id: 'equip-legado', controle: 'SERIALIZADO' },
        ],
      }),
    ]);

    expect(contrato.itens[0].equipId).toBe('equip-legado');
    expect(contrato.itens[0].tipoControle).toBe('SERIALIZADO');
  });

  it('deixa equipId indefinido quando o item de série não tem equipamento vinculado', () => {
    const [comNulo] = mapContratosParaAgenda([
      contratoRow({
        contrato_itens: [{ equipamento_id: null, controle: 'SERIE' }],
      }),
    ]);
    const [comVazio] = mapContratosParaAgenda([
      contratoRow({
        contrato_itens: [{ equipamento_id: '', controle: 'SERIE' }],
      }),
    ]);

    expect(comNulo.itens[0].equipId).toBeUndefined();
    expect(comVazio.itens[0].equipId).toBeUndefined();
  });

  it('tolera variação de caixa no valor de controle', () => {
    const [contrato] = mapContratosParaAgenda([
      contratoRow({
        contrato_itens: [{ equipamento_id: 'equip-x', controle: 'serie' }],
      }),
    ]);

    expect(contrato.itens[0].equipId).toBe('equip-x');
    expect(contrato.itens[0].tipoControle).toBe('SERIALIZADO');
  });

  it('não quebra com lista vazia ou contrato sem itens', () => {
    expect(mapContratosParaAgenda([])).toEqual([]);

    const [semItens] = mapContratosParaAgenda([
      contratoRow({ contrato_itens: null }),
    ]);
    expect(semItens.itens).toEqual([]);
  });

  it('mapeia status do contrato para status do item', () => {
    const [ativo] = mapContratosParaAgenda([
      contratoRow({
        status: 'ATIVO',
        contrato_itens: [{ equipamento_id: 'e1', controle: 'SERIE' }],
      }),
    ]);
    const [aguardando] = mapContratosParaAgenda([
      contratoRow({
        status: 'AGUARDANDO_ENTREGA',
        contrato_itens: [{ equipamento_id: 'e1', controle: 'SERIE' }],
      }),
    ]);

    expect(ativo.itens[0].status).toBe('LOCADO');
    expect(aguardando.itens[0].status).toBe('RESERVADO');
  });

  it('usa data_inicio como fim quando data_fim é nula', () => {
    const [contrato] = mapContratosParaAgenda([
      contratoRow({
        data_fim: null,
        contrato_itens: [{ equipamento_id: 'e1', controle: 'SERIE' }],
      }),
    ]);

    expect(contrato.itens[0].periodo.fim).toBe('2026-01-10');
  });
});
