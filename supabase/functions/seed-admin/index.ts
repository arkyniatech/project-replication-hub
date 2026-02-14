import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_EMAIL = 'admin@locacaoerp.com';
const ADMIN_PASSWORD = 'Admin123!@#';
const ADMIN_USERNAME = 'admin';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🌱 Iniciando seed do usuário admin...');

    // Criar cliente admin (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Verificar se já existe um usuário admin
    console.log('🔍 Verificando se admin já existe...');
    const { data: existingAdmins, error: adminCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);

    if (adminCheckError) {
      console.error('Erro ao verificar admins existentes:', adminCheckError);
      return Response.json({ error: 'Erro ao verificar admins existentes' }, { status: 500, headers: corsHeaders });
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('⚠️ Usuário admin já existe. Operação cancelada.');
      return Response.json({
        success: false,
        message: 'Usuário admin já existe no sistema'
      }, { headers: corsHeaders });
    }

    // 2. Verificar se usuário com email já existe
    const { data: existingUser, error: userCheckError } = await supabaseAdmin.auth.admin.listUsers();

    if (userCheckError) {
      console.error('Erro ao listar usuários:', userCheckError);
      return Response.json({ error: 'Erro ao verificar usuários existentes' }, { status: 500, headers: corsHeaders });
    }

    const userExists = existingUser.users.some(user => user.email === ADMIN_EMAIL);

    if (userExists) {
      console.log('⚠️ Usuário com email admin já existe. Operação cancelada.');
      return Response.json({
        success: false,
        message: 'Usuário com email admin já existe no sistema'
      }, { headers: corsHeaders });
    }

    // 3. Criar usuário admin usando API Admin
    console.log('👤 Criando usuário admin...');
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: ADMIN_USERNAME,
      },
    });

    if (createError) {
      console.error('Erro ao criar usuário admin:', createError);
      return Response.json({ error: createError.message }, { status: 400, headers: corsHeaders });
    }

    const newUserId = userData.user.id;
    console.log(`✅ Usuário criado com ID: ${newUserId}`);

    // 4. Criar pessoa para o admin
    console.log('👤 Criando pessoa do administrador...');
    const { data: pessoaData, error: pessoaError } = await supabaseAdmin
      .from('pessoas')
      .insert({
        nome: 'Administrador do Sistema',
        cpf: '00000000000', // CPF fictício
        email: ADMIN_EMAIL,
        situacao: 'ativo' as const,
      })
      .select()
      .single();

    if (pessoaError) {
      console.error('Erro ao criar pessoa:', pessoaError);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return Response.json({ error: 'Erro ao criar pessoa do administrador' }, { status: 500, headers: corsHeaders });
    }

    const pessoaId = pessoaData.id;
    console.log(`✅ Pessoa criada com ID: ${pessoaId}`);

    // 5. Criar user_profile
    console.log('📝 Criando perfil do usuário...');
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: newUserId,
        username: ADMIN_USERNAME,
        pessoa_id: pessoaId,
        two_fa_enabled: false,
        exige_troca_senha: false,
        loja_padrao_id: null,
        ativo: true,
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Tentar remover usuário criado se perfil falhar
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return Response.json({ error: 'Erro ao criar perfil do usuário' }, { status: 500, headers: corsHeaders });
    }

    // 6. Atribuir role 'admin'
    console.log('🔑 Atribuindo role admin...');
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'admin',
      });

    if (roleError) {
      console.error('Erro ao atribuir role:', roleError);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return Response.json({ error: 'Erro ao atribuir role admin' }, { status: 500, headers: corsHeaders });
    }

    // 7. Dar acesso a todas as lojas
    console.log('🏪 Atribuindo acesso a todas as lojas...');
    const { data: allLojas, error: lojasError } = await supabaseAdmin
      .from('lojas')
      .select('id');

    if (lojasError) {
      console.error('Erro ao buscar lojas:', lojasError);
      // Não é erro crítico, continua
    } else if (allLojas && allLojas.length > 0) {
      const lojasPermitidas = allLojas.map(loja => ({
        user_id: newUserId,
        loja_id: loja.id,
      }));

      const { error: permissoesError } = await supabaseAdmin
        .from('user_lojas_permitidas')
        .insert(lojasPermitidas);

      if (permissoesError) {
        console.error('Erro ao atribuir permissões de lojas:', permissoesError);
        // Não é erro crítico, continua
      } else {
        console.log(`✅ Acesso concedido a ${allLojas.length} loja(s)`);
      }
    }

    console.log('🎉 Seed do usuário admin concluído com sucesso!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔒 Senha: ${ADMIN_PASSWORD}`);

    return Response.json({
      success: true,
      message: 'Usuário admin criado com sucesso',
      user_id: newUserId,
      email: ADMIN_EMAIL,
      role: 'admin'
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Erro na Edge Function seed-admin:', error);
    return Response.json({
      error: error.message || 'Erro interno ao executar seed'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
});