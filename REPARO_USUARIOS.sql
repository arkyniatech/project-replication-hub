-- ============================================================
-- REPARO DOS USUÁRIOS ÓRFÃOS — Supabase Dashboard > SQL Editor
-- Projeto: otpbnwpnprgdncexvksx | Data: 2026-07-04
--
-- Aplica:
--   Marina  -> role admin     + e-mail financeiro@locaacao.com.br
--   Laiane  -> role vendedor  + e-mail ourofino@locaacao.com.br
--   Sandro  -> role motorista
--   Lucas   -> role mecanico
--   Amanda  -> role usuario   (padrão básico — ajuste se necessário)
--   Diego   -> profile + role master (conta diego@locaacao.com.br)
--   Todos   -> acesso a TODAS as lojas ativas
--
-- Idempotente — pode rodar mais de uma vez.
-- ============================================================

BEGIN;

-- ---------- 1) Roles ----------
INSERT INTO public.user_roles (user_id, role) VALUES
  ('ecf2fc0d-e2fb-46a0-9436-73674873fc9c', 'admin'),      -- marina.genoves
  ('44691581-cb43-4b0c-a0fb-7d892fe7ad21', 'vendedor'),   -- laiane
  ('5ac87ec2-2307-4fbb-9c00-c856a7741d77', 'motorista'),  -- sandro.celestino
  ('d718872e-c1d1-44e7-8d3e-720d08146646', 'mecanico'),   -- lucas.oliveira
  ('000be31b-c7fb-48b1-b9ce-65c68324ca59', 'usuario'),    -- amanda (ajustar depois se preciso)
  ('11cb109f-36ac-44bd-8284-fe9ee0df1511', 'master')      -- diego
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------- 2) Profile do Diego (conta antiga sem profile) ----------
-- Vincula à pessoa "Diego Hora" do RH quando existir (CPF 305.130.988-52).
INSERT INTO public.user_profiles (id, username, pessoa_id, two_fa_enabled, exige_troca_senha, ativo)
SELECT
  '11cb109f-36ac-44bd-8284-fe9ee0df1511',
  'diego.hora',
  (SELECT p.id FROM public.pessoas p
    WHERE p.cpf = '305.130.988-52' OR p.nome ILIKE 'Diego Hora%'
    LIMIT 1),
  false,
  false,
  true
ON CONFLICT (id) DO NOTHING;

-- ---------- 3) Todas as lojas ativas para os 6 usuários ----------
INSERT INTO public.user_lojas_permitidas (user_id, loja_id)
SELECT u.user_id, l.id
FROM (VALUES
  ('ecf2fc0d-e2fb-46a0-9436-73674873fc9c'::uuid),  -- marina
  ('44691581-cb43-4b0c-a0fb-7d892fe7ad21'::uuid),  -- laiane
  ('5ac87ec2-2307-4fbb-9c00-c856a7741d77'::uuid),  -- sandro
  ('d718872e-c1d1-44e7-8d3e-720d08146646'::uuid),  -- lucas
  ('000be31b-c7fb-48b1-b9ce-65c68324ca59'::uuid),  -- amanda
  ('11cb109f-36ac-44bd-8284-fe9ee0df1511'::uuid)   -- diego
) AS u(user_id)
CROSS JOIN public.lojas l
WHERE l.ativo = true
ON CONFLICT (user_id, loja_id) DO NOTHING;

-- ---------- 4) Troca de e-mails de login ----------
-- Marina: marina.genoves@locacaoerp.com -> financeiro@locaacao.com.br
UPDATE auth.users
SET email = 'financeiro@locaacao.com.br', updated_at = now()
WHERE id = 'ecf2fc0d-e2fb-46a0-9436-73674873fc9c';

UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"financeiro@locaacao.com.br"'),
    updated_at = now()
WHERE user_id = 'ecf2fc0d-e2fb-46a0-9436-73674873fc9c' AND provider = 'email';

-- Laiane: laiane@locacaoerp.com -> ourofino@locaacao.com.br
UPDATE auth.users
SET email = 'ourofino@locaacao.com.br', updated_at = now()
WHERE id = '44691581-cb43-4b0c-a0fb-7d892fe7ad21';

UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"ourofino@locaacao.com.br"'),
    updated_at = now()
WHERE user_id = '44691581-cb43-4b0c-a0fb-7d892fe7ad21' AND provider = 'email';

COMMIT;

-- ---------- 5) Conferência ----------
SELECT u.email,
       up.username,
       array_agg(DISTINCT ur.role::text) AS roles,
       count(DISTINCT ul.loja_id)        AS lojas
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
LEFT JOIN public.user_roles ur    ON ur.user_id = u.id
LEFT JOIN public.user_lojas_permitidas ul ON ul.user_id = u.id
WHERE u.id IN (
  'ecf2fc0d-e2fb-46a0-9436-73674873fc9c',
  '44691581-cb43-4b0c-a0fb-7d892fe7ad21',
  '5ac87ec2-2307-4fbb-9c00-c856a7741d77',
  'd718872e-c1d1-44e7-8d3e-720d08146646',
  '000be31b-c7fb-48b1-b9ce-65c68324ca59',
  '11cb109f-36ac-44bd-8284-fe9ee0df1511'
)
GROUP BY u.email, up.username
ORDER BY u.email;
