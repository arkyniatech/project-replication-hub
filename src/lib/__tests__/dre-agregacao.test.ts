import { describe, it, expect } from 'vitest';
import {
  SEM_CATEGORIA,
  RECEITA_LOCACAO,
  dentroDoPeriodo,
  competenciaParaIntervalo,
  agregarDRE,
} from '../dre-agregacao';

/**
 * Relay 66. Até aqui o DRE somava dois mocks encadeados (expensesData em
 * DRE.tsx e mapRealByN2AndCC em centro-custo-utils.ts), cujos valores foram
 * fabricados para bater entre si — R$125.430,00 que nunca saíram do banco.
 *
 * Regras travadas aqui:
 *  - categoria casa por NOME com categorias_n2.nome (não há FK; é TEXT livre)
 *  - categoria ausente ou desconhecida vira "Sem categoria", nunca é descartada
 *  - receita é uma linha só ("Locação"): titulos.categoria grava 'LOCACAO'
 *  - competência lê titulos.valor / titulos_pagar.valor; caixa lê
 *    recebimentos.valor_liquido / movimentos_pagar.valor_liquido
 *  - período sem lançamento devolve zero, não erro nem estimativa
 */

describe('competenciaParaIntervalo', () => {
  it('devolve o primeiro e o último dia da competência', () => {
    expect(competenciaParaIntervalo('2026-08')).toEqual({
      inicio: '2026-08-01',
      fim: '2026-08-31',
    });
  });

  it('acerta o último dia de fevereiro em ano bissexto', () => {
    expect(competenciaParaIntervalo('2024-02').fim).toBe('2024-02-29');
  });

  it('acerta o último dia de fevereiro em ano comum', () => {
    expect(competenciaParaIntervalo('2026-02').fim).toBe('2026-02-28');
  });
});

describe('dentroDoPeriodo', () => {
  const intervalo = { inicio: '2026-08-01', fim: '2026-08-31' };

  it('aceita as bordas do intervalo', () => {
    expect(dentroDoPeriodo('2026-08-01', intervalo)).toBe(true);
    expect(dentroDoPeriodo('2026-08-31', intervalo)).toBe(true);
  });

  it('rejeita fora do intervalo', () => {
    expect(dentroDoPeriodo('2026-07-31', intervalo)).toBe(false);
    expect(dentroDoPeriodo('2026-09-01', intervalo)).toBe(false);
  });

  it('rejeita data ausente em vez de estourar', () => {
    expect(dentroDoPeriodo(null, intervalo)).toBe(false);
    expect(dentroDoPeriodo(undefined, intervalo)).toBe(false);
  });

  // Timestamps do Postgres chegam como '2026-08-10T13:00:00+00:00'.
  it('compara pelo prefixo de data, ignorando a hora', () => {
    expect(dentroDoPeriodo('2026-08-10T13:00:00+00:00', intervalo)).toBe(true);
  });
});

describe('agregarDRE — receita em competência', () => {
  it('soma titulos.valor emitidos no período', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [
        { emissao: '2026-08-05', valor: 3000, lojaId: 'loja-1' },
        { emissao: '2026-08-20', valor: 1700, lojaId: 'loja-1' },
      ],
      recebimentos: [],
      titulosPagar: [],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.totalReceita).toBe(4700);
    expect(dre.receita).toEqual([{ nome: RECEITA_LOCACAO, valor: 4700 }]);
  });

  it('ignora título emitido fora do período', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [
        { emissao: '2026-07-31', valor: 999, lojaId: 'loja-1' },
        { emissao: '2026-08-01', valor: 100, lojaId: 'loja-1' },
      ],
      recebimentos: [],
      titulosPagar: [],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.totalReceita).toBe(100);
  });

  it('não usa recebimentos quando o regime é competência', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [{ data: '2026-08-10', valorLiquido: 1002.5, lojaId: 'loja-1' }],
      titulosPagar: [],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.totalReceita).toBe(0);
  });
});

describe('agregarDRE — receita em caixa', () => {
  it('soma recebimentos.valor_liquido do período', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'CAIXA',
      titulos: [{ emissao: '2026-08-05', valor: 4700, lojaId: 'loja-1' }],
      recebimentos: [
        { data: '2026-08-10', valorLiquido: 1000, lojaId: 'loja-1' },
        { data: '2026-08-11', valorLiquido: 2.5, lojaId: 'loja-1' },
      ],
      titulosPagar: [],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.totalReceita).toBe(1002.5);
  });

  it('ignora recebimento fora do período', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'CAIXA',
      titulos: [],
      recebimentos: [{ data: '2026-09-01', valorLiquido: 500, lojaId: 'loja-1' }],
      titulosPagar: [],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.totalReceita).toBe(0);
  });
});

