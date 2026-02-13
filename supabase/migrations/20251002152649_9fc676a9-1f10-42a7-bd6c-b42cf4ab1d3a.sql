-- ============================================
-- FASE 1: Estrutura do Banco de Dados (RH + Usuários)
-- ============================================

-- 1. Criar Enums
CREATE TYPE public.situacao_pessoa AS ENUM ('ativo', 'inativo', 'ferias', 'afastado');
CREATE TYPE public.app_role AS ENUM ('vendedor', 'motorista', 'mecanico', 'financeiro', 'gestor', 'admin', 'rh');

-- 2. Criar função auxiliar para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Criar tabela PESSOAS (módulo RH)
CREATE TABLE public.pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text UNIQUE NOT NULL,
  email text UNIQUE,
  telefone text,
  matricula text UNIQUE,
  cargo text,
  loja_id uuid,
  cc_id uuid,
  situacao public.situacao_pessoa NOT NULL DEFAULT 'ativo',
  admissao_iso date,
  salario decimal(10,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Criar tabela USER_PROFILES (perfis de usuário vinculados a pessoas)
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa_id uuid UNIQUE NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  username text UNIQUE,
  loja_padrao_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  exige_troca_senha boolean NOT NULL DEFAULT false,
  two_fa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Criar tabela USER_ROLES (roles separadas - segurança crítica)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 6. Criar tabela USER_LOJAS_PERMITIDAS (multi-loja)
CREATE TABLE public.user_lojas_permitidas (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL,
  PRIMARY KEY (user_id, loja_id)
);

-- 7. Criar função de segurança: verificar_pessoa_ativa
CREATE OR REPLACE FUNCTION public.verificar_pessoa_ativa(p_pessoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pessoas 
    WHERE id = p_pessoa_id 
    AND situacao = 'ativo'
  )
$$;

-- 8. Criar função de segurança: has_role (evita recursão RLS)
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
    AND role = _role
  )
$$;

-- 9. Criar triggers para updated_at
CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Criar função e trigger para suspender usuário quando pessoa fica inativa
CREATE OR REPLACE FUNCTION public.suspender_usuario_pessoa_inativa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.situacao = 'ativo' AND NEW.situacao = 'inativo' THEN
    UPDATE public.user_profiles
    SET ativo = false
    WHERE pessoa_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_suspender_usuario
  AFTER UPDATE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.suspender_usuario_pessoa_inativa();

-- 11. Habilitar RLS em todas as tabelas
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lojas_permitidas ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies para PESSOAS
CREATE POLICY "Pessoas visíveis para autenticados"
  ON public.pessoas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e RH podem inserir pessoas"
  ON public.pessoas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'rh')
  );

CREATE POLICY "Admin e RH podem atualizar pessoas"
  ON public.pessoas FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'rh')
  );

CREATE POLICY "Admin e RH podem deletar pessoas"
  ON public.pessoas FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'rh')
  );

-- 13. RLS Policies para USER_PROFILES
CREATE POLICY "Usuários veem próprio perfil ou admin/rh veem todos"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'rh')
  );

CREATE POLICY "Admin pode criar perfis"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar perfis"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar perfis"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 14. RLS Policies para USER_ROLES
CREATE POLICY "Roles visíveis para autenticados"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin pode inserir roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 15. RLS Policies para USER_LOJAS_PERMITIDAS
CREATE POLICY "Usuário vê próprias lojas ou admin vê todas"
  ON public.user_lojas_permitidas FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin pode inserir lojas"
  ON public.user_lojas_permitidas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar lojas"
  ON public.user_lojas_permitidas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar lojas"
  ON public.user_lojas_permitidas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 16. Criar índices para performance
CREATE INDEX idx_pessoas_cpf ON public.pessoas(cpf);
CREATE INDEX idx_pessoas_situacao ON public.pessoas(situacao);
CREATE INDEX idx_pessoas_loja_id ON public.pessoas(loja_id);
CREATE INDEX idx_user_profiles_pessoa_id ON public.user_profiles(pessoa_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_lojas_user_id ON public.user_lojas_permitidas(user_id);

-- Comentários para documentação
COMMENT ON TABLE public.pessoas IS 'Tabela de colaboradores do módulo RH';
COMMENT ON TABLE public.user_profiles IS 'Perfis de usuário do sistema vinculados a pessoas (RH)';
COMMENT ON TABLE public.user_roles IS 'Roles/perfis de acesso dos usuários (tabela separada por segurança)';
COMMENT ON TABLE public.user_lojas_permitidas IS 'Lojas que cada usuário tem permissão de acessar';
COMMENT ON FUNCTION public.verificar_pessoa_ativa IS 'Verifica se uma pessoa está ativa no RH';
COMMENT ON FUNCTION public.has_role IS 'Verifica se um usuário possui uma role específica (SECURITY DEFINER para evitar recursão RLS)';