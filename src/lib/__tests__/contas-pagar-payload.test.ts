/**
 * Relay 61 — o payload que sai para o Supabase só pode conter coluna real.
 *
 * O item 8.1 do checklist falhava em produção com "Could not find the 'anexos'
 * column of 'titulos_pagar' in the schema cache". Não era um campo só: eram
 * sete grupos, e o PostgREST reporta um por vez. Estes testes fixam a
 * fronteira para que o próximo campo imaginário morra no CI, não no navegador
 * do usuário.
 */
import { describe, it, expect } from 'vitest';
import {
  COLUNAS_TITULOS_PAGAR,
  COLUNAS_PARCELAS_PAGAR,
  sanitizarTituloPagar,
  sanitizarParcelaPagar,
  sanitizarMovimentoPagar,
} from '@/lib/contas-pagar-payload';
import { montarTituloParaInsert, montarParcelasParaInsert } from '@/lib/contas-pagar-titulo';

describe('sanitização de payload de contas a pagar', () => {
  it('descarta os campos fantasma de titulos_pagar', () => {
    const saida = sanitizarTituloPagar({
      loja_id: 'loja-1',
      valor: 1000,
      // fantasmas medidos no relay 61
      valor_total: 1000,
      categoria_codigo: 'Combustível',
      qtd_parcelas: 3,
      vencimento_inicial: '2026-09-10',
      condicao: 'A prazo',
      doc_tipo: 'NF',
      doc_numero: '123',
      chave_fiscal_44: 'x'.repeat(44),
      dup_justificativa: 'ok',
      anexos: [{ nome: 'a.pdf' }],
      timeline: [{ tipo: 'TITULO_CRIADO' }],
    });

    expect(saida).toEqual({ loja_id: 'loja-1', valor: 1000 });
  });

  it('descarta os campos fantasma de parcelas_pagar', () => {
    const saida = sanitizarParcelaPagar({
      vencimento: '2026-09-10',
      valor: 500,
      conta_preferencial_id: 'conta-1',
      observacoes: 'nao existe em parcelas_pagar',
      reprogramacoes: [{ de: 'a', para: 'b' }],
      anexos: [],
    });

    expect(saida).toEqual({ vencimento: '2026-09-10', valor: 500 });
  });

  it('não converte undefined em null num update parcial', () => {
    // update parcial não pode apagar coluna que o usuário não tocou
    expect(sanitizarTituloPagar({ status: 'PAGO', categoria: undefined })).toEqual({
      status: 'PAGO',
    });
  });

  it('movimentos_pagar já estava correto: nada é descartado', () => {
    const movimento = {
      parcela_id: 'p1',
      titulo_id: 't1',
      conta_id: 'c1',
      loja_id: 'l1',
      data_pagamento: '2026-03-10',
      valor_bruto: 100,
      juros: 0,
      multa: 0,
      desconto: 0,
      forma: 'PIX',
      comprovante_url: 'l1/123_Comprovante_Pagamento_Marco.pdf',
      observacoes: '',
    };

    expect(sanitizarMovimentoPagar(movimento)).toEqual(movimento);
  });
});

describe('montarTituloParaInsert', () => {
  const form = {
    fornecedorId: 'forn-1',
    categoriaCodigo: 'Combustível',
    valorTotal: '900',
    qtdParcelas: 3,
    vencimentoInicial: '2026-09-10',
    condicao: 'A prazo',
    observacao: 'abastecimento',
    docTipo: 'NF',
    docNumero: '456',
    chaveFiscal44: '',
    emissaoISO: '2026-08-21',
  };

  it('só produz colunas que existem em titulos_pagar', () => {
    const payload = montarTituloParaInsert({
      form,
      lojaId: 'loja-1',
      enviarAprovacao: false,
    });

    for (const chave of Object.keys(payload)) {
      expect(COLUNAS_TITULOS_PAGAR).toContain(chave);
    }
  });

  it('preenche as colunas NOT NULL que a tela nunca enviava', () => {
    const payload = montarTituloParaInsert({
      form,
      lojaId: 'loja-1',
      enviarAprovacao: false,
    });

    // numero e vencimento são NOT NULL: o insert antigo nem chegava a testá-los
    // porque quebrava antes, em `anexos`.
    expect(payload.numero).toBeTruthy();
    expect(payload.vencimento).toBe('2026-09-10');
    expect(payload.valor).toBe(900);
    expect(payload.categoria).toBe('Combustível');
  });

  it('mapeia doc fiscal para o numero do titulo em vez de perder o dado', () => {
    const payload = montarTituloParaInsert({
      form,
      lojaId: 'loja-1',
      enviarAprovacao: false,
    });

    expect(String(payload.numero)).toContain('456');
  });
});

describe('montarParcelasParaInsert', () => {
  const parcelas = [
    { id: 'tmp-1', numero: 1, vencimento: '2026-09-10', valor: 300 },
    { id: 'tmp-2', numero: 2, vencimento: '2026-10-10', valor: 300 },
    { id: 'tmp-3', numero: 3, vencimento: '2026-11-10', valor: 300 },
  ];

  it('só produz colunas que existem em parcelas_pagar', () => {
    const linhas = montarParcelasParaInsert(parcelas, 'titulo-1');

    expect(linhas).toHaveLength(3);
    for (const linha of linhas) {
      for (const chave of Object.keys(linha)) {
        expect(COLUNAS_PARCELAS_PAGAR).toContain(chave);
      }
    }
  });

  it('vincula todas as parcelas ao titulo criado', () => {
    const linhas = montarParcelasParaInsert(parcelas, 'titulo-1');
    expect(linhas.every((l) => l.titulo_id === 'titulo-1')).toBe(true);
    expect(linhas.map((l) => l.numero)).toEqual([1, 2, 3]);
  });

  it('descarta o id temporario da tela', () => {
    const linhas = montarParcelasParaInsert(parcelas, 'titulo-1');
    expect(linhas[0]).not.toHaveProperty('id');
  });
});
