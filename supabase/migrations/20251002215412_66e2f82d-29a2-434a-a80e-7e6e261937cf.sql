-- 1. Corrigir RLS de user_profiles para permitir criação durante signup
DROP POLICY IF EXISTS "Admin pode criar perfis" ON public.user_profiles;

-- ⚠️ POLÍTICA TEMPORÁRIA PARA DEV - REMOVER ANTES DE PRODUÇÃO ⚠️
CREATE POLICY "DEV: Permitir criação de perfis durante signup"
ON public.user_profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 2. Atualizar nomes das Lojas
UPDATE public.lojas 
SET nome = 'Águas de Lindóia-SP' 
WHERE codigo = 'loja-1';

UPDATE public.lojas 
SET nome = 'Socorro-SP' 
WHERE codigo = 'loja-2';

UPDATE public.lojas 
SET nome = 'Monte Sião-MG' 
WHERE codigo = 'loja-3';

UPDATE public.lojas 
SET nome = 'Ouro Fino-MG' 
WHERE codigo = 'loja-4';