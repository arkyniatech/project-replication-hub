import { describe, it, expect } from 'vitest';
import { validarSeriesRecebimento, ItemRecebimentoValidacao } from '../recebimento-validation';

const item = (overrides: Partial<ItemRecebimentoValidacao>): ItemRecebimentoValidacao => ({
  itemId: 'item-1',
  descricao: 'Furadeira',
  isSerial: true,
  quantidade: 1,
  series: [],
  ...overrides,
});

describe('validarSeriesRecebimento', () => {
  it('reprova item serializado sem nenhuma série informada', () => {
    const resultado = validarSeriesRecebimento([item({ quantidade: 2, series: [] })]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].itemId).toBe('item-1');
  });

  it('reprova item serializado com menos séries do que a quantidade recebida', () => {
    const resultado = validarSeriesRecebimento([
      item({ quantidade: 3, series: ['S001', 'S002'] }),
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].seriesInformadas).toBe(2);
  });

  it('reprova item serializado com mais séries do que a quantidade recebida', () => {
    const resultado = validarSeriesRecebimento([
      item({ quantidade: 1, series: ['S001', 'S002'] }),
    ]);
    expect(resultado).toHaveLength(1);
  });

  it('ignora séries em branco/duplicadas por espaço ao contar', () => {
    const resultado = validarSeriesRecebimento([
      item({ quantidade: 2, series: ['S001', '  ', 'S002'] }),
    ]);
    expect(resultado).toHaveLength(0);
  });

  it('aprova item serializado com série por unidade recebida', () => {
    const resultado = validarSeriesRecebimento([
      item({ quantidade: 2, series: ['S001', 'S002'] }),
    ]);
    expect(resultado).toHaveLength(0);
  });

  it('ignora item nao serializado mesmo sem series', () => {
    const resultado = validarSeriesRecebimento([
      item({ isSerial: false, quantidade: 5, series: [] }),
    ]);
    expect(resultado).toHaveLength(0);
  });

  it('ignora item serializado com quantidade recebida zero', () => {
    const resultado = validarSeriesRecebimento([
      item({ isSerial: true, quantidade: 0, series: [] }),
    ]);
    expect(resultado).toHaveLength(0);
  });

  it('reporta múltiplos itens inválidos ao mesmo tempo', () => {
    const resultado = validarSeriesRecebimento([
      item({ itemId: 'a', quantidade: 2, series: ['S001'] }),
      item({ itemId: 'b', isSerial: false, quantidade: 5, series: [] }),
      item({ itemId: 'c', quantidade: 1, series: ['S010'] }),
    ]);
    expect(resultado.map(r => r.itemId)).toEqual(['a']);
  });
});
