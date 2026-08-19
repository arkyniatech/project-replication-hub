import { describe, it, expect } from 'vitest';
import {
  PARCELAS_PAGAR_SELECT,
  TITULOS_PAGAR_SELECT,
  CATEGORIAS_N2_SELECT,
  normalizarParcelaPagar,
} from '../contas-pagar-select';

/**
 * Relay 47 / seção 8. As três queries de contas a pagar pediam relações e
 * colunas que não existem no schema. Medido no banco:
 *
 *  - parcelas_pagar só tem FK titulo_id -> titulos_pagar. O fornecedor está a
 *    dois saltos (parcelas -> titulos -> fornecedores), então o embed direto
 *    `fornecedor:fornecedores(...)` nunca teve como resolver.
 *  - titulos_pagar.categoria é TEXT livre, não uuid. Não existe categoria_id
 *    nem relação com categorias_n2.
 *  - categorias_n2 tem (id, nome, tipo, ativo, ...). Não tem codigo nem
 *    descricao.
 *
 * Estes testes travam as queries contra o schema real.
 */

describe('PARCELAS_PAGAR_SELECT', () => {
  it('não pede embed direto de fornecedores no nível de topo (FK não existe)', () => {
    // O embed só é válido aninhado sob titulos_pagar. No topo, resolveria
    // parcelas_pagar -> fornecedores, relação que não existe: 400.
    const antesDoTitulo = PARCELAS_PAGAR_SELECT.slice(
      0,
      PARCELAS_PAGAR_SELECT.indexOf('titulo:titulos_pagar('),
    );
    expect(antesDoTitulo).not.toMatch(/fornecedor/);
  });

  it('alcança o fornecedor aninhado sob titulos_pagar', () => {
    // O único caminho real: parcelas -> titulos -> fornecedores.
    expect(PARCELAS_PAGAR_SELECT).toMatch(/titulo:titulos_pagar\(/);
    const titulo = PARCELAS_PAGAR_SELECT.slice(
      PARCELAS_PAGAR_SELECT.indexOf('titulo:titulos_pagar('),
    );
    expect(titulo).toMatch(/fornecedor:fornecedores\(/);
  });

  it('pede de fornecedores apenas colunas que existem', () => {
    expect(PARCELAS_PAGAR_SELECT).not.toMatch(/fornecedores\([^)]*\bcodigo\b/);
  });

  it('não pede doc_numero em titulos_pagar (coluna não existe)', () => {
    expect(PARCELAS_PAGAR_SELECT).not.toMatch(/doc_numero/);
  });
});

describe('TITULOS_PAGAR_SELECT', () => {
  it('não faz join com categorias_n2 (relação não existe no modelo)', () => {
    expect(TITULOS_PAGAR_SELECT).not.toMatch(/categorias_n2/);
  });

  it('mantém o embed de fornecedores, que tem FK real', () => {
    expect(TITULOS_PAGAR_SELECT).toMatch(/fornecedor:fornecedores\(/);
  });

  it('não pede codigo de fornecedores', () => {
    expect(TITULOS_PAGAR_SELECT).not.toMatch(/fornecedores\([^)]*\bcodigo\b/);
  });
});

describe('CATEGORIAS_N2_SELECT', () => {
  it('não referencia codigo nem descricao (colunas não existem)', () => {
    expect(CATEGORIAS_N2_SELECT).not.toMatch(/\bcodigo\b/);
    expect(CATEGORIAS_N2_SELECT).not.toMatch(/\bdescricao\b/);
  });
});

describe('normalizarParcelaPagar', () => {
  const linha = {
    id: 'p1',
    titulo_id: 't1',
    numero: 2,
    vencimento: '2026-08-20',
    valor: 300,
    valor_pago: 100,
    status: 'ABERTA',
    titulo: {
      id: 't1',
      numero: 'TIT-9',
      loja_id: 'loja-1',
      categoria: 'Manutenção',
      fornecedor_id: 'f1',
      fornecedor: { id: 'f1', nome: 'Fornecedor Um' },
    },
  };

  it('deriva saldo de valor - valor_pago (não existe coluna saldo)', () => {
    expect(normalizarParcelaPagar(linha).saldo).toBe(200);
  });

  it('expõe pago a partir de valor_pago', () => {
    expect(normalizarParcelaPagar(linha).pago).toBe(100);
  });

  it('trata valor_pago nulo como zero', () => {
    const semPagamento = { ...linha, valor_pago: null };
    expect(normalizarParcelaPagar(semPagamento).pago).toBe(0);
    expect(normalizarParcelaPagar(semPagamento).saldo).toBe(300);
  });

  it('nunca devolve saldo negativo', () => {
    const pagoAMais = { ...linha, valor: 100, valor_pago: 150 };
    expect(normalizarParcelaPagar(pagoAMais).saldo).toBe(0);
  });

  it('promove o fornecedor de dois saltos para o topo', () => {
    expect(normalizarParcelaPagar(linha).fornecedor?.nome).toBe('Fornecedor Um');
  });

  it('promove loja_id e fornecedor_id do título (parcela não os tem)', () => {
    const p = normalizarParcelaPagar(linha);
    expect(p.loja_id).toBe('loja-1');
    expect(p.fornecedor_id).toBe('f1');
  });

  it('usa titulos_pagar.categoria (TEXT livre) como categoria da parcela', () => {
    expect(normalizarParcelaPagar(linha).categoria_codigo).toBe('Manutenção');
  });

  it('mapeia numero para numero_parcela', () => {
    expect(normalizarParcelaPagar(linha).numero_parcela).toBe(2);
  });

  it('sobrevive a título ausente sem estourar', () => {
    const orfa = { ...linha, titulo: null };
    const p = normalizarParcelaPagar(orfa);
    expect(p.fornecedor).toBeUndefined();
    expect(p.loja_id).toBeUndefined();
    expect(p.saldo).toBe(200);
  });
});
