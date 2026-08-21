/**
 * Relay 68 — o que o check-in do motorista grava.
 *
 * Antes deste relay o check-in não gravava nada: `syncCheckin` era um
 * `setTimeout(1000)` que marcava `synced: true` no estado do React e mostrava
 * "Check-in enviado ao servidor". Nada saía do navegador, e recarregar a
 * página apagava tudo.
 *
 * Aqui está só a montagem do payload — matemática pura sobre entrada e saída,
 * sem React e sem Supabase — porque é ela que decide em QUAIS colunas o dado
 * cai. Errar a coluna é o modo de falha caro: uma ENTREGA marcada CONCLUIDO
 * dispara `ativarContratoPosEntrega` e muda contrato de verdade.
 */
import { describe, it, expect } from 'vitest';
import { montarUpdateCheckin } from '../logistica-checkin';

const POSICAO = { lat: -22.4761, lon: -46.6329 };
const AGORA = '2026-08-21T14:30:00.000Z';

describe('montarUpdateCheckin — sucesso', () => {
  it('grava check_in_ts, latitude, longitude e status CONCLUIDO', () => {
    const updates = montarUpdateCheckin({
      sucesso: true,
      posicao: POSICAO,
      agoraISO: AGORA,
    });

    expect(updates).toEqual({
      status: 'CONCLUIDO',
      check_in_ts: AGORA,
      check_in_latitude: -22.4761,
      check_in_longitude: -46.6329,
      concluido_ts: AGORA,
    });
  });

  it('não inclui motivo_falha quando o check-in deu certo', () => {
    const updates = montarUpdateCheckin({
      sucesso: true,
      posicao: POSICAO,
      agoraISO: AGORA,
    });

    // Campo fantasma no payload de sucesso reescreveria o motivo de uma
    // tentativa anterior que falhou — o histórico da tarefa se perderia.
    expect(updates).not.toHaveProperty('motivo_falha');
    expect(updates).not.toHaveProperty('motivo_falha_tipo');
  });
});

describe('montarUpdateCheckin — falha', () => {
  it('grava motivo_falha e motivo_falha_tipo, como o Quadro do desktop já faz', () => {
    const updates = montarUpdateCheckin({
      sucesso: false,
      posicao: POSICAO,
      agoraISO: AGORA,
      motivo: 'Cliente ausente',
    });

    expect(updates).toEqual({
      status: 'CANCELADO',
      check_in_ts: AGORA,
      check_in_latitude: -22.4761,
      check_in_longitude: -46.6329,
      motivo_falha: 'Cliente ausente',
      motivo_falha_tipo: 'NAO_ENTREGA',
    });
  });

  it('falha NUNCA marca CONCLUIDO — status CONCLUIDO em ENTREGA ativa contrato', () => {
    const updates = montarUpdateCheckin({
      sucesso: false,
      posicao: POSICAO,
      agoraISO: AGORA,
      motivo: 'Local não encontrado',
    });

    expect(updates.status).not.toBe('CONCLUIDO');
    expect(updates).not.toHaveProperty('concluido_ts');
  });

  it('sem motivo informado, grava um rótulo em vez de deixar a coluna nula', () => {
    const updates = montarUpdateCheckin({
      sucesso: false,
      posicao: POSICAO,
      agoraISO: AGORA,
    });

    // Motivo vazio no banco vira "cancelado sem explicação" no relatório.
    expect(updates.motivo_falha).toBeTruthy();
  });
});

describe('montarUpdateCheckin — coordenadas', () => {
  it('coordenada zero é gravada, não confundida com ausência', () => {
    const updates = montarUpdateCheckin({
      sucesso: true,
      posicao: { lat: 0, lon: 0 },
      agoraISO: AGORA,
    });

    expect(updates.check_in_latitude).toBe(0);
    expect(updates.check_in_longitude).toBe(0);
  });
});
