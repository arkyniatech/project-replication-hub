-- ============================================================================
-- Correções de isolamento multi-loja (RLS) — tabelas de RH que só checavam
-- papel passam a filtrar por loja/empresa, como o resto do schema.
--   • rh_audit_log        -> só master/admin (contém salário/PII; sem coluna de loja)
--   • fgts_ledger / provisao_snapshots / rescisao_simulacoes -> escopo por loja_id
--   • rescisao_itens      -> escopo via simulação-pai (loja_id)
--   • rh_aprovacoes       -> escopo via solicitação-pai (loja_id)
--   • banco_horas_apuracoes / holerite_lotes -> escopo por empresa (via lojas do usuário)
-- E hardening do simular_rescisao(): checagem de loja dentro da função +
-- REVOKE de anon/public (era SECURITY DEFINER executável sem autenticação).
-- ============================================================================

-- ---------- 1) rh_audit_log: leitura só master/admin ----------
DROP POLICY IF EXISTS "audit_select" ON public.rh_audit_log;
CREATE POLICY "audit_select" ON public.rh_audit_log FOR SELECT TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)));

-- ---------- 2) tabelas com loja_id direto: fgts_ledger / provisao_snapshots / rescisao_simulacoes ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fgts_ledger','provisao_snapshots','rescisao_simulacoes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
  END LOOP;
END $$;

-- ---------- 3) rescisao_itens: escopo via simulação-pai ----------
DROP POLICY IF EXISTS "rescisao_itens_sel" ON public.rescisao_itens;
CREATE POLICY "rescisao_itens_sel" ON public.rescisao_itens FOR SELECT TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND EXISTS (SELECT 1 FROM public.rescisao_simulacoes s
                    WHERE s.id = rescisao_itens.simulacao_id
                      AND s.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));
DROP POLICY IF EXISTS "rescisao_itens_wr" ON public.rescisao_itens;
CREATE POLICY "rescisao_itens_wr" ON public.rescisao_itens FOR ALL TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND EXISTS (SELECT 1 FROM public.rescisao_simulacoes s
                    WHERE s.id = rescisao_itens.simulacao_id
                      AND s.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))))
  WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND EXISTS (SELECT 1 FROM public.rescisao_simulacoes s
                    WHERE s.id = rescisao_itens.simulacao_id
                      AND s.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));

-- ---------- 4) rh_aprovacoes: escopo via solicitação-pai ----------
DROP POLICY IF EXISTS "aprov_select" ON public.rh_aprovacoes;
CREATE POLICY "aprov_select" ON public.rh_aprovacoes FOR SELECT TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND EXISTS (SELECT 1 FROM public.rh_solicitacoes s
                    WHERE s.id = rh_aprovacoes.solicitacao_id
                      AND s.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));
DROP POLICY IF EXISTS "aprov_write" ON public.rh_aprovacoes;
CREATE POLICY "aprov_write" ON public.rh_aprovacoes FOR ALL TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND EXISTS (SELECT 1 FROM public.rh_solicitacoes s
                    WHERE s.id = rh_aprovacoes.solicitacao_id
                      AND s.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))))
  WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND EXISTS (SELECT 1 FROM public.rh_solicitacoes s
                    WHERE s.id = rh_aprovacoes.solicitacao_id
                      AND s.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));

-- ---------- 5) banco_horas_apuracoes / holerite_lotes: escopo por empresa ----------
-- (só têm empresa_id; mapeia empresa <- lojas do usuário)
DROP POLICY IF EXISTS "bh_apur_select" ON public.banco_horas_apuracoes;
CREATE POLICY "bh_apur_select" ON public.banco_horas_apuracoes FOR SELECT TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND empresa_id IN (SELECT l.empresa_id FROM public.lojas l
                           WHERE l.id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));
