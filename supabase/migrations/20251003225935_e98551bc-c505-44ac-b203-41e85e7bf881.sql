-- Ajustar policies de user_lojas_permitidas para evitar recursão

-- Remover policies antigas
DROP POLICY IF EXISTS "Admin pode deletar lojas" ON public.user_lojas_permitidas;
DROP POLICY IF EXISTS "Admin pode inserir lojas" ON public.user_lojas_permitidas;

-- Criar nova policy de DELETE que não causa recursão
CREATE POLICY "Admin pode deletar lojas permitidas"
ON public.user_lojas_permitidas
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Criar nova policy de INSERT que não causa recursão
CREATE POLICY "Admin pode inserir lojas permitidas"
ON public.user_lojas_permitidas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);