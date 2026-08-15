-- ============================================================
-- FK user_lojas_permitidas.loja_id -> lojas.id
-- ============================================================
-- A tabela foi criada em 20260101043032_initial_rh_users.sql com
-- `loja_id uuid NOT NULL` mas SEM REFERENCES. As únicas FKs existentes são
-- user_id -> auth.users e origem_grupo_id -> grupos_lojas.
--
-- Consequência no frontend: o PostgREST monta embeds a partir de FKs, então
-- `select=loja_id,lojas(nome,codigo)` falha com PGRST200 ("Could not find a
-- relationship..."). Isso trava o botão "Revisar" da contagem e as telas que
-- listam as lojas permitidas de um usuário.
--
-- ON DELETE CASCADE, coerente com o resto do schema:
--   • É uma tabela de concessão de acesso (join user x loja), não um registro
--     histórico. Apagar a loja deve revogar o acesso, não bloquear o DELETE.
--   • As outras duas FKs da MESMA tabela já são CASCADE:
--       user_id        -> auth.users(id)     ON DELETE CASCADE
--       origem_grupo_id -> grupos_lojas(id)  ON DELETE CASCADE
--   • sync_lojas_do_usuario() e trg_lojas_grupo_sync() (20260704120000)
--     já apagam linhas desta tabela como operação normal.
-- RESTRICT tornaria a exclusão de uma loja impossível enquanto houvesse
-- qualquer usuário com acesso a ela.
--
-- Integridade verificada antes de aplicar: 76 linhas, 0 órfãs, 0 loja_id nulo.
-- O bloco abaixo revalida no momento da aplicação e aborta se algo mudou.
-- ============================================================

DO $$
DECLARE
  v_orfas integer;
BEGIN
  SELECT count(*)
  INTO v_orfas
  FROM public.user_lojas_permitidas ulp
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lojas l WHERE l.id = ulp.loja_id
  );

  IF v_orfas > 0 THEN
    RAISE EXCEPTION
      'Abortado: % linha(s) em user_lojas_permitidas com loja_id inexistente. Limpe os órfãos antes de criar a FK.',
      v_orfas;
  END IF;
END $$;

ALTER TABLE public.user_lojas_permitidas
  DROP CONSTRAINT IF EXISTS user_lojas_permitidas_loja_id_fkey;

ALTER TABLE public.user_lojas_permitidas
  ADD CONSTRAINT user_lojas_permitidas_loja_id_fkey
  FOREIGN KEY (loja_id)
  REFERENCES public.lojas(id)
  ON DELETE CASCADE;

-- A PK é (user_id, loja_id), então loja_id é a 2ª coluna do índice composto e
-- não serve para as buscas por loja nem para a checagem de FK no DELETE.
CREATE INDEX IF NOT EXISTS idx_ulp_loja_id
  ON public.user_lojas_permitidas(loja_id);

COMMENT ON CONSTRAINT user_lojas_permitidas_loja_id_fkey ON public.user_lojas_permitidas IS
  'Garante integridade referencial com lojas e habilita o embed lojas(...) via PostgREST. CASCADE: apagar a loja revoga os acessos.';