DROP POLICY IF EXISTS "bh_apur_write" ON public.banco_horas_apuracoes;
CREATE POLICY "bh_apur_write" ON public.banco_horas_apuracoes FOR ALL TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND empresa_id IN (SELECT l.empresa_id FROM public.lojas l
                           WHERE l.id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))))
  WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND empresa_id IN (SELECT l.empresa_id FROM public.lojas l
                           WHERE l.id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));

DROP POLICY IF EXISTS "holerite_lotes_select" ON public.holerite_lotes;
CREATE POLICY "holerite_lotes_select" ON public.holerite_lotes FOR SELECT TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND empresa_id IN (SELECT l.empresa_id FROM public.lojas l
                           WHERE l.id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));
DROP POLICY IF EXISTS "holerite_lotes_write" ON public.holerite_lotes;
CREATE POLICY "holerite_lotes_write" ON public.holerite_lotes FOR ALL TO authenticated
  USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND empresa_id IN (SELECT l.empresa_id FROM public.lojas l
                           WHERE l.id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))))
  WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND empresa_id IN (SELECT l.empresa_id FROM public.lojas l
                           WHERE l.id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())))));

-- ---------- 6) simular_rescisao: guard de loja dentro da função + REVOKE de anon/public ----------
CREATE OR REPLACE FUNCTION public.simular_rescisao(p_pessoa_id uuid, p_motivo text, p_data date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v record; v_sim uuid; v_sal numeric; v_dia numeric; v_anos numeric;
  v_meses_13 int; v_meses_fer int; v_aviso_dias int; v_terco numeric;
  v_multa_rate numeric; v_saldo_fgts numeric; v_total numeric := 0; ord int := 0;
  v_dias_venc int;
BEGIN
  SELECT pv.id, pv.empresa_id, pv.loja_id, pv.salario, pv.data_admissao
    INTO v FROM public.pessoa_vinculo pv WHERE pv.pessoa_id = p_pessoa_id AND pv.vigencia_fim IS NULL LIMIT 1;

  -- guard: só master/admin, ou rh com acesso à loja do vínculo
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'Vínculo ativo não encontrado para a pessoa %', p_pessoa_id;
  END IF;
  IF NOT (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
          OR (public.has_role(auth.uid(),'rh'::app_role)
              AND v.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))) THEN
    RAISE EXCEPTION 'Sem permissão para simular rescisão nesta loja';
  END IF;

  v_sal := COALESCE(v.salario, 0);
  v_dia := v_sal / 30.0;
  v_terco := public.param_trab('adicional_ferias');
  v_anos := GREATEST(0, floor(EXTRACT(YEAR FROM age(p_data, COALESCE(v.data_admissao, p_data)))));

  INSERT INTO public.rescisao_simulacoes (pessoa_id, vinculo_id, empresa_id, loja_id, data_desligamento, motivo,
    tipo_aviso, versao_calculo, status)
  VALUES (p_pessoa_id, v.id, v.empresa_id, v.loja_id, p_data, p_motivo,
    CASE WHEN p_motivo='pedido_demissao' THEN 'nao_aplica' ELSE 'indenizado' END, 'v1-estimativa', 'rascunho')
  RETURNING id INTO v_sim;

  -- 1) Saldo de salário (dias do mês trabalhados)
  ord := ord + 1;
  INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
  VALUES (v_sim, 'Saldo de salário', EXTRACT(DAY FROM p_data)::text || ' dia(s) × salário/30', v_dia, EXTRACT(DAY FROM p_data), round(v_dia * EXTRACT(DAY FROM p_data), 2), ord);
  v_total := v_total + round(v_dia * EXTRACT(DAY FROM p_data), 2);

  -- 2) Aviso prévio (só sem_justa_causa e acordo)
  v_aviso_dias := LEAST(public.param_trab('aviso_previo_dias_max')::int,
                        public.param_trab('aviso_previo_dias_base')::int + (v_anos * public.param_trab('aviso_previo_dias_por_ano'))::int);
  IF p_motivo = 'sem_justa_causa' THEN
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
    VALUES (v_sim, 'Aviso prévio indenizado', v_aviso_dias::text || ' dias', v_dia, v_aviso_dias, round(v_dia * v_aviso_dias, 2), ord);
    v_total := v_total + round(v_dia * v_aviso_dias, 2);
  ELSIF p_motivo = 'acordo_484a' THEN
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
    VALUES (v_sim, 'Aviso prévio (50% — acordo)', (v_aviso_dias/2)::text || ' dias', v_dia, v_aviso_dias/2.0, round(v_dia * v_aviso_dias / 2.0, 2), ord);
    v_total := v_total + round(v_dia * v_aviso_dias / 2.0, 2);
  END IF;

  -- 3) 13º proporcional (meses no ano corrente)
  v_meses_13 := EXTRACT(MONTH FROM p_data);
  ord := ord + 1;
  INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
  VALUES (v_sim, '13º proporcional', v_meses_13::text || '/12 avos', v_sal/12.0, v_meses_13, round(v_sal/12.0 * v_meses_13, 2), ord);
  v_total := v_total + round(v_sal/12.0 * v_meses_13, 2);

  -- 4) Férias proporcionais + 1/3 (meses desde o último aniversário aquisitivo, aprox.)
  v_meses_fer := LEAST(12, GREATEST(0, EXTRACT(MONTH FROM age(p_data, COALESCE(v.data_admissao, p_data)))::int));
  ord := ord + 1;
  INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
  VALUES (v_sim, 'Férias proporcionais + 1/3', v_meses_fer::text || '/12 avos', v_sal/12.0, v_meses_fer, round(v_sal/12.0 * v_meses_fer * (1 + v_terco), 2), ord);
  v_total := v_total + round(v_sal/12.0 * v_meses_fer * (1 + v_terco), 2);

  -- 5) Férias vencidas + 1/3 (dias em aberto)
  SELECT COALESCE(SUM(dias_saldo),0) INTO v_dias_venc FROM public.ferias_periodos
    WHERE pessoa_id = p_pessoa_id AND status IN ('vencido','dobro_devido','adquirido');
  IF v_dias_venc > 0 THEN
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
    VALUES (v_sim, 'Férias vencidas + 1/3', v_dias_venc::text || ' dias × salário/30', v_dia, v_dias_venc, round(v_dia * v_dias_venc * (1 + v_terco), 2), ord);
    v_total := v_total + round(v_dia * v_dias_venc * (1 + v_terco), 2);
  END IF;

  -- 6) Multa FGTS (estimativa: 8% × salário × meses de casa como saldo estimado)
  v_multa_rate := CASE p_motivo WHEN 'sem_justa_causa' THEN public.param_trab('multa_fgts_sem_justa_causa')
                                WHEN 'acordo_484a' THEN public.param_trab('multa_fgts_acordo') ELSE 0 END;
  IF v_multa_rate > 0 THEN
    v_saldo_fgts := public.param_trab('fgts_aliquota') * v_sal * GREATEST(1, EXTRACT(MONTH FROM age(p_data, COALESCE(v.data_admissao, p_data)))::int + v_anos*12);
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, aliquota, valor, ordem)
    VALUES (v_sim, 'Multa FGTS (estimada)', 'saldo FGTS estimado × multa', round(v_saldo_fgts,2), v_multa_rate, round(v_saldo_fgts * v_multa_rate, 2), ord);
    v_total := v_total + round(v_saldo_fgts * v_multa_rate, 2);
  END IF;

  UPDATE public.rescisao_simulacoes SET total_proventos = v_total, custo_empregador = v_total WHERE id = v_sim;
  RETURN v_sim;
END $$;

REVOKE EXECUTE ON FUNCTION public.simular_rescisao(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simular_rescisao(uuid, text, date) TO authenticated;
