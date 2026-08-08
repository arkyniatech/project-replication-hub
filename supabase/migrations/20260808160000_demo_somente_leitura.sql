-- ============================================================================
-- Demo (teste@teste.com) vira SOMENTE-LEITURA no banco.
-- O usuário demo mantém papel master (enxerga tudo para demonstração), mas
-- políticas RESTRITIVAS bloqueiam INSERT/UPDATE/DELETE em TODAS as tabelas
-- public + storage.objects. Políticas restritivas são AND-adas com as
-- permissivas — nem o master-bypass de has_role() atravessa.
-- service_role (edge functions) não passa por RLS, então os fluxos de
-- sistema continuam intactos; o guard anti-demo das functions cobre esse lado.
-- ATENÇÃO: tabelas criadas no futuro precisam repetir estas 3 policies
-- (ou re-rodar o DO abaixo).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_demo_user() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt()->>'email','') = 'teste@teste.com'
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_ins" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_ins" ON public.%I AS RESTRICTIVE
      FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_upd" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_upd" ON public.%I AS RESTRICTIVE
      FOR UPDATE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_del" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_del" ON public.%I AS RESTRICTIVE
      FOR DELETE TO authenticated USING (NOT public.is_demo_user())$p$, t);
  END LOOP;
END $$;

-- storage: demo não sobe/edita/apaga arquivo em nenhum bucket
DROP POLICY IF EXISTS "demo_ro_ins" ON storage.objects;
CREATE POLICY "demo_ro_ins" ON storage.objects AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_ro_upd" ON storage.objects;
CREATE POLICY "demo_ro_upd" ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_ro_del" ON storage.objects;
CREATE POLICY "demo_ro_del" ON storage.objects AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT public.is_demo_user());
