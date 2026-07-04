
DROP POLICY IF EXISTS "Admin pode inserir lojas" ON public.lojas;

CREATE POLICY "Admin e Master podem inserir lojas" ON public.lojas
  FOR INSERT TO authenticated
  WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
;
