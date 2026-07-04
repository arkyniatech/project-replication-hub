-- ============================================================
-- GRUPOS DE LOJAS (franquias)
-- ============================================================
-- Modelo híbrido:
--   • Um grupo agrega várias lojas (lojas.grupo_id).
--   • Funcionários pertencem a grupos (user_grupos) e ganham
--     automaticamente acesso a TODAS as lojas do grupo — inclusive
--     franquias adicionadas ao grupo no futuro (triggers de sync).
--   • Acessos individuais continuam possíveis: linhas de
--     user_lojas_permitidas com origem_grupo_id NULL são "manuais"
--     e nunca são tocadas pelos triggers.
--
-- Obs.: nome "grupos_lojas" para não confundir com a tabela
-- grupos_equipamentos (agrupamento de modelos de equipamentos).
-- ============================================================

-- ---------- 1) Tabela de grupos ----------
CREATE TABLE IF NOT EXISTS public.grupos_lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_grupos_lojas_updated_at ON public.grupos_lojas;
CREATE TRIGGER update_grupos_lojas_updated_at
  BEFORE UPDATE ON public.grupos_lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2) Loja pertence a um grupo ----------
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.grupos_lojas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lojas_grupo_id ON public.lojas(grupo_id);

-- ---------- 3) Usuário pertence a grupos ----------
CREATE TABLE IF NOT EXISTS public.user_grupos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_id uuid NOT NULL REFERENCES public.grupos_lojas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, grupo_id)
);

-- ---------- 4) Distinguir acesso manual x concedido por grupo ----------
ALTER TABLE public.user_lojas_permitidas
  ADD COLUMN IF NOT EXISTS origem_grupo_id uuid REFERENCES public.grupos_lojas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ulp_origem_grupo ON public.user_lojas_permitidas(origem_grupo_id);

-- ---------- 5) Funções de sincronização ----------

-- Regrava os acessos "de grupo" de um usuário a partir dos grupos atuais.
-- Não toca nas linhas manuais (origem_grupo_id IS NULL).
CREATE OR REPLACE FUNCTION public.sync_lojas_do_usuario(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove concessões de grupo que não se justificam mais
  DELETE FROM public.user_lojas_permitidas ulp
  WHERE ulp.user_id = p_user_id
    AND ulp.origem_grupo_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_grupos ug
      JOIN public.lojas l ON l.grupo_id = ug.grupo_id
      WHERE ug.user_id = p_user_id
        AND l.id = ulp.loja_id
    );

  -- Concede lojas de todos os grupos do usuário
  INSERT INTO public.user_lojas_permitidas (user_id, loja_id, origem_grupo_id)
  SELECT ug.user_id, l.id, ug.grupo_id
  FROM public.user_grupos ug
  JOIN public.lojas l ON l.grupo_id = ug.grupo_id
  WHERE ug.user_id = p_user_id
    AND l.ativo = true
  ON CONFLICT (user_id, loja_id) DO NOTHING;
END;
$$;

-- Trigger: usuário entrou/saiu de um grupo
CREATE OR REPLACE FUNCTION public.trg_user_grupos_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_lojas_do_usuario(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.sync_lojas_do_usuario(OLD.user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_grupos_sync ON public.user_grupos;
CREATE TRIGGER user_grupos_sync
  AFTER INSERT OR DELETE ON public.user_grupos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_user_grupos_sync();

-- Trigger: loja entrou/saiu de um grupo (ou foi criada já num grupo)
CREATE OR REPLACE FUNCTION public.trg_lojas_grupo_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Loja saiu do grupo antigo: revoga concessões daquele grupo
  IF TG_OP = 'UPDATE' AND OLD.grupo_id IS NOT NULL AND OLD.grupo_id IS DISTINCT FROM NEW.grupo_id THEN
    DELETE FROM public.user_lojas_permitidas
    WHERE loja_id = NEW.id
      AND origem_grupo_id = OLD.grupo_id;
  END IF;

  -- Loja está num grupo: concede aos membros do grupo
  IF NEW.grupo_id IS NOT NULL AND NEW.ativo = true THEN
    INSERT INTO public.user_lojas_permitidas (user_id, loja_id, origem_grupo_id)
    SELECT ug.user_id, NEW.id, ug.grupo_id
    FROM public.user_grupos ug
    WHERE ug.grupo_id = NEW.grupo_id
    ON CONFLICT (user_id, loja_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lojas_grupo_sync ON public.lojas;
CREATE TRIGGER lojas_grupo_sync
  AFTER INSERT OR UPDATE OF grupo_id, ativo ON public.lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lojas_grupo_sync();

-- ---------- 6) RLS ----------
ALTER TABLE public.grupos_lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grupos ENABLE ROW LEVEL SECURITY;

-- Grupos: visíveis a autenticados; gerenciados por master/admin
DROP POLICY IF EXISTS "Grupos visíveis para autenticados" ON public.grupos_lojas;
CREATE POLICY "Grupos visíveis para autenticados"
  ON public.grupos_lojas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Master/admin gerenciam grupos" ON public.grupos_lojas;
CREATE POLICY "Master/admin gerenciam grupos"
  ON public.grupos_lojas FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Vínculos usuário-grupo: usuário vê os próprios; master/admin/rh veem todos
DROP POLICY IF EXISTS "Usuário vê próprios grupos ou gestão vê todos" ON public.user_grupos;
CREATE POLICY "Usuário vê próprios grupos ou gestão vê todos"
  ON public.user_grupos FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  );

DROP POLICY IF EXISTS "Master/admin gerenciam vínculos de grupo" ON public.user_grupos;
CREATE POLICY "Master/admin gerenciam vínculos de grupo"
  ON public.user_grupos FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------- 7) Seed: grupo inicial com as lojas atuais ----------
DO $$
DECLARE
  v_grupo_id uuid;
BEGIN
  -- Cria o grupo principal se ainda não existe nenhum
  IF NOT EXISTS (SELECT 1 FROM public.grupos_lojas) THEN
    INSERT INTO public.grupos_lojas (nome, descricao)
    VALUES ('Grupo Principal', 'Grupo inicial com todas as lojas existentes')
    RETURNING id INTO v_grupo_id;

    -- Todas as lojas sem grupo entram no grupo principal
    UPDATE public.lojas SET grupo_id = v_grupo_id WHERE grupo_id IS NULL;

    -- Todos os usuários com perfil ativo entram no grupo principal
    INSERT INTO public.user_grupos (user_id, grupo_id)
    SELECT up.id, v_grupo_id
    FROM public.user_profiles up
    WHERE up.ativo = true
    ON CONFLICT (user_id, grupo_id) DO NOTHING;

    RAISE NOTICE 'Grupo Principal criado (%) com as lojas e usuários existentes', v_grupo_id;
  END IF;
END $$;
