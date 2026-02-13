import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- DIAGNOSTICS DE AMBIENTE ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('--- ENVIRONMENT DIAGNOSTICS ---');
    console.log(`URL missing: ${!supabaseUrl}`);
    console.log(`Service Role Key missing: ${!serviceRoleKey}`);
    if (serviceRoleKey) {
      console.log(`Service Role Key prefix: ${serviceRoleKey.substring(0, 10)}...`);
    }

    // Criar cliente admin (service role) para operações privilegiadas
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

    // --- JWT DIAGNOSTICS & VERIFICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Authorization header missing');
      return Response.json({
        error: 'Não autorizado - Token de autenticação ausente',
        code: 401,
        message: 'Authorization header is missing'
      }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('--- TOKEN DIAGNOSTICS ---');
    console.log(`Token length: ${token.length}`);
    console.log(`Token prefix: ${token.substring(0, 20)}...`);

    if (!token || token.trim() === '') {
      console.error('❌ Token is empty');
      return Response.json({
        error: 'Não autorizado - Token inválido',
        code: 401,
        message: 'Token is empty or malformed'
      }, { status: 401, headers: corsHeaders });
    }

    // Usar o token do usuário para criar um cliente "Identity"
    // Isso é mais robusto que auth.getUser() com service role em alguns ambientes
    const supabaseUser = createClient(supabaseUrl!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log('🔍 Validating JWT token identity...');
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError) {
      console.error('❌ JWT validation failed:', authError.message);
      console.error('Auth error full details:', JSON.stringify(authError, null, 2));
      return Response.json({
        error: 'Não autorizado - Token JWT inválido',
        code: 401,
        message: `Invalid JWT: ${authError.message}`,
        details: authError
      }, { status: 401, headers: corsHeaders });
    }

    if (!user) {
      console.error('❌ No user found for the provided token');
      return Response.json({
        error: 'Não autorizado - Usuário não encontrado',
        code: 401,
        message: 'User identity could not be verified'
      }, { status: 401, headers: corsHeaders });
    }

    console.log(`✅ JWT identity verified for user: ${user.id} (${user.email})`);

    // Verificar role do usuário (admin ou rh)
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'rh']);

    if (!roles || roles.length === 0) {
      return Response.json({ error: 'Permissão negada' }, { status: 403, headers: corsHeaders });
    }

    // Obter dados do body
    const { email, password, username, pessoa_id, two_fa_enabled, exige_troca_senha, loja_padrao_id } = await req.json();

    // Validação básica
    if (!email || !password || !username || !pessoa_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400, headers: corsHeaders });
    }

    // Criar usuário usando API Admin (NÃO faz login automático!)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ✅ Confirma e-mail automaticamente
      user_metadata: {
        username,
        pessoa_id,
      },
    });

    if (createError) {
      console.error('❌ Erro ao criar usuário:', createError);
      console.error('Create error details:', JSON.stringify(createError, null, 2));
      return Response.json({
        error: createError.message,
        code: createError.code || 'CREATE_USER_ERROR',
        details: createError
      }, { status: 400, headers: corsHeaders });
    }

    const newUserId = userData.user.id;

    // Criar user_profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: newUserId,
        username,
        pessoa_id,
        two_fa_enabled: two_fa_enabled || false,
        exige_troca_senha: exige_troca_senha || false,
        loja_padrao_id: loja_padrao_id || null,
        ativo: true,
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      throw profileError;
    }

    console.log(`✅ Usuário criado com sucesso: ${newUserId} (${email})`);

    return Response.json({
      success: true,
      user_id: newUserId
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Erro na Edge Function create-user:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return Response.json({
      error: error.message || 'Erro interno ao criar usuário',
      code: error.code || 'INTERNAL_ERROR',
      stack: error.stack
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
});
