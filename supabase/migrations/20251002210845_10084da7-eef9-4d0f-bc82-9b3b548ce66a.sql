-- Adicionar constraint UNIQUE em user_profiles.pessoa_id
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_pessoa_id_unique UNIQUE (pessoa_id);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_pessoa_id ON public.user_profiles(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lojas_user_id ON public.user_lojas_permitidas(user_id);