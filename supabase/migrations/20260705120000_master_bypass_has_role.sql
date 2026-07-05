-- ============================================================
-- MASTER É SUPERUSUÁRIO: has_role() passa a considerar que quem
-- tem o papel 'master' satisfaz QUALQUER verificação de papel.
-- ============================================================
-- PROBLEMA: dezenas de policies (recebimentos, contratos, titulos,
-- pessoas, equipamentos, ...) verificam has_role(admin/financeiro/
-- vendedor/...) e o papel 'master' ficou de fora de todas — cada
-- tela nova testada como master estourava
-- "new row violates row-level security policy" (#21 recebimentos).
--
-- SOLUÇÃO: em vez de recriar ~180 policies, redefinimos a função
-- has_role (SECURITY DEFINER, usada por todas elas): master → true
-- para qualquer _role consultada. Semântica acordada: "o Master vê
-- e faz tudo, em todas as lojas".
--
-- Obs.: as verificações "somente master pode conceder master/admin"
-- (edge functions create-user/update-user-access) consultam a tabela
-- user_roles diretamente e NÃO são afetadas.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'master'::app_role)
  )
$$;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'true se o usuário tem o papel informado OU o papel master (superusuário).';