describe('agregarDRE — despesa agrupada por categoria', () => {
  const categorias = [
    { nome: 'Manutenção de frota', tipo: 'DESPESA' },
    { nome: 'Combustível', tipo: 'DESPESA' },
  ];

  it('agrupa titulos_pagar por categoria em competência', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 2400, categoria: 'Manutenção de frota', lojaId: 'loja-1' },
        { emissao: '2026-08-09', valor: 600, categoria: 'Combustível', lojaId: 'loja-1' },
        { emissao: '2026-08-15', valor: 100, categoria: 'Combustível', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias,
    });

    expect(dre.totalDespesa).toBe(3100);
    expect(dre.despesa).toEqual([
      { nome: 'Combustível', valor: 700 },
      { nome: 'Manutenção de frota', valor: 2400 },
    ]);
  });

  it('usa vencimento quando o título não tem emissao', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: null, vencimento: '2026-08-20', valor: 500, categoria: 'Combustível', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias,
    });

    expect(dre.totalDespesa).toBe(500);
  });

  it('agrupa por categoria do título em regime de caixa', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'CAIXA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { id: 't1', emissao: '2026-07-02', valor: 2400, categoria: 'Manutenção de frota', lojaId: 'loja-1' },
      ],
      movimentosPagar: [
        { tituloId: 't1', dataPagamento: '2026-08-10', valorLiquido: 800, lojaId: 'loja-1' },
        { tituloId: 't1', dataPagamento: '2026-08-11', valorLiquido: 1600, lojaId: 'loja-1' },
      ],
      categorias,
    });

    // O título é de julho; o pagamento é de agosto. Em caixa, entra em agosto.
    expect(dre.totalDespesa).toBe(2400);
    expect(dre.despesa).toEqual([{ nome: 'Manutenção de frota', valor: 2400 }]);
  });
});

describe('agregarDRE — categoria fora de categorias_n2', () => {
  it('agrupa categoria desconhecida como "Sem categoria" sem descartar o valor', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 300, categoria: 'Categoria Extinta', lojaId: 'loja-1' },
        { emissao: '2026-08-03', valor: 200, categoria: 'Combustível', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Combustível', tipo: 'DESPESA' }],
    });

    // O total tem que continuar fechando: 300 + 200.
    expect(dre.totalDespesa).toBe(500);
    expect(dre.despesa).toContainEqual({ nome: SEM_CATEGORIA, valor: 300 });
  });

  it('trata categoria nula ou vazia como "Sem categoria"', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 100, categoria: null, lojaId: 'loja-1' },
        { emissao: '2026-08-03', valor: 50, categoria: '   ', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.despesa).toEqual([{ nome: SEM_CATEGORIA, valor: 150 }]);
    expect(dre.totalDespesa).toBe(150);
  });

  it('casa a categoria ignorando espaços e caixa', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 100, categoria: '  combustível ', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Combustível', tipo: 'DESPESA' }],
    });

    // Mantém a grafia cadastrada em categorias_n2, não a do título.
    expect(dre.despesa).toEqual([{ nome: 'Combustível', valor: 100 }]);
  });

  it('não agrupa em despesa uma categoria cadastrada como RECEITA', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 100, categoria: 'Locação', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Locação', tipo: 'RECEITA' }],
    });

    // Continua somando no total — só não usa um rótulo de receita numa linha
    // de despesa, que leria como se a receita fosse custo.
    expect(dre.totalDespesa).toBe(100);
    expect(dre.despesa).toEqual([{ nome: SEM_CATEGORIA, valor: 100 }]);
  });
});

describe('agregarDRE — resultado', () => {
  it('resultado é receita menos despesa', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [{ emissao: '2026-08-05', valor: 4700, lojaId: 'loja-1' }],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 2400, categoria: 'Manutenção de frota', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Manutenção de frota', tipo: 'DESPESA' }],
    });

    expect(dre.totalReceita).toBe(4700);
    expect(dre.totalDespesa).toBe(2400);
    expect(dre.resultado).toBe(2300);
  });

  it('resultado é negativo quando a despesa supera a receita', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [{ emissao: '2026-08-05', valor: 100, lojaId: 'loja-1' }],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 400, categoria: 'Combustível', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Combustível', tipo: 'DESPESA' }],
    });

    expect(dre.resultado).toBe(-300);
  });
});

