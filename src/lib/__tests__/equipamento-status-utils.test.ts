import { describe, it, expect } from 'vitest';
import {
  statusEquipamentoUiToDb,
  statusEquipamentoDbToUi,
  ordenarItensPorCodigo,
} from '../equipamento-status-utils';

describe('statusEquipamentoUiToDb (#27)', () => {
  it('mapeia BAIXADO -> INATIVO (compatível com equipamentos_status_global_check)', () => {
    expect(statusEquipamentoUiToDb('BAIXADO')).toBe('INATIVO');
  });

  it('passa demais valores válidos sem alteração', () => {
    expect(statusEquipamentoUiToDb('DISPONIVEL')).toBe('DISPONIVEL');
    expect(statusEquipamentoUiToDb('MANUTENCAO')).toBe('MANUTENCAO');
    expect(statusEquipamentoUiToDb('RESERVADO')).toBe('RESERVADO');
    expect(statusEquipamentoUiToDb('LOCADO')).toBe('LOCADO');
    expect(statusEquipamentoUiToDb('EM_REVISAO')).toBe('EM_REVISAO');
    expect(statusEquipamentoUiToDb('EM_TRANSPORTE')).toBe('EM_TRANSPORTE');
    expect(statusEquipamentoUiToDb('INATIVO')).toBe('INATIVO');
  });
});

describe('statusEquipamentoDbToUi (#27)', () => {
  it('mapeia INATIVO -> BAIXADO para preservar a UI legada', () => {
    expect(statusEquipamentoDbToUi('INATIVO')).toBe('BAIXADO');
  });

  it('passa demais valores válidos sem alteração', () => {
    expect(statusEquipamentoDbToUi('DISPONIVEL')).toBe('DISPONIVEL');
    expect(statusEquipamentoDbToUi('LOCADO')).toBe('LOCADO');
  });
});

describe('ordenarItensPorCodigo (#12.3)', () => {
  it('ordena numericamente pelo código canônico do equipamento', () => {
    const itens = [
      { equipamento: { codigo: 'CT-10' } },
      { equipamento: { codigo: 'CT-2' } },
      { equipamento: { codigo: 'CT-1' } },
    ];
    const ordenados = ordenarItensPorCodigo(itens);
    expect(ordenados.map((i) => i.equipamento.codigo)).toEqual(['CT-1', 'CT-2', 'CT-10']);
  });

  it('lida com itens sem código sem quebrar', () => {
    const itens = [
      { equipamento: { codigo: 'B-1' } },
      { equipamento: null },
      { equipamento: { codigo: 'A-1' } },
    ];
    const ordenados = ordenarItensPorCodigo(itens);
    expect(ordenados[0].equipamento?.codigo ?? '').toBe('');
    expect(ordenados[1].equipamento?.codigo).toBe('A-1');
    expect(ordenados[2].equipamento?.codigo).toBe('B-1');
  });

  it('não muta a lista original', () => {
    const itens = [
      { equipamento: { codigo: 'Z' } },
      { equipamento: { codigo: 'A' } },
    ];
    const snapshot = itens.map((i) => i.equipamento.codigo);
    ordenarItensPorCodigo(itens);
    expect(itens.map((i) => i.equipamento.codigo)).toEqual(snapshot);
  });
});
