// Guard compartilhado: o usuário demo é somente-leitura em TODO o sistema.
// As policies RESTRITIVAS do banco bloqueiam PostgREST; este guard cobre as
// edge functions, que rodam com service_role (fora da RLS).
export const DEMO_EMAIL = 'teste@teste.com';

export function isDemoEmail(email?: string | null): boolean {
  return (email ?? '').toLowerCase() === DEMO_EMAIL;
}

export function demoForbiddenResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Modo demonstração: somente leitura' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
