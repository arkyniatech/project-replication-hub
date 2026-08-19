/**
 * RELAY 54 — item 16.2, irmãos do DevolucaoModal.
 *
 * Ao corrigir o modal de Devolução, a varredura pediu para conferir se o mesmo
 * tratamento de data aparecia em outras telas. Aparece, e reproduz o mesmo
 * deslocamento de um dia sobre um campo 'YYYY-MM-DD':
 *
 *   - ConfirmarRetiradaModal: `format(new Date(contrato.dataInicio), ...)`
 *   - EmitirFaturaModal:      `new Date(contrato.dataInicio).toLocaleDateString`
 *
 * Os dois caminhos (date-fns `format` e `toLocaleDateString`) sofrem do mesmo
 * problema: `new Date('2025-07-11')` é meia-noite UTC, e em UTC-3 volta 10/07.
 * No EmitirFaturaModal o estrago é maior porque a data entra na DESCRIÇÃO do
 * item faturado — o texto chega ao cliente.
 *
 * Este teste trava a diferença entre o parse ingênuo e o formatador canônico.
 * Rodar em fuso atrás de UTC; em UTC+0 o sintoma não existe.
 */
import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { formatDateBR } from '@/lib/date-utils';

const emFusoAtrasDeUTC = new Date('2025-07-11T00:00:00Z').getTimezoneOffset() > 0;
const itSeUTCMenos = emFusoAtrasDeUTC ? it : it.skip;

const DATA_INICIO = '2025-07-11';
const DATA_FIM = '2025-08-08';

describe('datas de contrato — formatador canônico vs parse ingênuo (#16.2)', () => {
  it('formatDateBR devolve a data real, sem deslocar', () => {
    expect(formatDateBR(DATA_INICIO)).toBe('11/07/2025');
    expect(formatDateBR(DATA_FIM)).toBe('08/08/2025');
  });

  itSeUTCMenos('new Date(str) + toLocaleDateString desloca um dia (o bug)', () => {
    expect(new Date(DATA_INICIO).toLocaleDateString('pt-BR')).toBe('10/07/2025');
    expect(formatDateBR(DATA_INICIO)).not.toBe(
      new Date(DATA_INICIO).toLocaleDateString('pt-BR'),
    );
  });

  itSeUTCMenos('date-fns format(new Date(str)) desloca igual (mesmo bug)', () => {
    expect(format(new Date(DATA_INICIO), 'dd/MM/yyyy')).toBe('10/07/2025');
    expect(formatDateBR(DATA_INICIO)).not.toBe(format(new Date(DATA_INICIO), 'dd/MM/yyyy'));
  });

  it('formatDateBR aceita as duas pontas do período de forma estável', () => {
    // Trava a regressão: qualquer tela que volte ao parse ingênuo diverge
    // destes valores de referência, iguais aos do PDF e do modal Renovar.
    expect([formatDateBR(DATA_INICIO), formatDateBR(DATA_FIM)]).toEqual([
      '11/07/2025',
      '08/08/2025',
    ]);
  });
});
