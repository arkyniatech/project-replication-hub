-- =============================================================================
-- RELAY 26 — Testes da numeração de títulos e faturas
--
-- COMO RODAR (contra um banco REAL, nunca produção):
--   supabase db reset            # aplica todas as migrations num Postgres local
--   supabase test db             # executa este arquivo via pgTAP
--
-- Requer a extensão pgtap. Se ainda não estiver habilitada no ambiente de teste:
--   CREATE EXTENSION IF NOT EXISTS pgtap;
--
-- NOTA SOBRE O TESTE DE CONCORRÊNCIA (T4): concorrência real exige DUAS sessões
-- simultâneas. pgTAP roda numa transação só, então o teste aqui prova o que dá
-- para provar em sessão única — que o contador é monotônico e não repete sob
-- N incrementos seguidos. O bloqueio real de linha é exercitado pelo script
-- companheiro scripts/test-numeracao-concorrencia.sql, que abre duas conexões.
-- =============================================================================

BEGIN;
SELECT plan(14);

-- -----------------------------------------------------------------------------
-- Fixtures: duas lojas com códigos distintos
-- -----------------------------------------------------------------------------
INSERT INTO public.lojas (id, codigo, nome)
VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'T01', 'Loja Teste Um'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'T02', 'Loja Teste Dois');

INSERT INTO public.clientes (id, nome)
VALUES ('bbbbbbbb-0000-4000-8000-000000000001', 'Cliente Teste');

-- =============================================================================
-- 1. ESTRUTURA
-- =============================================================================
SELECT has_table('public', 'numeracao_contadores', 'tabela de contadores existe');

SELECT col_is_pk(
  'public', 'numeracao_contadores', ARRAY['loja_id', 'tipo'],
  'PK composta (loja_id, tipo)'
);

-- CHECK restringe tipo a titulo/fatura
SELECT throws_ok(
  $$INSERT INTO public.numeracao_contadores (loja_id, tipo, ultimo_numero)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'contrato', 0)$$,
  '23514',
  NULL,
  'CHECK rejeita tipo fora de (titulo, fatura)'
);

-- =============================================================================
-- 2. FORMATO
-- =============================================================================
SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000001', 'titulo'),
  'TIT-T01-000001',
  'primeiro título da loja segue TIT-{codigo}-{seq:6}'
);

SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000001', 'fatura'),
  'FAT-T01-000001',
  'fatura usa prefixo FAT e contador próprio (independente de titulo)'
);

SELECT is(
  length(public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000001', 'titulo')),
  14,
  'número tem 14 caracteres — cabe no seuNumero do Inter'
);

-- =============================================================================
-- 3. SEQUÊNCIAS INDEPENDENTES POR LOJA
-- =============================================================================
SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000002', 'titulo'),
  'TIT-T02-000001',
  'loja nova começa em 1, não herda a sequência da outra loja'
);

SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000001', 'titulo'),
  'TIT-T01-000004',
  'loja 1 continua a própria sequência sem ser afetada pela loja 2'
);

-- =============================================================================
-- 4. MONOTONICIDADE — nenhum número repetido sob N incrementos
-- =============================================================================
SELECT is(
  (SELECT count(DISTINCT n) FROM (
     SELECT public.proximo_numero_documento(
       'aaaaaaaa-0000-4000-8000-000000000002', 'titulo') AS n
     FROM generate_series(1, 50)
   ) s),
  50::bigint,
  '50 chamadas seguidas geram 50 números distintos (sem repetição)'
);

-- =============================================================================
-- 5. CONTADOR INEXISTENTE É CRIADO NA PRIMEIRA EMISSÃO
-- =============================================================================
INSERT INTO public.lojas (id, codigo, nome)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'T03', 'Loja Sem Contador');

DELETE FROM public.numeracao_contadores
WHERE loja_id = 'aaaaaaaa-0000-4000-8000-000000000003';

SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000003', 'titulo'),
  'TIT-T03-000001',
  'contador inexistente é criado na primeira emissão (ON CONFLICT cobre os 2 casos)'
);

-- =============================================================================
-- 6. TRIGGER — preenche quando vazio, RESPEITA quando preenchido
-- =============================================================================
INSERT INTO public.titulos (loja_id, cliente_id, vencimento, valor)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001',
        'bbbbbbbb-0000-4000-8000-000000000001', now(), 100);

SELECT matches(
  (SELECT numero FROM public.titulos
   WHERE loja_id = 'aaaaaaaa-0000-4000-8000-000000000001'
   ORDER BY created_at DESC LIMIT 1),
  '^TIT-T01-\d{6}$',
  'insert omitindo numero recebe número do trigger (DEFAULT '''' + BEFORE INSERT)'
);

-- Numeração relacional deliberada: "{contrato}/1", "{contrato}/ENC", fatura reusada
INSERT INTO public.titulos (loja_id, cliente_id, vencimento, valor, numero)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001',
        'bbbbbbbb-0000-4000-8000-000000000001', now(), 100, 'LOC-2026-00007/ENC');

SELECT is(
  (SELECT numero FROM public.titulos WHERE numero = 'LOC-2026-00007/ENC'),
  'LOC-2026-00007/ENC',
  'numero preenchido manualmente é RESPEITADO — preserva numeração relacional'
);

-- Fatura pelo mesmo caminho
INSERT INTO public.faturas (loja_id, cliente_id, vencimento, tipo, forma_preferida)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001',
        'bbbbbbbb-0000-4000-8000-000000000001', now(), 'DEMONSTRATIVO', 'PIX');

SELECT matches(
  (SELECT numero FROM public.faturas
   WHERE loja_id = 'aaaaaaaa-0000-4000-8000-000000000001'
   ORDER BY created_at DESC LIMIT 1),
  '^FAT-T01-\d{6}$',
  'faturas também recebem número do trigger'
);

-- =============================================================================
-- 7. NÃO DERIVA DO LEGADO
-- =============================================================================
-- Um título legado com número alto não pode empurrar a sequência nova.
INSERT INTO public.titulos (loja_id, cliente_id, vencimento, valor, numero)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003',
        'bbbbbbbb-0000-4000-8000-000000000001', now(), 100, 'TIT-2026-99999');

SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000003', 'titulo'),
  'TIT-T03-000002',
  'legado TIT-2026-99999 NÃO trava a sequência (contador dedicado, não MAX())'
);

SELECT * FROM finish();
ROLLBACK;
