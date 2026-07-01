import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(supabaseUrl!, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Token inválido' }, { status: 401, headers: corsHeaders });
    }

    // Verificar se o chamador é master, admin ou rh
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['master', 'admin', 'rh']);

    if (!roles || roles.length === 0) {
      return Response.json({ error: 'Permissão negada' }, { status: 403, headers: corsHeaders });
    }

    const { user_id, password, exige_troca_senha } = await req.json();

    if (!user_id || !password || typeof password !== 'string' || password.length < 8) {
      return Response.json(
        { error: 'user_id e password (mín. 8 caracteres) são obrigatórios' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password,
    });

    if (updateError) {
      console.error('❌ Erro ao atualizar senha:', updateError);
      return Response.json({ error: updateError.message }, { status: 400, headers: corsHeaders });
    }

    if (typeof exige_troca_senha === 'boolean') {
      await supabaseAdmin
        .from('user_profiles')
        .update({ exige_troca_senha })
        .eq('id', user_id);
    }

    console.log(`✅ Senha atualizada para ${user_id} por ${user.email}`);
    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: (error as Error).message || 'Erro interno' }, { status: 500, headers: corsHeaders });
  }
});
