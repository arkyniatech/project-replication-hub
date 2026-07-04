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

    const callerIsMaster = roles.some((r: { role: string }) => r.role === 'master');

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

    // Guarda de privilégio: somente master pode conceder master/admin
    // (mesma regra da edge function update-user-access)
    if (Array.isArray(userRoles) && userRoles.some((r: string) => r === 'master' || r === 'admin') && !callerIsMaster) {
      return Response.json({
        error: 'Apenas master pode atribuir os papéis master/admin',
        code: 'FORBIDDEN_ROLE_GRANT',
      }, { status: 403, headers: corsHeaders });
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

    // Rollback helper: se qualquer etapa após createUser falhar, remove o
    // usuário auth (e cascatas) para não deixar usuário "meio-criado" que
    // aparece na lista mas não tem roles/lojas.
    const rollback = async (step: string, cause: unknown) => {
      console.error(`❌ Falha na etapa "${step}", executando rollback do usuário ${newUserId}:`, cause);
      await supabaseAdmin.from('user_lojas_permitidas').delete().eq('user_id', newUserId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId);
      await supabaseAdmin.from('user_profiles').delete().eq('id', newUserId);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (deleteError) {
        console.error('⚠️ Rollback parcial - falha ao deletar auth user:', deleteError);
      }
    };

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
      await rollback('user_profiles', profileError);
      return Response.json({
        error: `Erro ao criar perfil do usuário: ${profileError.message}`,
        code: 'PROFILE_INSERT_ERROR',
      }, { status: 400, headers: corsHeaders });
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
        await rollback('user_roles', rolesError);
        return Response.json({
          error: `Erro ao atribuir perfis ao usuário: ${rolesError.message}`,
          code: 'ROLES_INSERT_ERROR',
        }, { status: 400, headers: corsHeaders });
      }
      console.log(`✅ Roles inseridas: ${userRoles.join(', ')}`);
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
        await rollback('user_lojas_permitidas', lojasError);
        return Response.json({
          error: `Erro ao vincular lojas permitidas: ${lojasError.message}`,
          code: 'LOJAS_INSERT_ERROR',
        }, { status: 400, headers: corsHeaders });
      }
      console.log(`✅ Lojas permitidas inseridas: ${lojas_permitidas.length}`);
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
