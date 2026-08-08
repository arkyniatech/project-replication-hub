const ALLOWED_ORIGINS = new Set([
  'https://locahub.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
]);
const FALLBACK_ORIGIN = 'https://locahub.vercel.app';

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : FALLBACK_ORIGIN,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}
// compat: alguns callers antigos importam o objeto estático
export const corsHeaders = {
  'Access-Control-Allow-Origin': FALLBACK_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
