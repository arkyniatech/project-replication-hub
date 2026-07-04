import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Token inválido' }, { status: 401, headers: corsHeaders });
    }

    // Verificar papéis do chamador
    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roles = (callerRoles || []).map((r: any) => r.role);
    const isMaster = roles.includes('master');
    const isAdmin = roles.includes('admin');
    const isRh = roles.includes('rh');
    if (!isMaster && !isAdmin && !isRh) {
      return Response.json({ error: 'Permissão negada' }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const {
      user_id,
      profile_updates,
      roles: newRoles,
      loja_ids,
      grupo_ids,
    } = body as {
      user_id: string;
      profile_updates?: {
        username?: string;
        loja_padrao_id?: string | null;
        two_fa_enabled?: boolean;
        exige_troca_senha?: boolean;
      };
      roles?: string[];
      loja_ids?: string[];
      grupo_ids?: string[];
    };

    if (!user_id) {
      return Response.json({ error: 'user_id é obrigatório' }, { status: 400, headers: corsHeaders });
    }

    // Regras de segurança:
    // - Somente master pode conceder/remover master ou admin.
    // - admin/rh não podem tocar em usuários master/admin.
    if (Array.isArray(newRoles)) {
      const touchesPrivileged = newRoles.some((r) => r === 'master' || r === 'admin');
      if (touchesPrivileged && !isMaster) {
        return Response.json({ error: 'Apenas master pode atribuir os papéis master/admin' }, { status: 403, headers: corsHeaders });
      }
    }

    if (!isMaster) {
      const { data: targetRoles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id);
      const targetIsPrivileged = (targetRoles || []).some((r: any) => r.role === 'master' || r.role === 'admin');
      if (targetIsPrivileged) {
        return Response.json({ error: 'Sem permissão para alterar usuário master/admin' }, { status: 403, headers: corsHeaders });
      }
    }

    // 1) Atualiza profile
    if (profile_updates && Object.keys(profile_updates).length > 0) {
      const { error } = await admin
        .from('user_profiles')
        .update(profile_updates)
        .eq('id', user_id);
      if (error) throw error;
    }

    // 2) Substitui roles (delete + insert)
    if (Array.isArray(newRoles)) {
      const { error: delErr } = await admin.from('user_roles').delete().eq('user_id', user_id);
      if (delErr) throw delErr;
      if (newRoles.length > 0) {
        const rows = newRoles.map((role) => ({ user_id, role }));
        const { error: insErr } = await admin.from('user_roles').insert(rows);
        if (insErr) throw insErr;
      }
    }

    // 3) Substitui grupos (delete + insert) — triggers do banco
    //    sincronizam as lojas concedidas por grupo automaticamente
    if (Array.isArray(grupo_ids)) {
      const { error: delErr } = await admin.from('user_grupos').delete().eq('user_id', user_id);
      if (delErr) throw delErr;
      if (grupo_ids.length > 0) {
        const rows = grupo_ids.map((grupo_id) => ({ user_id, grupo_id }));
        const { error: insErr } = await admin.from('user_grupos').insert(rows);
        if (insErr) throw insErr;
      }
    }

    // 4) Substitui lojas permitidas INDIVIDUAIS (origem_grupo_id IS NULL).
    //    Linhas concedidas por grupo são gerenciadas pelos triggers e
    //    não são tocadas aqui.
    if (Array.isArray(loja_ids)) {
      const { error: delErr } = await admin
        .from('user_lojas_permitidas')
        .delete()
        .eq('user_id', user_id)
        .is('origem_grupo_id', null);
      if (delErr) throw delErr;
      if (loja_ids.length > 0) {
        const rows = loja_ids.map((loja_id) => ({ user_id, loja_id }));
        // upsert: a loja pode já estar concedida via grupo — não é erro
        const { error: insErr } = await admin
          .from('user_lojas_permitidas')
          .upsert(rows, { onConflict: 'user_id,loja_id', ignoreDuplicates: true });
        if (insErr) throw insErr;
      }
    }

    console.log(`✅ Acesso atualizado para ${user_id} por ${user.email}`);
    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ update-user-access erro:', error);
    return Response.json({ error: (error as Error).message || 'Erro interno' }, { status: 500, headers: corsHeaders });
  }
});
