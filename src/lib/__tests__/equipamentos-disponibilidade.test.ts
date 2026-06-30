import { describe, it, expect } from 'vitest';
import {
  getEquipamentosOcupadosIds,
  getQuantidadeGrupoOcupada,
  isEquipamentoDisponivel,
  type ContratoLike,
  type EquipamentoLike,
} from '@/lib/equipamentos-disponibilidade';

const equip = (over: Partial<EquipamentoLike> = {}): EquipamentoLike => ({
  id: 'eq-1',
  tipo: 'SERIALIZADO',
  status_global: 'DISPONIVEL',
  ...over,
});

const contrato = (over: Partial<ContratoLike> = {}): ContratoLike => ({
  status: 'ATIVO',
  ativo: true,
  contrato_itens: [],
  ...over,
});

describe('equipamentos-disponibilidade', () => {
  describe('getEquipamentosOcupadosIds', () => {
    it('marca como ocupado item serializado em contrato ATIVO', () => {
      const set = getEquipamentosOcupadosIds([
        contrato({ contrato_itens: [{ equipamento_id: 'eq-1' }] }),
      ]);
      expect(set.has('eq-1')).toBe(true);
    });

    it('marca como ocupado item em contrato AGUARDANDO_ENTREGA', () => {
      const set = getEquipamentosOcupadosIds([
        contrato({ status: 'AGUARDANDO_ENTREGA', contrato_itens: [{ equipamento_id: 'eq-2' }] }),
      ]);
      expect(set.has('eq-2')).toBe(true);
    });

    it('NÃO marca como ocupado item em contrato FINALIZADO/CANCELADO', () => {
      const set = getEquipamentosOcupadosIds([
        contrato({ status: 'FINALIZADO', contrato_itens: [{ equipamento_id: 'eq-3' }] }),
        contrato({ status: 'CANCELADO', contrato_itens: [{ equipamento_id: 'eq-4' }] }),
      ]);
      expect(set.has('eq-3')).toBe(false);
      expect(set.has('eq-4')).toBe(false);
    });

    it('ignora contratos com ativo=false (soft-delete)', () => {
      const set = getEquipamentosOcupadosIds([
        contrato({ ativo: false, contrato_itens: [{ equipamento_id: 'eq-5' }] }),
      ]);
      expect(set.has('eq-5')).toBe(false);
    });

    it('ignora itens sem equipamento_id (GRUPO sem patrimônio)', () => {
      const set = getEquipamentosOcupadosIds([
        contrato({ contrato_itens: [{ equipamento_id: null }, { equipamento_id: undefined }] }),
      ]);
      expect(set.size).toBe(0);
    });
  });

  describe('getQuantidadeGrupoOcupada', () => {
    it('soma quantidade do mesmo grupo em vários contratos ativos', () => {
      const qtd = getQuantidadeGrupoOcupada('grp-1', [
        contrato({ contrato_itens: [{ equipamento_id: 'grp-1', quantidade: 2 }] }),
        contrato({
          status: 'AGUARDANDO_ENTREGA',
          contrato_itens: [{ equipamento_id: 'grp-1', quantidade: 3 }],
        }),
        contrato({ status: 'FINALIZADO', contrato_itens: [{ equipamento_id: 'grp-1', quantidade: 99 }] }),
      ]);
      expect(qtd).toBe(5);
    });

    it('retorna 0 quando não há ocorrências', () => {
      expect(getQuantidadeGrupoOcupada('grp-x', [])).toBe(0);
    });
  });

  describe('isEquipamentoDisponivel', () => {
    it('DISPONIVEL + não ocupado => true', () => {
      expect(isEquipamentoDisponivel(equip(), new Set())).toBe(true);
    });

    it('DISPONIVEL mas em contrato ATIVO (status_global desatualizado) => false', () => {
      // Reproduz exatamente o bug #13: status_global=DISPONIVEL mas em contrato ATIVO.
      expect(isEquipamentoDisponivel(equip(), new Set(['eq-1']))).toBe(false);
    });

    it('LOCADO sempre indisponível mesmo se cross-ref estiver vazia', () => {
      expect(isEquipamentoDisponivel(equip({ status_global: 'LOCADO' }), new Set())).toBe(false);
    });

    it('MANUTENCAO/EM_REVISAO indisponível', () => {
      expect(isEquipamentoDisponivel(equip({ status_global: 'MANUTENCAO' }), new Set())).toBe(false);
      expect(isEquipamentoDisponivel(equip({ status_global: 'EM_REVISAO' }), new Set())).toBe(false);
    });
  });
});
