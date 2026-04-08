import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

    // --- JWT Verification ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({
        error: 'Não autorizado - Token de autenticação ausente',
        code: 401,
      }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token.trim() === '') {
      return Response.json({
        error: 'Não autorizado - Token inválido',
        code: 401,
      }, { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(supabaseUrl!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.error('❌ JWT validation failed:', authError?.message);
      return Response.json({
        error: 'Não autorizado - Token JWT inválido',
        code: 401,
        message: authError?.message || 'User not found',
      }, { status: 401, headers: corsHeaders });
    }

    console.log(`✅ JWT verified: ${user.id} (${user.email})`);

    // Verificar role do chamador: master, admin ou rh
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['master', 'admin', 'rh']);

    if (!roles || roles.length === 0) {
      return Response.json({ error: 'Permissão negada' }, { status: 403, headers: corsHeaders });
    }

    // Obter dados do body
    const {
      email,
      password,
      username,
      pessoa_id,
      two_fa_enabled,
      exige_troca_senha,
      loja_padrao_id,
      roles: userRoles,
      lojas_permitidas,
    } = await req.json();

    // Validação básica
    if (!email || !password || !username || !pessoa_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400, headers: corsHeaders });
    }

    // Criar usuário via Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, pessoa_id },
    });

    if (createError) {
      console.error('❌ Erro ao criar usuário:', createError);
      return Response.json({
        error: createError.message,
        code: createError.code || 'CREATE_USER_ERROR',
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

    // Inserir roles (se fornecidas)
    if (userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
      const roleInserts = userRoles.map((role: string) => ({
        user_id: newUserId,
        role,
      }));

      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error('Erro ao inserir roles:', rolesError);
        // Non-fatal: log but continue
      } else {
        console.log(`✅ Roles inseridas: ${userRoles.join(', ')}`);
      }
    }

    // Inserir lojas_permitidas (se fornecidas)
    if (lojas_permitidas && Array.isArray(lojas_permitidas) && lojas_permitidas.length > 0) {
      const lojaInserts = lojas_permitidas.map((loja_id: string) => ({
        user_id: newUserId,
        loja_id,
      }));

      const { error: lojasError } = await supabaseAdmin
        .from('user_lojas_permitidas')
        .insert(lojaInserts);

      if (lojasError) {
        console.error('Erro ao inserir lojas permitidas:', lojasError);
      } else {
        console.log(`✅ Lojas permitidas inseridas: ${lojas_permitidas.length}`);
      }
    }

    console.log(`✅ Usuário criado com sucesso: ${newUserId} (${email})`);

    return Response.json({
      success: true,
      user_id: newUserId,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Erro na Edge Function create-user:', error);
    return Response.json({
      error: error.message || 'Erro interno ao criar usuário',
      code: error.code || 'INTERNAL_ERROR',
    }, { status: 500, headers: corsHeaders });
  }
});
