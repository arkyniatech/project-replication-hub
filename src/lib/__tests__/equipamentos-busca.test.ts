// RELAY 41 / item 9.5 — a busca do modal Nova Transferência não achava
// equipamento legado (BE-059) nem pelo código exato, enquanto a lista de
// Equipamentos achava o mesmo item. Causa: duas implementações da mesma busca.
// A lista casava 5 campos (EquipamentosLista.tsx:141-150); o modal casava 2
// (NovaTransferenciaModal.tsx:63-70), e nenhum deles era o código EXIBIDO —
// "BE-059" é derivado por formatCodigoExibicao, não existe em coluna nenhuma.
//
// Estes testes fixam o predicado ÚNICO que as duas telas passam a consumir.
import { describe, it, expect } from 'vitest';
import { equipamentoMatchesBusca } from '../equipamentos-utils';

// Legado: código interno antigo sem relação com o que a tela mostra.
// Grupo "Betoneira" + série "059" => exibido como "BE-059".
const legado = {
  codigo_interno: 'LA004010007',
  numero_serie: '059',
  grupo_nome: 'Betoneira',
  modelo_nome: 'Betoneira 400L',
};

// Criado pela QA: o mock client-side gravava o código em codigo_interno,
// então digitar o valor cru funcionava — o único caminho que o modal cobria.
const criadoPelaQA = {
  codigo_interno: 'LA252028090',
  numero_serie: '',
  grupo_nome: 'Container',
  modelo_nome: 'Container 20 pés',
};

describe('equipamentoMatchesBusca', () => {
  it('acha pelo código EXIBIDO (o bug do 9.5: BE-059 não existe em coluna)', () => {
    expect(equipamentoMatchesBusca(legado, 'BE-059')).toBe(true);
  });

  it('acha pelo código exibido em minúsculas', () => {
    expect(equipamentoMatchesBusca(legado, 'be-059')).toBe(true);
  });

  it('acha por fragmento do código exibido', () => {
    expect(equipamentoMatchesBusca(legado, 'BE-0')).toBe(true);
  });

  it('acha pelo codigo_interno cru (caminho que já funcionava)', () => {
    expect(equipamentoMatchesBusca(criadoPelaQA, 'LA252028090')).toBe(true);
  });

  it('acha pelo número de série', () => {
    expect(equipamentoMatchesBusca(legado, '059')).toBe(true);
  });

  it('acha pelo nome do modelo (o placeholder promete isso)', () => {
    expect(equipamentoMatchesBusca(legado, 'Betoneira 400')).toBe(true);
  });

  it('acha pelo nome do grupo (o placeholder promete isso)', () => {
    expect(equipamentoMatchesBusca(criadoPelaQA, 'Container')).toBe(true);
  });

  it('busca vazia casa com tudo (não filtra)', () => {
    expect(equipamentoMatchesBusca(legado, '')).toBe(true);
    expect(equipamentoMatchesBusca(legado, '   ')).toBe(true);
  });

  it('não casa termo ausente', () => {
    expect(equipamentoMatchesBusca(legado, 'ZZ-999')).toBe(false);
  });

  it('ignora espaços nas pontas do termo', () => {
    expect(equipamentoMatchesBusca(legado, '  BE-059  ')).toBe(true);
  });

  it('tolera campos nulos sem quebrar', () => {
    const vazio = {
      codigo_interno: null,
      numero_serie: null,
      grupo_nome: null,
      modelo_nome: null,
    };
    expect(equipamentoMatchesBusca(vazio, 'qualquer')).toBe(false);
    expect(equipamentoMatchesBusca(vazio, '')).toBe(true);
  });

  it('aceita grupo aninhado (formato do hook: grupos_equipamentos.nome)', () => {
    const aninhado = {
      codigo_interno: 'LA004010009',
      numero_serie: '076',
      grupos_equipamentos: { nome: 'Container' },
      modelos_equipamentos: { nome_comercial: 'Container 40 pés' },
    };
    expect(equipamentoMatchesBusca(aninhado, 'CO-076')).toBe(true);
    expect(equipamentoMatchesBusca(aninhado, 'Container 40')).toBe(true);
  });
});
