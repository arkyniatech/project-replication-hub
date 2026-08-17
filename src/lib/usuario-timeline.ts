/**
 * Decisão pura sobre se há um usuário real pronto para ser gravado em uma
 * entrada de timeline (histórico de contato/cobrança).
 *
 * RELAY 35: RegistrarContatoModal e EnviarAvisoModal gravavam
 * `{ id: 'user-1', nome: 'Admin' }` fixo. A correção passa o usuário
 * autenticado de verdade — mas se a sessão ou o perfil ainda estiverem
 * carregando, NÃO grava fallback nenhum (nem "Admin" nem qualquer outro nome
 * inventado): a ação deve aguardar ou falhar, nunca mentir sobre quem fez.
 */

export interface EstadoAuthParaTimeline {
  authLoading: boolean;
  profileLoading: boolean;
  userId: string | null;
  nome: string | null;
}

export type ResultadoUsuarioTimeline =
  | { pronto: true; user: { id: string; nome: string } }
  | { pronto: false };

export function resolverUsuarioParaTimeline(
  estado: EstadoAuthParaTimeline
): ResultadoUsuarioTimeline {
  if (estado.authLoading || estado.profileLoading) return { pronto: false };
  if (!estado.userId || !estado.nome) return { pronto: false };
  return { pronto: true, user: { id: estado.userId, nome: estado.nome } };
}
