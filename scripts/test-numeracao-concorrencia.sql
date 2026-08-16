-- =============================================================================
-- RELAY 26 — Teste de CONCORRÊNCIA REAL da numeração
--
-- Por que este arquivo existe separado do pgTAP: pgTAP roda tudo numa transação
-- única, e concorrência exige DUAS sessões simultâneas disputando a mesma linha
-- de contador. Um teste em sessão única não prova bloqueio nenhum.
--
-- COMO RODAR (contra Postgres local — NUNCA produção):
--
--   # 1. Sobe o banco local com as migrations aplicadas
--   supabase db reset
--
--   # 2. Dispara N clientes concorrentes com pgbench (2 conexões, 200 transações)
--   pgbench -n -c 2 -j 2 -t 100 \
--     -f scripts/test-numeracao-concorrencia.sql \
--     "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
--
--   # 3. Confere o resultado (query no rodapé deste arquivo)
--
-- CRITÉRIO DE APROVAÇÃO: 200 inserts concorrentes na MESMA loja produzem 200
-- números DISTINTOS e CONTÍGUOS de 1 a 200, sem buraco e sem repetição.
--
-- Se o desenho estivesse errado (SELECT-depois-UPDATE em vez de UPDATE atômico),
-- este teste falharia com números repetidos — que é exatamente o modo de falha
-- que o contador dedicado existe para evitar.
-- =============================================================================

-- Cada transação do pgbench insere um título omitindo numero.
-- O trigger BEFORE INSERT resolve o número; o ON CONFLICT DO UPDATE serializa
-- as duas conexões na linha do contador.
INSERT INTO public.titulos (loja_id, cliente_id, vencimento, valor)
SELECT
  l.id,
  (SELECT id FROM public.clientes LIMIT 1),
  now() + interval '30 days',
  100
FROM public.lojas l
WHERE l.codigo = '001';

-- =============================================================================
-- VERIFICAÇÃO — rode depois do pgbench:
--
--   SELECT
--     count(*)                                   AS total_inserido,
--     count(DISTINCT numero)                     AS numeros_distintos,
--     min(numero)                                AS primeiro,
--     max(numero)                                AS ultimo
--   FROM public.titulos
--   WHERE numero LIKE 'TIT-001-%';
--
-- Esperado: total_inserido = numeros_distintos (nenhuma repetição).
--
-- Para achar duplicatas explicitamente (deve voltar VAZIO):
--
--   SELECT numero, count(*)
--   FROM public.titulos
--   WHERE numero LIKE 'TIT-001-%'
--   GROUP BY numero
--   HAVING count(*) > 1;
--
-- Para confirmar contiguidade — sem buracos na sequência (deve voltar VAZIO):
--
--   WITH seq AS (
--     SELECT (regexp_replace(numero, '^TIT-001-', ''))::int AS n
--     FROM public.titulos WHERE numero LIKE 'TIT-001-%'
--   )
--   SELECT g AS faltando
--   FROM generate_series((SELECT min(n) FROM seq), (SELECT max(n) FROM seq)) g
--   WHERE g NOT IN (SELECT n FROM seq);
--
-- E que as outras lojas não foram afetadas:
--
--   SELECT tipo, ultimo_numero FROM public.numeracao_contadores c
--   JOIN public.lojas l ON l.id = c.loja_id WHERE l.codigo <> '001';
-- =============================================================================
