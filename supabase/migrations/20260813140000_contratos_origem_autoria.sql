-- =====================================================================
-- Ticket #52 — correção mínima (estancar perda de dado na renovação)
--
-- (1) contratos.data_inicio_original: preserva a data de nascimento do
--     contrato, que hoje é sobrescrita a cada renovação (RenovarContratoModal
--     grava data_inicio = início da renovação). data_inicio continua sendo o
--     início do período VIGENTE; o histórico completo por período vem na
--     Fase 1b (tabela contrato_periodos).
-- (2) contratos.valor_original: preserva o valor da venda inicial, que hoje é
--     inflado a cada renovação (valor_total acumula), cegando o relatório de
--     descontos (max(0, valor_tabela - valor_total) clampa em zero).
-- (3) created_by com DEFAULT auth.uid(): hoje é NULL em todo contrato.
--
-- Os valores são garantidos por TRIGGER, não pelo front — assim qualquer
-- caminho de escrita (UI, script, integração) preserva a origem.
-- =====================================================================

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS data_inicio_original date,
  ADD COLUMN IF NOT EXISTS valor_original numeric;

-- Backfill: para contratos existentes o melhor conhecido é o estado atual.
-- Ressalva: contratos JÁ renovados antes desta migration têm data_inicio e
-- valor_total sobrescritos — esse dado não é recuperável (perda pretérita).
UPDATE public.contratos
   SET data_inicio_original = COALESCE(data_inicio_original, data_inicio),
       valor_original       = COALESCE(valor_original, valor_total)
 WHERE data_inicio_original IS NULL OR valor_original IS NULL;

ALTER TABLE public.contratos
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Preenche na criação e PROTEGE de sobrescrita nas renovações.
CREATE OR REPLACE FUNCTION public.trg_contratos_preserva_origem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.data_inicio_original := COALESCE(NEW.data_inicio_original, NEW.data_inicio);
    NEW.valor_original       := COALESCE(NEW.valor_original, NEW.valor_total);
    NEW.created_by           := COALESCE(NEW.created_by, auth.uid());
  ELSE
    -- imutáveis após a criação: renovação não reescreve a origem
    NEW.data_inicio_original := COALESCE(OLD.data_inicio_original, NEW.data_inicio_original, OLD.data_inicio);
    NEW.valor_original       := COALESCE(OLD.valor_original, NEW.valor_original, OLD.valor_total);
    NEW.created_by           := COALESCE(OLD.created_by, NEW.created_by);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_contratos_origem ON public.contratos;
CREATE TRIGGER trg_contratos_origem
  BEFORE INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.trg_contratos_preserva_origem();

COMMENT ON COLUMN public.contratos.data_inicio_original IS
  'Data de início da 1ª vigência (nascimento do contrato). Imutável; data_inicio reflete o período vigente após renovações. Ticket #52.';
COMMENT ON COLUMN public.contratos.valor_original IS
  'Valor da venda inicial, sem as renovações acumuladas em valor_total. Base do relatório de descontos. Ticket #52.';

-- Autoria no aditivo de renovação (hoje gravado como NULL pelo modal).
ALTER TABLE public.aditivos_contratuais
  ALTER COLUMN criado_por SET DEFAULT auth.uid();
