/**
 * RELAY 54 — item 14.3. O contrato 14, renovado via aditivo 14.1, aparece como
 * "Cheio" no relatório de descontos. Renovação não é diferenciada de venda
 * cheia.
 *
 * DIAGNÓSTICO (o tripwire pedia parar se a informação não existisse — ela
 * existe, e chega):
 *   - `contratos` é buscado com `select('*')`, então `data_inicio_original` e
 *     `valor_original` já vêm na linha. As medições do banco confirmam 3
 *     contratos com data_inicio_original <> data_inicio.
 *   - `useSupabaseContratos` já busca `aditivos_contratuais` e já EXPORTA
 *     `aditivos` — a tela simplesmente não consumia.
 *
 * Então não é falta de dado na query. A causa é de classificação: a tela
 * calcula um binário (`temDesconto`) e imprime 'Desconto' ou 'Cheio'. "Cheio"
 * é só o `else` de "não teve desconto" — nunca existiu a pergunta "houve
 * renovação?". Um contrato renovado sem desconto cai no else e é rotulado
 * como venda cheia.
 *
 * Vermelho antes ('Cheio' para o contrato renovado), verde depois
 * ('Renovação'), sem quebrar as duas classes que já funcionavam.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const useSupabaseContratosMock = vi.fn();

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-a-uuid', nome: 'Loja A' } }),
}));
vi.mock('@/hooks/useSupabaseContratos', () => ({
  useSupabaseContratos: (lojaId?: string) => useSupabaseContratosMock(lojaId),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { DescontosTab } from '../DescontosTab';

const periodo = { inicio: '2025-07-01', fim: '2025-08-31' };

// Contrato 14: renovado por aditivo. Valor final == valor de tabela, ou seja,
// SEM desconto — é exatamente por isso que caía no rótulo "Cheio".
const contratoRenovado = {
  id: 'c-14',
  numero: '14',
  created_at: '2025-07-11T10:00:00Z',
  clientes: { nome: 'Cliente Catorze' },
  valor_original: 1000,
  valor_total: 2000, // acumulou a renovação
  data_inicio: '2025-08-11',
  data_inicio_original: '2025-07-11', // ← sinal de renovação
  contrato_itens: [{ preco_total: 1000 }],
  logistica: { frete: 0 },
};

// Contrato 12: também renovado, mas o sinal vem do aditivo vinculado.
const contratoRenovadoViaAditivo = {
  id: 'c-12',
  numero: '12',
  created_at: '2025-07-05T10:00:00Z',
  clientes: { nome: 'Cliente Doze' },
  valor_original: 500,
  valor_total: 900,
  data_inicio: '2025-07-05',
  data_inicio_original: null, // sem o sinal da data...
  contrato_itens: [{ preco_total: 500 }],
  logistica: { frete: 0 },
};

// Venda cheia de verdade: sem desconto e sem renovação.
const contratoCheio = {
  id: 'c-20',
  numero: '20',
  created_at: '2025-07-20T10:00:00Z',
  clientes: { nome: 'Cliente Cheio' },
  valor_original: 300,
  valor_total: 300,
  data_inicio: '2025-07-20',
  data_inicio_original: null,
  contrato_itens: [{ preco_total: 300 }],
  logistica: { frete: 0 },
};

// Venda com desconto real.
const contratoComDesconto = {
  id: 'c-21',
  numero: '21',
  created_at: '2025-07-21T10:00:00Z',
  clientes: { nome: 'Cliente Desconto' },
  valor_original: 800,
  valor_total: 800,
  data_inicio: '2025-07-21',
  data_inicio_original: null,
  contrato_itens: [{ preco_total: 1000 }],
  logistica: { frete: 0 },
};

const linhaDoContrato = (numero: string) =>
  screen.getByText(numero).closest('tr')!;

beforeEach(() => {
  useSupabaseContratosMock.mockReset();
  useSupabaseContratosMock.mockReturnValue({
    contratos: [contratoRenovado, contratoRenovadoViaAditivo, contratoCheio, contratoComDesconto],
    aditivos: [{ id: 'ad-1', contrato_id: 'c-12', numero: '12.1', tipo: 'RENOVACAO', status: 'ATIVO' }],
    isLoading: false,
  });
});

describe('DescontosTab — renovação não é venda cheia (#14.3)', () => {
  it('rotula como Renovação o contrato com data_inicio_original diferente', () => {
    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('14');
    expect(within(linha).getByText('Renovação')).toBeInTheDocument();
    expect(within(linha).queryByText('Cheio')).not.toBeInTheDocument();
  });

  it('rotula como Renovação o contrato que tem aditivo vinculado', () => {
    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('12');
    expect(within(linha).getByText('Renovação')).toBeInTheDocument();
    expect(within(linha).queryByText('Cheio')).not.toBeInTheDocument();
  });

  it('mantém "Cheio" para venda sem desconto e sem renovação', () => {
    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('20');
    expect(within(linha).getByText('Cheio')).toBeInTheDocument();
  });

  it('mantém "Desconto" para venda com desconto real', () => {
    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('21');
    expect(within(linha).getByText('Desconto')).toBeInTheDocument();
  });

  it('NÃO trata aditivo de TAXA como renovação', () => {
    // aditivos_contratuais.tipo aceita RENOVACAO/DESCONTO/TAXA/AJUSTE/OUTRO, e
    // taxaDeslocamentoService cria TAXA automaticamente em venda comum. Marcar
    // qualquer aditivo como renovação rotularia venda normal de "Renovação".
    useSupabaseContratosMock.mockReturnValue({
      contratos: [contratoCheio],
      aditivos: [{ id: 'ad-t', contrato_id: 'c-20', numero: '20.1', tipo: 'TAXA' }],
      isLoading: false,
    });

    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('20');
    expect(within(linha).getByText('Cheio')).toBeInTheDocument();
    expect(within(linha).queryByText('Renovação')).not.toBeInTheDocument();
  });

  it('aditivo de DESCONTO não rouba o contrato do bucket "com desconto"', () => {
    // Pior consequência do bug: ehRenovacao tem precedência, então um contrato
    // com desconto real sairia de comDesconto e o valor sumiria do
    // totalDescontoConcedido — justamente o número que este relatório existe
    // para produzir.
    useSupabaseContratosMock.mockReturnValue({
      contratos: [contratoComDesconto],
      aditivos: [{ id: 'ad-d', contrato_id: 'c-21', numero: '21.1', tipo: 'DESCONTO' }],
      isLoading: false,
    });

    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('21');
    expect(within(linha).getByText('Desconto')).toBeInTheDocument();
    // R$ 200 de desconto (1000 tabela - 800 final) seguem contabilizados.
    expect(screen.getByText(/Desconto dado:/)).toHaveTextContent('200,00');
  });

  it('renovação CANCELADA deixa de ser contada como renovação', () => {
    // cancelarRenovacao faz soft-cancel (status CANCELADO) e reverte
    // data_inicio. O caminho da data se resolve sozinho; o do aditivo não, se
    // o status for ignorado.
    useSupabaseContratosMock.mockReturnValue({
      contratos: [contratoRenovadoViaAditivo],
      aditivos: [
        { id: 'ad-1', contrato_id: 'c-12', numero: '12.1', tipo: 'RENOVACAO', status: 'CANCELADO' },
      ],
      isLoading: false,
    });

    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('12');
    expect(within(linha).queryByText('Renovação')).not.toBeInTheDocument();
  });

  it('correção de data para TRÁS não vira renovação', () => {
    // O trigger congela data_inicio_original em qualquer UPDATE, então
    // corrigir uma data digitada errada faz as duas divergirem sem que haja
    // renovação. Renovação sempre empurra a data para frente.
    useSupabaseContratosMock.mockReturnValue({
      contratos: [
        { ...contratoCheio, data_inicio: '2025-07-18', data_inicio_original: '2025-07-20' },
      ],
      aditivos: [],
      isLoading: false,
    });

    render(<DescontosTab periodo={periodo} />);

    const linha = linhaDoContrato('20');
    expect(within(linha).getByText('Cheio')).toBeInTheDocument();
    expect(within(linha).queryByText('Renovação')).not.toBeInTheDocument();
  });

  it('não conta renovação como venda cheia no resumo', () => {
    render(<DescontosTab periodo={periodo} />);

    // Só o contrato 20 é venda cheia; 14 e 12 são renovações.
    const cardSemDesconto = screen.getByText('Sem desconto').closest('div')!.parentElement!;
    expect(within(cardSemDesconto).getByText('1')).toBeInTheDocument();
  });
});
