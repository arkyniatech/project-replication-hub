-- ============================================================
-- FK faturas.cliente_id -> clientes.id  e  faturas.loja_id -> lojas.id
-- ============================================================
-- Mesmo padrão da 20260815140000_fk_user_lojas_permitidas_loja.sql:
-- colunas NOT NULL declaradas SEM REFERENCES, então o PostgREST não consegue
-- montar o embed e a tela quebra com PGRST200.
--
-- A tabela vigente foi criada em 20260101043357_create_faturas.sql com:
--     loja_id     UUID NOT NULL                                  (sem FK)
--     cliente_id  UUID NOT NULL                                  (sem FK)
--     contrato_id UUID REFERENCES public.contratos(id)           (FK implícita)
-- A FK implícita do contrato_id nasceu com o nome gerado pelo Postgres,
-- faturas_contrato_id_fkey, e é hoje a ÚNICA FK da tabela.
--
-- Atenção ao histórico, para não reintroduzir duplicata: as constraints
-- fk_faturas_cliente / fk_faturas_contrato / fk_faturas_loja chegaram a ser
-- criadas em 20251012231550, sobre a tabela ANTERIOR (20251012155330), que foi
-- posteriormente recriada. Elas não existem no banco atual. Por isso esta
-- migration recria apenas cliente e loja, e NÃO toca em contrato_id — mexer
-- nele repetiria o vaivém de 20251012231935, que dropou a FK duplicada.
--
-- Consequência no frontend: useSupabaseFaturas usa
--   .select('*, cliente:clientes(*), contrato:contratos(*)')
-- e o embed cliente:clientes(*) falha com PGRST200 ("Could not find a
-- relationship between 'faturas' and 'clientes' in the schema cache"), com o
-- hint do Postgres sugerindo 'contratos'. Como o erro derruba a query inteira,
-- a aba Faturamento fica cega para TODA fatura, não só para o campo do cliente.
-- Com a FK no lugar a query passa a funcionar sem alteração no hook.
--
-- ON DELETE RESTRICT nas duas, coerente com o schema e com a natureza do dado:
--   • Fatura é registro financeiro/histórico, não uma concessão de acesso
--     descartável — o oposto do caso de user_lojas_permitidas, que é CASCADE.
--     Apagar cliente ou loja não pode apagar faturas em silêncio.
--   • Ambas as colunas são NOT NULL, então SET NULL é impossível aqui.
--   • RESTRICT é o mesmo ON DELETE que a migration 20251012231550 já havia
--     escolhido para estas duas colunas quando elas tiveram FK.
--   • Difere do NO ACTION de faturas_contrato_id_fkey de propósito: contrato_id
--     é nullable e opcional; cliente_id e loja_id são a identidade da fatura.
--
-- Integridade medida antes de escrever: faturas tem 5 linhas com cliente_id
-- preenchido e 0 órfãs. O bloco abaixo revalida cliente_id E loja_id no momento
-- da aplicação e aborta se algo mudou.
-- ============================================================

DO $$
DECLARE
  v_orfas_cliente integer;
  v_orfas_loja    integer;
BEGIN
  SELECT count(*)
  INTO v_orfas_cliente
  FROM public.faturas f
  WHERE NOT EXISTS (
    SELECT 1 FROM public.clientes c WHERE c.id = f.cliente_id
  );

  IF v_orfas_cliente > 0 THEN
    RAISE EXCEPTION
      'Abortado: % linha(s) em faturas com cliente_id inexistente. Limpe os órfãos antes de criar a FK.',
      v_orfas_cliente;
  END IF;

  SELECT count(*)
  INTO v_orfas_loja
  FROM public.faturas f
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lojas l WHERE l.id = f.loja_id
  );

  IF v_orfas_loja > 0 THEN
    RAISE EXCEPTION
      'Abortado: % linha(s) em faturas com loja_id inexistente. Limpe os órfãos antes de criar a FK.',
      v_orfas_loja;
  END IF;
END $$;

ALTER TABLE public.faturas
  DROP CONSTRAINT IF EXISTS faturas_cliente_id_fkey;

ALTER TABLE public.faturas
  ADD CONSTRAINT faturas_cliente_id_fkey
  FOREIGN KEY (cliente_id)
  REFERENCES public.clientes(id)
  ON DELETE RESTRICT;

ALTER TABLE public.faturas
  DROP CONSTRAINT IF EXISTS faturas_loja_id_fkey;

ALTER TABLE public.faturas
  ADD CONSTRAINT faturas_loja_id_fkey
  FOREIGN KEY (loja_id)
  REFERENCES public.lojas(id)
  ON DELETE RESTRICT;

-- Os índices de apoio à checagem da FK no DELETE já existem desde
-- 20260101043357_create_faturas.sql (idx_faturas_cliente, idx_faturas_loja),
-- então nada a criar aqui.

COMMENT ON CONSTRAINT faturas_cliente_id_fkey ON public.faturas IS
  'Garante integridade referencial com clientes e habilita o embed clientes(...) via PostgREST (corrige PGRST200 na aba Faturamento). RESTRICT: fatura é registro financeiro, apagar o cliente não pode apagá-la.';

COMMENT ON CONSTRAINT faturas_loja_id_fkey ON public.faturas IS
  'Garante integridade referencial com lojas e habilita o embed lojas(...) via PostgREST. RESTRICT: fatura é registro financeiro, apagar a loja não pode apagá-la.';
