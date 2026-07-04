-- ============================================================
-- AUDITORIA DE USUÁRIOS ÓRFÃOS — Supabase Dashboard > SQL Editor
--
-- Lista usuários "meio-criados" (resultado do bug de RLS):
--   A) com perfil mas SEM nenhuma role  -> não conseguem usar o sistema
--   B) com perfil mas SEM nenhuma loja  -> barrados pelos filtros de loja
--   C) no auth mas SEM user_profile     -> invisíveis na lista do sistema
--
-- Somente leitura — não altera nada.
-- ============================================================

-- A) Perfis sem nenhuma role
SELECT
  'SEM_ROLE' AS problema,
  up.id,
  up.username,
  u.email,
  up.ativo,
  u.created_at
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.id
LEFT JOIN public.user_roles ur ON ur.user_id = up.id
WHERE ur.user_id IS NULL

UNION ALL

-- B) Perfis sem nenhuma loja permitida
SELECT
  'SEM_LOJA' AS problema,
  up.id,
  up.username,
  u.email,
  up.ativo,
  u.created_at
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.id
LEFT JOIN public.user_lojas_permitidas ul ON ul.user_id = up.id
WHERE ul.user_id IS NULL

UNION ALL

-- C) Usuários auth sem user_profile
SELECT
  'SEM_PROFILE' AS problema,
  u.id,
  NULL AS username,
  u.email,
  NULL AS ativo,
  u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
WHERE up.id IS NULL

ORDER BY problema, created_at;

-- ============================================================
-- CORREÇÃO (exemplo) — depois de identificar os órfãos acima:
--
-- 1) Para usuários SEM_ROLE / SEM_LOJA: o mais simples é abrir
--    "Editar Acesso" no sistema (após aplicar APLICAR_EM_PRODUCAO.sql
--    e redeployar as functions) e salvar os perfis/lojas corretos.
--
-- 2) Ou corrigir direto por SQL, ex.:
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('<id-do-usuario>', 'vendedor')
--    ON CONFLICT (user_id, role) DO NOTHING;
--
-- 3) Para usuários SEM_PROFILE que não deveriam existir, exclua
--    pelo painel: Authentication > Users > (usuário) > Delete.
-- ============================================================
