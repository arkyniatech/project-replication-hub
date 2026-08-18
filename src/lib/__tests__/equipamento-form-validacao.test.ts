// RELAY 41 / item 9.12 — regressão pega no code review.
//
// Ao remover a geração de código no cliente, o campo `codigo` do formulário
// passou a ficar SEMPRE vazio no cadastro: não há input editável ligado a ele e
// a pré-geração via useEffect foi removida. Mas validateForm continuava
// exigindo `codigo` para SERIALIZADO — o que tornava impossível cadastrar
// qualquer equipamento serializado. Pior: nada renderiza errors.codigo, então
// o usuário via só um toast genérico "Corrija os campos destacados" sem
// nenhum campo destacado.
//
// O bug era invisível para a suíte inteira: tsc passa, e os testes pgTAP
// inserem via SQL direto, sem passar pelo formulário. Este teste fecha essa
// lacuna — valida a regra de negócio do formulário sem renderizar a página.
import { describe, it, expect } from 'vitest';
import { validarEquipamentoForm } from '../equipamento-form-validacao';

const base = {
  grupoId: 'grupo-1',
  modeloId: 'modelo-1',
  nome: 'Betoneira 400L',
  valorIndenizacao: '1.500,00',
  lojaId: 'loja-1',
  quantidade: '1',
  tipoControle: 'SERIALIZADO' as const,
};

describe('validarEquipamentoForm', () => {
  it('aceita SERIALIZADO sem código — o trigger gera no INSERT', () => {
    const erros = validarEquipamentoForm(base);
    expect(erros).toEqual({});
  });

  it('nunca produz erro no campo codigo (não há input para corrigir)', () => {
    const erros = validarEquipamentoForm({ ...base, tipoControle: 'SALDO', quantidade: '0' });
    expect(erros.codigo).toBeUndefined();
  });

  it('aceita SALDO com quantidade válida e sem código', () => {
    expect(validarEquipamentoForm({ ...base, tipoControle: 'SALDO', quantidade: '5' })).toEqual({});
  });

  it('exige quantidade positiva para SALDO', () => {
    expect(validarEquipamentoForm({ ...base, tipoControle: 'SALDO', quantidade: '0' }).quantidade)
      .toBeDefined();
  });

  it('não exige quantidade para SERIALIZADO', () => {
    expect(validarEquipamentoForm({ ...base, quantidade: '0' }).quantidade).toBeUndefined();
  });

  it('exige grupo, modelo, nome e loja', () => {
    const erros = validarEquipamentoForm({
      ...base, grupoId: '', modeloId: '', nome: '  ', lojaId: '',
    });
    expect(Object.keys(erros).sort()).toEqual(['grupoId', 'lojaId', 'modeloId', 'nome']);
  });

  it('exige valor de indenização maior que zero', () => {
    expect(validarEquipamentoForm({ ...base, valorIndenizacao: '' }).valorIndenizacao).toBeDefined();
    expect(validarEquipamentoForm({ ...base, valorIndenizacao: '0,00' }).valorIndenizacao).toBeDefined();
  });

  it('todo erro devolvido tem campo correspondente renderizável no formulário', () => {
    // Guarda contra a causa raiz: um erro em campo que o usuário não consegue
    // editar trava o submit sem dar caminho de saída.
    const erros = validarEquipamentoForm({
      grupoId: '', modeloId: '', nome: '', valorIndenizacao: '',
      lojaId: '', quantidade: '0', tipoControle: 'SALDO',
    });
    const CAMPOS_EDITAVEIS = ['grupoId', 'modeloId', 'nome', 'valorIndenizacao', 'lojaId', 'quantidade'];
    expect(Object.keys(erros).every(k => CAMPOS_EDITAVEIS.includes(k))).toBe(true);
  });
});
