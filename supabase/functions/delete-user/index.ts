import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Criar cliente admin (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validar que o usuário logado é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers: corsHeaders });
    }

    // Verificar se usuário é admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      return Response.json({ error: 'Apenas administradores podem deletar usuários' }, { status: 403, headers: corsHeaders });
    }

    // Obter ID do usuário a ser deletado
    const { user_id, email } = await req.json();

    if (!user_id && !email) {
      return Response.json({ error: 'user_id ou email é obrigatório' }, { status: 400, headers: corsHeaders });
    }

    let targetUserId = user_id;

    // Se foi passado email, buscar o usuário
    if (email && !user_id) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = users.users.find(u => u.email === email);
      
      if (!targetUser) {
        return Response.json({ error: 'Usuário não encontrado' }, { status: 404, headers: corsHeaders });
      }
      
      targetUserId = targetUser.id;
    }

    // Impedir que o admin delete a si mesmo
    if (targetUserId === user.id) {
      return Response.json({ error: 'Você não pode deletar seu próprio usuário' }, { status: 400, headers: corsHeaders });
    }

    // Deletar usuário do auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) {
      console.error('Erro ao deletar usuário do auth:', deleteAuthError);
      throw deleteAuthError;
    }

    // As tabelas relacionadas (user_profiles, user_roles, user_lojas_permitidas) 
    // serão deletadas automaticamente por CASCADE na foreign key

    console.log(`✅ Usuário deletado com sucesso: ${targetUserId} (${email || 'email não fornecido'})`);

    return Response.json({ 
      success: true,
      message: 'Usuário deletado com sucesso'
    }, { 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Erro na Edge Function delete-user:', error);
    return Response.json({ 
      error: error.message || 'Erro interno ao deletar usuário'
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