describe('agregarDRE — período sem lançamento', () => {
  it('devolve zero em vez de erro ou estimativa', () => {
    const dre = agregarDRE({
      competencia: '2026-01',
      regime: 'COMPETENCIA',
      titulos: [{ emissao: '2026-08-05', valor: 4700, lojaId: 'loja-1' }],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 2400, categoria: 'Combustível', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Combustível', tipo: 'DESPESA' }],
    });

    expect(dre.totalReceita).toBe(0);
    expect(dre.totalDespesa).toBe(0);
    expect(dre.resultado).toBe(0);
    expect(dre.despesa).toEqual([]);
    // A linha de receita permanece, zerada: zero honesto, não linha sumida.
    expect(dre.receita).toEqual([{ nome: RECEITA_LOCACAO, valor: 0 }]);
  });

  it('sobrevive a listas vazias', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [],
      movimentosPagar: [],
      categorias: [],
    });

    expect(dre.resultado).toBe(0);
  });

  it('sobrevive a valores nulos sem virar NaN', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [{ emissao: '2026-08-05', valor: null as never, lojaId: 'loja-1' }],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: undefined as never, categoria: 'Combustível', lojaId: 'loja-1' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Combustível', tipo: 'DESPESA' }],
    });

    expect(dre.totalReceita).toBe(0);
    expect(dre.totalDespesa).toBe(0);
    expect(dre.resultado).toBe(0);
  });
});

describe('agregarDRE — filtro de loja', () => {
  const base = {
    competencia: '2026-08' as const,
    categorias: [{ nome: 'Combustível', tipo: 'DESPESA' }],
  };

  it('restringe receita e despesa à loja selecionada', () => {
    const dre = agregarDRE({
      ...base,
      regime: 'COMPETENCIA',
      lojaId: 'loja-1',
      titulos: [
        { emissao: '2026-08-05', valor: 1000, lojaId: 'loja-1' },
        { emissao: '2026-08-06', valor: 7777, lojaId: 'loja-2' },
      ],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 400, categoria: 'Combustível', lojaId: 'loja-1' },
        { emissao: '2026-08-03', valor: 8888, categoria: 'Combustível', lojaId: 'loja-2' },
      ],
      movimentosPagar: [],
    });

    expect(dre.totalReceita).toBe(1000);
    expect(dre.totalDespesa).toBe(400);
    expect(dre.resultado).toBe(600);
  });

  it('restringe também em regime de caixa', () => {
    const dre = agregarDRE({
      ...base,
      regime: 'CAIXA',
      lojaId: 'loja-1',
      titulos: [],
      recebimentos: [
        { data: '2026-08-10', valorLiquido: 300, lojaId: 'loja-1' },
        { data: '2026-08-10', valorLiquido: 5000, lojaId: 'loja-2' },
      ],
      titulosPagar: [
        { id: 't1', emissao: '2026-07-01', valor: 400, categoria: 'Combustível', lojaId: 'loja-1' },
        { id: 't2', emissao: '2026-07-01', valor: 999, categoria: 'Combustível', lojaId: 'loja-2' },
      ],
      movimentosPagar: [
        { tituloId: 't1', dataPagamento: '2026-08-12', valorLiquido: 400, lojaId: 'loja-1' },
        { tituloId: 't2', dataPagamento: '2026-08-12', valorLiquido: 999, lojaId: 'loja-2' },
      ],
    });

    expect(dre.totalReceita).toBe(300);
    expect(dre.totalDespesa).toBe(400);
  });

  it('sem lojaId, soma todas as lojas', () => {
    const dre = agregarDRE({
      ...base,
      regime: 'COMPETENCIA',
      titulos: [
        { emissao: '2026-08-05', valor: 1000, lojaId: 'loja-1' },
        { emissao: '2026-08-06', valor: 500, lojaId: 'loja-2' },
      ],
      recebimentos: [],
      titulosPagar: [],
      movimentosPagar: [],
    });

    expect(dre.totalReceita).toBe(1500);
  });
});

describe('agregarDRE — ordenação das linhas', () => {
  it('ordena despesas por nome, para a tabela não dançar entre renders', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 1, categoria: 'Peças e insumos', lojaId: 'l' },
        { emissao: '2026-08-02', valor: 1, categoria: 'Aluguel de imóvel', lojaId: 'l' },
        { emissao: '2026-08-02', valor: 1, categoria: 'Combustível', lojaId: 'l' },
      ],
      movimentosPagar: [],
      categorias: [
        { nome: 'Peças e insumos', tipo: 'DESPESA' },
        { nome: 'Aluguel de imóvel', tipo: 'DESPESA' },
        { nome: 'Combustível', tipo: 'DESPESA' },
      ],
    });

    expect(dre.despesa.map((l) => l.nome)).toEqual([
      'Aluguel de imóvel',
      'Combustível',
      'Peças e insumos',
    ]);
  });

  it('mantém "Sem categoria" no fim da lista', () => {
    const dre = agregarDRE({
      competencia: '2026-08',
      regime: 'COMPETENCIA',
      titulos: [],
      recebimentos: [],
      titulosPagar: [
        { emissao: '2026-08-02', valor: 1, categoria: 'Zeladoria', lojaId: 'l' },
        { emissao: '2026-08-02', valor: 1, categoria: null, lojaId: 'l' },
      ],
      movimentosPagar: [],
      categorias: [{ nome: 'Zeladoria', tipo: 'DESPESA' }],
    });

    expect(dre.despesa.map((l) => l.nome)).toEqual(['Zeladoria', SEM_CATEGORIA]);
  });
});
