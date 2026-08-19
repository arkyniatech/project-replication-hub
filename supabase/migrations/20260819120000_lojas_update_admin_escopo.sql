-- RELAY 55 — LOTE C, migration 1
-- Item 14.4: admin não consegue salvar endereço/telefone/e-mail da loja.
--
-- CAUSA
-- A tabela lojas não tem política de UPDATE que contemple o admin restrito às
-- suas lojas. O UPDATE é filtrado silenciosamente pela RLS (zero linhas) e o
-- .select().single() encadeado devolve 406 — a tela não mostra erro, os campos
-- só voltam vazios. Consequência: o PDF do contrato cai no endereço de
-- fallback genérico "Av. Paulista, 1000".
--
-- PREDICADO
-- Replicado da política de SELECT já existente em lojas (criada em
-- 20260211183731_fix_security_rls_phase_1.sql):
--
--   id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
--   OR has_role(auth.uid(), 'admin'::app_role)
--
-- Aqui usamos SOMENTE o primeiro ramo (vínculo em user_lojas_permitidas). O
-- ramo has_role(admin) é deliberadamente omitido: na SELECT ele é aceitável
-- (admin enxergar todas as lojas), mas numa UPDATE ele daria a qualquer admin
-- poder de escrita sobre TODAS as lojas, que não é o que o item pede — pede
-- "restrita às lojas dele".
--
-- USING **e** WITH CHECK
-- USING decide quais linhas o admin pode alterar; WITH CHECK decide como elas
-- podem ficar depois. Sem WITH CHECK o admin poderia mover uma loja para fora
-- do próprio escopo (trocar o id / desvincular). Com os dois, a linha precisa
-- estar no escopo dele antes E depois.
--
-- ESCOPO
-- Não toca em política de master, nem em INSERT, nem em DELETE.

-- Idempotente: permite reaplicar a migration sem erro.
DROP POLICY IF EXISTS "Admin pode atualizar suas lojas" ON public.lojas;

CREATE POLICY "Admin pode atualizar suas lojas"
  ON public.lojas FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (
      SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (
      SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Admin pode atualizar suas lojas" ON public.lojas IS
  'RELAY 55 #14.4 — admin edita apenas lojas às quais está vinculado em '
  'user_lojas_permitidas. USING+WITH CHECK para impedir que uma loja seja '
  'movida para fora do escopo do próprio admin. Não substitui a política de '
  'master, que permanece intacta.';
