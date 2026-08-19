/**
 * Erros de Postgrest com `code` são respostas determinísticas do Postgres
 * (sintaxe inválida, restrição violada, single() sem linha) — repetir a
 * mesma query nunca muda o resultado. Só vale retentar o que não tem `code`:
 * falha de rede, timeout, 5xx — onde tentar de novo pode dar certo.
 */
export function isRetryablePostgrestError(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;

  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string') return false;

  return true;
}
