-- ============================================
-- Garantir que o enum app_role contém todos os
-- valores usados pelo frontend (SELECTABLE_ROLES)
-- ============================================
-- O banco em produção já possui 'master' e 'usuario' (adicionados fora das
-- migrations), mas o repositório não os registrava — instalações novas a
-- partir das migrations quebravam com "invalid input value for enum app_role".
--
-- Nota: valores novos de enum não podem ser USADOS na mesma transação em que
-- foram criados; por isso as policies que referenciam 'master' estão na
-- migration seguinte (20260703120100).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'usuario';
