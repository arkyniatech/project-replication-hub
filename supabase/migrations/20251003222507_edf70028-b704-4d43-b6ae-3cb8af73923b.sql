-- Fase 1: Corrigir dados do usuário existente diego@locaacao.com.br
-- User ID correto: 5be19bf1-0eac-4501-8fb5-217140626b3c

-- 1. Inserir as 4 lojas em user_lojas_permitidas para o usuário
INSERT INTO public.user_lojas_permitidas (user_id, loja_id)
SELECT 
  '5be19bf1-0eac-4501-8fb5-217140626b3c'::uuid,
  id
FROM public.lojas
WHERE ativo = true
ON CONFLICT (user_id, loja_id) DO NOTHING;

-- 2. Atribuir role 'admin' ao usuário diego em user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('5be19bf1-0eac-4501-8fb5-217140626b3c'::uuid, 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;