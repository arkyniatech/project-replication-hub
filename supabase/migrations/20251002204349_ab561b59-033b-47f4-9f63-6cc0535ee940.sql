-- Migrar dados existentes em pessoas para usar os novos UUIDs
-- Usar type cast explícito para converter TEXT em UUID

-- Atualizar loja_id baseado nos códigos
UPDATE public.pessoas p
SET loja_id = l.id
FROM public.lojas l
WHERE p.loja_id::text = l.codigo;

-- Atualizar cc_id baseado nos códigos  
UPDATE public.pessoas p
SET cc_id = cc.id
FROM public.centros_custo cc
WHERE p.cc_id::text = cc.codigo;

-- Limpar registros órfãos (se houver) - apenas para dados inválidos remanescentes
-- Comentado por segurança - descomentar se necessário após verificar dados
-- UPDATE public.pessoas
-- SET loja_id = NULL
-- WHERE loja_id IS NOT NULL 
--   AND NOT EXISTS (
--     SELECT 1 FROM public.lojas WHERE id = pessoas.loja_id
--   );

-- UPDATE public.pessoas
-- SET cc_id = NULL
-- WHERE cc_id IS NOT NULL 
--   AND NOT EXISTS (
--     SELECT 1 FROM public.centros_custo WHERE id = pessoas.cc_id
--   );