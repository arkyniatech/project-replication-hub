/**
 * Payload do check-in do motorista.
 *
 * Relay 67/68: as colunas de check-in JÁ EXISTEM em `logistica_tarefas`
 * (check_in_ts, check_in_latitude, check_in_longitude, concluido_ts,
 * motivo_falha, motivo_falha_tipo). Não é tabela própria e não precisou de
 * migration — o que faltava era a tela chamar o banco. Até o relay 67,
 * `syncCheckin` era um `setTimeout(1000)` que marcava `synced: true` no estado
 * do React e dizia "Check-in enviado ao servidor" sem enviar nada.
 *
 * A montagem do payload vive aqui, fora do componente, porque é ela que decide
 * em quais colunas o dado cai — e errar isso é caro: `updateTarefa` dispara
 * `ativarContratoPosEntrega` quando uma ENTREGA vira CONCLUIDO
 * (useSupabaseLogisticaTarefas.ts:92), mudando o contrato de
 * AGUARDANDO_ENTREGA para ATIVO. Um "sucesso" gravado por engano numa tarefa
 * que falhou ativa contrato de equipamento que nunca chegou ao cliente.
 */

/** Espelha os MOTIVOS_NAO_ENTREGA do QuadroLogistica do desktop. */
export const MOTIVO_FALHA_PADRAO = 'Não informado pelo motorista';

/**
 * Tipo de falha gravado em `motivo_falha_tipo`. O Quadro do desktop separa
 * NAO_SAIDA (não saiu da loja) de NAO_ENTREGA (saiu e não conseguiu executar).
 * O check-in do motorista é sempre em campo, então é sempre NAO_ENTREGA.
 */
export const MOTIVO_FALHA_TIPO_CAMPO = 'NAO_ENTREGA';

export interface PosicaoCheckin {
  lat: number;
  lon: number;
}

export interface EntradaCheckin {
  sucesso: boolean;
  posicao: PosicaoCheckin;
  agoraISO: string;
  motivo?: string;
}

export interface UpdateCheckin {
  status: 'CONCLUIDO' | 'CANCELADO';
  check_in_ts: string;
  check_in_latitude: number;
  check_in_longitude: number;
  concluido_ts?: string;
  motivo_falha?: string;
  motivo_falha_tipo?: string;
}

/**
 * Monta o `updates` do UPDATE em logistica_tarefas.
 *
 * Sucesso e falha produzem payloads DISJUNTOS de propósito: o de sucesso não
 * carrega motivo_falha (senão apagaria o motivo de uma tentativa anterior) e o
 * de falha não carrega concluido_ts nem status CONCLUIDO (senão ativaria o
 * contrato). É a mesma disciplina de "sem campo fantasma" do relay 61.
 */
export function montarUpdateCheckin(entrada: EntradaCheckin): UpdateCheckin {
  const base = {
    check_in_ts: entrada.agoraISO,
    check_in_latitude: entrada.posicao.lat,
    check_in_longitude: entrada.posicao.lon,
  };

  if (entrada.sucesso) {
    return {
      ...base,
      status: 'CONCLUIDO',
      concluido_ts: entrada.agoraISO,
    };
  }

  return {
    ...base,
    status: 'CANCELADO',
    // Motivo vazio no banco vira "cancelado sem explicação" no relatório de
    // produtividade — pior que um rótulo genérico e honesto.
    motivo_falha: entrada.motivo?.trim() || MOTIVO_FALHA_PADRAO,
    motivo_falha_tipo: MOTIVO_FALHA_TIPO_CAMPO,
  };
}
