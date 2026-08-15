import { describe, it, expect } from 'vitest';
import {
  isControleSerieDB,
  controleDBParaTela,
  controleTelaParaDB,
} from '@/lib/controle-vocabulario';

/**
 * Regressão: linhas cruas de `contrato_itens` chegam com o vocabulário do BANCO
 * ('SERIE' / 'GRUPO'). Compará-las contra 'SERIALIZADO' (vocabulário de tela)
 * nunca casa, e o item de série perde o vínculo com o equipamento físico.
 */
describe('controle-vocabulario', () => {
  describe('isControleSerieDB', () => {
    it('reconhece o valor do banco SERIE como controle por série', () => {
      expect(isControleSerieDB('SERIE')).toBe(true);
    });

    it('reconhece o valor de tela SERIALIZADO como controle por série', () => {
      expect(isControleSerieDB('SERIALIZADO')).toBe(true);
    });

    it('não trata GRUPO como controle por série', () => {
      expect(isControleSerieDB('GRUPO')).toBe(false);
    });

    it('não trata SALDO como controle por série', () => {
      expect(isControleSerieDB('SALDO')).toBe(false);
    });

    it('trata null/undefined/vazio como não-série', () => {
      expect(isControleSerieDB(null)).toBe(false);
      expect(isControleSerieDB(undefined)).toBe(false);
      expect(isControleSerieDB('')).toBe(false);
    });
  });

  describe('controleDBParaTela', () => {
    it('traduz SERIE para SERIALIZADO', () => {
      expect(controleDBParaTela('SERIE')).toBe('SERIALIZADO');
    });

    it('traduz GRUPO para SALDO', () => {
      expect(controleDBParaTela('GRUPO')).toBe('SALDO');
    });
  });

  describe('controleTelaParaDB', () => {
    it('traduz SERIALIZADO para SERIE', () => {
      expect(controleTelaParaDB('SERIALIZADO')).toBe('SERIE');
    });

    it('traduz SALDO para GRUPO', () => {
      expect(controleTelaParaDB('SALDO')).toBe('GRUPO');
    });

    it('mantém SERIE/GRUPO idempotentes (valor já no vocabulário do banco)', () => {
      expect(controleTelaParaDB('SERIE')).toBe('SERIE');
      expect(controleTelaParaDB('GRUPO')).toBe('GRUPO');
    });
  });
});
