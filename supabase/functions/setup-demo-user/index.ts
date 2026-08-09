import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

const DEMO_EMAIL = 'teste@teste.com';
const DEMO_PASSWORD = 'teste123';
const DEMO_USERNAME = 'teste';
const DEMO_CPF = '00000000000';

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Check if auth user already exists
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email === DEMO_EMAIL);

    if (existing) {
      userId = existing.id;
      // Reset password to known value (idempotent)
      await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { username: DEMO_USERNAME, demo: true },
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    if (!userId) throw new Error('No user id');

    // 2. Ensure pessoa exists
    let pessoaId: string | null = null;
    const { data: pessoaExist } = await admin
      .from('pessoas')
      .select('id')
      .eq('cpf', DEMO_CPF)
      .maybeSingle();

    if (pessoaExist) {
      pessoaId = pessoaExist.id;
    } else {
      const { data: novaPessoa, error: pErr } = await admin
        .from('pessoas')
        .insert({
          nome: 'Usuário Demonstração',
          cpf: DEMO_CPF,
          email: DEMO_EMAIL,
          cargo: 'Demo / Portfólio',
          situacao: 'ativo',
        })
        .select('id')
        .single();
      if (pErr) throw pErr;
      pessoaId = novaPessoa.id;
    }

    // 3. Ensure user_profile
    const { data: profExist } = await admin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profExist) {
      // a pessoa demo pode estar presa a um perfil de um auth-user antigo
      // (uid trocou em reconstruções do auth); se o dono não existe mais,
      // remove o perfil órfão para liberar o unique de pessoa_id
      const { data: perfilDono } = await admin
        .from('user_profiles')
        .select('id')
        .eq('pessoa_id', pessoaId)
        .maybeSingle();
      if (perfilDono && perfilDono.id !== userId) {
        const { data: donoAuth } = await admin.auth.admin.getUserById(perfilDono.id).catch(() => ({ data: null }));
        if (donoAuth?.user) {
          // a pessoa de CPF zeros pertence a um usuário real (histórico: o
          // perfil do admin aponta p/ ela). O demo ganha uma pessoa PRÓPRIA.
          const DEMO_CPF_ALT = '00000000002';
          const { data: pAlt } = await admin
            .from('pessoas')
            .select('id')
            .eq('cpf', DEMO_CPF_ALT)
            .maybeSingle();
          if (pAlt) {
            pessoaId = pAlt.id;
          } else {
            const { data: novaAlt, error: altErr } = await admin
              .from('pessoas')
              .insert({
                nome: 'Usuário Demonstração',
                cpf: DEMO_CPF_ALT,
                email: DEMO_EMAIL,
                cargo: 'Demo / Portfólio',
                situacao: 'ativo',
              })
              .select('id')
              .single();
            if (altErr) throw new Error(`pessoa demo alternativa: ${altErr.message}`);
            pessoaId = novaAlt.id;
          }
        } else {
          await admin.from('user_roles').delete().eq('user_id', perfilDono.id);
          await admin.from('user_lojas_permitidas').delete().eq('user_id', perfilDono.id);
          const { error: delErr } = await admin.from('user_profiles').delete().eq('id', perfilDono.id);
          if (delErr) throw new Error(`limpando perfil órfão: ${delErr.message}`);
        }
      }

      const { error: profErr } = await admin.from('user_profiles').insert({
        id: userId,
        pessoa_id: pessoaId,
        username: DEMO_USERNAME,
        ativo: true,
        two_fa_enabled: false,
        exige_troca_senha: false,
      });
      // sem perfil, is_active(demo)=false e o demo enxerga quase nada —
      // erro aqui não pode ser silencioso
      if (profErr) throw new Error(`user_profiles: ${profErr.message}`);
    } else {
      const { error: updErr } = await admin.from('user_profiles').update({ ativo: true }).eq('id', userId);
      if (updErr) throw new Error(`user_profiles(update): ${updErr.message}`);
    }

    // 4. Ensure master role
    const { data: roleExist } = await admin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'master')
      .maybeSingle();
    if (!roleExist) {
      await admin.from('user_roles').insert({ user_id: userId, role: 'master' });
    }

    // 5. Grant access to all lojas
    const { data: lojas } = await admin.from('lojas').select('id');
    if (lojas && lojas.length > 0) {
      const { data: jaTem } = await admin
        .from('user_lojas_permitidas')
        .select('loja_id')
        .eq('user_id', userId);
      const tem = new Set((jaTem || []).map((x) => x.loja_id));
      const novos = lojas.filter((l) => !tem.has(l.id)).map((l) => ({ user_id: userId, loja_id: l.id }));
      if (novos.length) {
        await admin.from('user_lojas_permitidas').insert(novos);
      }
    }

    // NUNCA devolver a senha na resposta — o front já conhece a credencial demo.
    return Response.json(
      { success: true },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('setup-demo-user error:', error);
    return Response.json(
      { error: (error as Error).message || 'erro' },
      { status: 500, headers: corsHeaders },
    );
  }
});
