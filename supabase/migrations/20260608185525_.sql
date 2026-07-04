
-- Fix is_active search_path
CREATE OR REPLACE FUNCTION public.is_active(u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT ativo FROM public.user_profiles WHERE id = u_id), false);
$function$;

-- Restrict DELETE on contratos-anexos to admin/gestor/master
DROP POLICY IF EXISTS "Authenticated users can delete contract attachments" ON storage.objects;
CREATE POLICY "Admin pode excluir anexos de contrato"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contratos-anexos'
    AND (
      public.is_master(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gestor'::app_role)
    )
  );

-- Aprovacoes_cp scoped by titulo loja
DROP POLICY IF EXISTS "Financeiro pode gerenciar aprovacoes_cp" ON public.aprovacoes_cp;

CREATE POLICY "Financeiro pode gerenciar aprovacoes_cp (loja)"
  ON public.aprovacoes_cp FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.titulos_pagar tp
      WHERE tp.id = aprovacoes_cp.titulo_id
        AND (public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'gestor'::app_role)
             OR public.has_role(auth.uid(), 'financeiro'::app_role))
        AND tp.loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.titulos_pagar tp
      WHERE tp.id = aprovacoes_cp.titulo_id
        AND (public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'gestor'::app_role)
             OR public.has_role(auth.uid(), 'financeiro'::app_role))
        AND tp.loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );
;
