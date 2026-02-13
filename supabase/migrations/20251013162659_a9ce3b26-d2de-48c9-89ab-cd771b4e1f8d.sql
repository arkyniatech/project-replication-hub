-- ============================================
-- Correção Bootstrap Admin - Bypass RLS Temporário
-- ============================================

-- PASSO 1: Desabilitar RLS temporariamente para permitir inserção inicial
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Inserir role 'admin' para o usuário (bootstrap)
INSERT INTO public.user_roles (user_id, role)
VALUES ('5be19bf1-0eac-4501-8fb5-217140626b3c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- PASSO 3: Reabilitar RLS agora que o primeiro admin existe
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Validação: As policies já existem e estão corretas
-- Não é necessário recriar, apenas garantir que funcionem
-- ============================================