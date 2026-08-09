-- ============================================================================
-- Demo somente-leitura, camada 2: TRIGGERS.
-- As policies RESTRITIVAS (20260808160000) bloqueiam escrita direta via
-- PostgREST, mas funções SECURITY DEFINER (criar_transferencia,
-- simular_rescisao, triggers de RH...) atravessam a RLS. Triggers disparam
-- SEMPRE, inclusive dentro de SECURITY DEFINER — esta é a barreira que
-- nenhum caminho de escrita autenticado do demo consegue contornar.
-- service_role (edge functions/webhooks) não tem email no JWT -> passa.
-- ATENÇÃO: tabelas novas precisam do trigger (repetir o DO ou incluir na
-- própria migration da tabela).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_bloquear_demo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_demo_user() THEN
    RAISE EXCEPTION 'Modo demonstração: somente leitura';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_demo_readonly ON public.%I', t);
    EXECUTE format($trg$CREATE TRIGGER trg_demo_readonly
      BEFORE INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_demo()$trg$, t);
  END LOOP;
END $$;
