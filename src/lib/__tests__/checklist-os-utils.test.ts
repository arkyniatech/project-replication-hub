import { describe, it, expect } from 'vitest';
import {
  templateParaItensExec,
  selecionarTemplate,
  motivoBloqueioLiberacao,
  type ChecklistTemplateRow,
} from '../checklist-os-utils';

const generico: ChecklistTemplateRow = {
  id: 'tpl-generico',
  modelo_id: null,
  tipo: 'CORRETIVA',
  ativo: true,
  itens: [
    { id: 'i1', titulo: 'Verificar nível de óleo', critico: true },
    { id: 'i2', titulo: 'Limpar filtros', critico: false },
  ],
};

const especifico: ChecklistTemplateRow = {
  id: 'tpl-modelo',
  modelo_id: 'modelo-betoneira',
  tipo: 'CORRETIVA',
  ativo: true,
  itens: [{ id: 'x1', titulo: 'Testar tambor', critico: true }],
};

describe('templateParaItensExec (Relay 75)', () => {
  it('mapeia id -> idItem preservando titulo e critico', () => {
    const itens = templateParaItensExec(generico.itens);

    expect(itens).toEqual([
      { idItem: 'i1', titulo: 'Verificar nível de óleo', critico: true, ok: false },
      { idItem: 'i2', titulo: 'Limpar filtros', critico: false, ok: false },
    ]);
  });

  it('não deixa vazar a chave `id` do template para a execução', () => {
    const [primeiro] = templateParaItensExec(generico.itens);
    expect(primeiro).not.toHaveProperty('id');
    expect(primeiro.idItem).toBe('i1');
  });

  it('nasce com todos os itens desmarcados — marcar é ato do mecânico', () => {
    expect(templateParaItensExec(generico.itens).every((i) => i.ok === false)).toBe(true);
  });

  it('tolera itens ausentes ou jsonb malformado sem quebrar a tela', () => {
    expect(templateParaItensExec(null)).toEqual([]);
    expect(templateParaItensExec(undefined)).toEqual([]);
    expect(templateParaItensExec({} as any)).toEqual([]);
  });

  it('normaliza critico ausente para false, e não para undefined', () => {
    const itens = templateParaItensExec([{ id: 'z', titulo: 'Sem flag' } as any]);
    expect(itens[0].critico).toBe(false);
  });
});

describe('selecionarTemplate (Relay 75)', () => {
  it('sem template aplicável retorna null — a tela precisa avisar', () => {
    expect(selecionarTemplate([], 'CORRETIVA', 'modelo-betoneira')).toBeNull();
    expect(selecionarTemplate(null, 'CORRETIVA', null)).toBeNull();
  });

  it('usa o genérico quando não há específico para o modelo', () => {
    const escolhido = selecionarTemplate([generico], 'CORRETIVA', 'modelo-betoneira');
    expect(escolhido?.id).toBe('tpl-generico');
  });

  it('específico do modelo ganha do genérico', () => {
    const escolhido = selecionarTemplate([generico, especifico], 'CORRETIVA', 'modelo-betoneira');
    expect(escolhido?.id).toBe('tpl-modelo');
  });

  it('cai no genérico quando o específico é de outro modelo', () => {
    const escolhido = selecionarTemplate([generico, especifico], 'CORRETIVA', 'modelo-outro');
    expect(escolhido?.id).toBe('tpl-generico');
  });

  it('não cruza os tipos: PREVENTIVA não usa template CORRETIVA', () => {
    expect(selecionarTemplate([generico, especifico], 'PREVENTIVA', 'modelo-betoneira')).toBeNull();
  });

  it('ignora template inativo', () => {
    const inativo = { ...generico, ativo: false };
    expect(selecionarTemplate([inativo], 'CORRETIVA', null)).toBeNull();
  });

  it('OS sem modelo ainda encontra o genérico', () => {
    expect(selecionarTemplate([generico, especifico], 'CORRETIVA', null)?.id).toBe('tpl-generico');
  });
});

describe('motivoBloqueioLiberacao (Relay 75 — espelha liberarParaVerde)', () => {
  const completo = {
    itens: [
      { idItem: 'i1', titulo: 'Crítico', critico: true, ok: true },
      { idItem: 'i2', titulo: 'Comum', critico: false, ok: false },
    ],
    testeMinOk: true,
    resultado: 'APTO' as const,
  };

  it('sem checklist bloqueia', () => {
    expect(motivoBloqueioLiberacao(null)).toBe('SEM_CHECKLIST');
    expect(motivoBloqueioLiberacao({ itens: [] })).toBe('SEM_CHECKLIST');
  });

  it('item crítico não marcado impede liberar', () => {
    const comCriticoPendente = {
      ...completo,
      itens: [{ idItem: 'i1', titulo: 'Crítico', critico: true, ok: false }],
    };
    expect(motivoBloqueioLiberacao(comCriticoPendente)).toBe('CRITICO_PENDENTE');
  });

  it('item NÃO crítico desmarcado não impede liberar', () => {
    expect(motivoBloqueioLiberacao(completo)).toBeNull();
  });

  it('teste mínimo pendente impede liberar', () => {
    expect(motivoBloqueioLiberacao({ ...completo, testeMinOk: false })).toBe('TESTE_PENDENTE');
  });

  it('resultado NAO_APTO impede liberar mesmo com tudo marcado', () => {
    expect(motivoBloqueioLiberacao({ ...completo, resultado: 'NAO_APTO' })).toBe('NAO_APTO');
  });

  it('todos os críticos marcados + teste OK + APTO libera', () => {
    expect(motivoBloqueioLiberacao(completo)).toBeNull();
  });

  it('crítico com ok undefined conta como pendente, não como aprovado', () => {
    const semFlag = {
      ...completo,
      itens: [{ idItem: 'i1', titulo: 'Crítico', critico: true }],
    };
    expect(motivoBloqueioLiberacao(semFlag as any)).toBe('CRITICO_PENDENTE');
  });
});
