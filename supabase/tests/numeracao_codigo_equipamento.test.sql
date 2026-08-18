-- =============================================================================
-- RELAY 41 / item 9.12 — Testes do código de patrimônio server-side
--
-- COMO RODAR (contra um banco REAL, nunca produção):
--   supabase db reset            # aplica todas as migrations num Postgres local
--   supabase test db             # executa este arquivo via pgTAP
--
-- Requer a extensão pgtap. Se ainda não estiver habilitada no ambiente de teste:
--   CREATE EXTENSION IF NOT EXISTS pgtap;
--
-- Cobre o que o Math.random() do cliente não garantia: unicidade determinística,
-- formato curto para etiqueta física, e preservação intacta de titulo/fatura.
-- =============================================================================

BEGIN;
SELECT plan(18);

-- -----------------------------------------------------------------------------
-- Fixtures: duas lojas com códigos distintos + grupo e modelo para equipamentos
-- -----------------------------------------------------------------------------
INSERT INTO public.lojas (id, codigo, nome)
VALUES
  ('aaaaaaaa-0000-4000-8000-000000000011', '911', 'Loja Equip Um'),
  ('aaaaaaaa-0000-4000-8000-000000000012', '912', 'Loja Equip Dois');

INSERT INTO public.grupos_equipamentos (id, nome)
VALUES ('cccccccc-0000-4000-8000-000000000001', 'Betoneira Teste');

INSERT INTO public.modelos_equipamentos (id, grupo_id, nome_comercial)
VALUES ('dddddddd-0000-4000-8000-000000000001',
        'cccccccc-0000-4000-8000-000000000001', 'Betoneira 400L Teste');

-- =============================================================================
-- 1. CHECK DE TIPO — 'equipamento' aceito, tipo desconhecido segue rejeitado
-- =============================================================================
SELECT lives_ok(
  $$INSERT INTO public.numeracao_contadores (loja_id, tipo, ultimo_numero)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000011', 'equipamento', 0)
    ON CONFLICT (loja_id, tipo) DO NOTHING$$,
  'CHECK aceita o tipo equipamento'
);

SELECT throws_ok(
  $$INSERT INTO public.numeracao_contadores (loja_id, tipo, ultimo_numero)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000011', 'contrato', 0)$$,
  '23514',
  NULL,
  'CHECK continua rejeitando tipo fora de (titulo, fatura, equipamento)'
);

-- =============================================================================
-- 2. FORMATO — EQ-{lojas.codigo}-{seq:4}, 11 chars para caber na etiqueta
-- =============================================================================
SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'equipamento'),
  'EQ-911-0001',
  'primeiro equipamento da loja segue EQ-{codigo}-{seq:4}'
);

SELECT is(
  length(public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'equipamento')),
  11,
  'código tem 11 caracteres — curto e legível para identificação física'
);

-- Esta é a asserção que pega o LPAD fixo em 6: se a largura não variar por tipo,
-- sai EQ-911-000003 (13 chars) em vez de EQ-911-0003.
SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'equipamento'),
  'EQ-911-0003',
  'sequencial usa 4 dígitos, não os 6 de titulo/fatura'
);

-- =============================================================================
-- 3. TITULO E FATURA PRESERVADOS EXATAMENTE COMO ESTAVAM
-- =============================================================================
SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'titulo'),
  'TIT-911-000001',
  'titulo mantém prefixo TIT e sequencial de 6 dígitos'
);

SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'fatura'),
  'FAT-911-000001',
  'fatura mantém prefixo FAT e sequencial de 6 dígitos'
);

SELECT is(
  length(public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'titulo')),
  14,
  'titulo continua com 14 chars — cabe no seuNumero do Inter'
);

-- =============================================================================
-- 4. CONTADORES INDEPENDENTES — por tipo e por loja
-- =============================================================================
SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000012', 'equipamento'),
  'EQ-912-0001',
  'loja nova começa em 1, não herda a sequência da outra loja'
);

SELECT is(
  public.proximo_numero_documento('aaaaaaaa-0000-4000-8000-000000000011', 'equipamento'),
  'EQ-911-0004',
  'contador de equipamento não é afetado por titulo/fatura da mesma loja'
);

-- =============================================================================
-- 5. TIPO INVÁLIDO E LOJA AUSENTE
-- =============================================================================
SELECT throws_ok(
  $$SELECT public.proximo_numero_documento(
      'aaaaaaaa-0000-4000-8000-000000000011', 'patrimonio')$$,
  '22023',
  NULL,
  'tipo desconhecido levanta 22023 em vez de gerar código sem prefixo'
);

SELECT throws_ok(
  $$SELECT public.proximo_numero_documento(NULL, 'equipamento')$$,
  '23502',
  NULL,
  'loja_id nulo levanta 23502'
);

-- Guarda dos 3 dígitos preservada da 168
INSERT INTO public.lojas (id, codigo, nome)
VALUES ('aaaaaaaa-0000-4000-8000-000000000013', 'Filial Centro', 'Loja Codigo Ruim');

SELECT throws_ok(
  $$SELECT public.proximo_numero_documento(
      'aaaaaaaa-0000-4000-8000-000000000013', 'equipamento')$$,
  '22023',
  NULL,
  'lojas.codigo sem 3 dígitos falha em vez de gerar código malformado'
);

-- =============================================================================
-- 6. MONOTONICIDADE — o que o Math.random() não garantia
-- =============================================================================
SELECT is(
  (SELECT count(DISTINCT n) FROM (
     SELECT public.proximo_numero_documento(
       'aaaaaaaa-0000-4000-8000-000000000012', 'equipamento') AS n
     FROM generate_series(1, 50)
   ) s),
  50::bigint,
  '50 chamadas seguidas geram 50 códigos distintos (sem colisão)'
);

-- =============================================================================
-- 7. TRIGGER — preenche quando vazio/nulo, RESPEITA quando informado
-- =============================================================================
SELECT has_trigger(
  'public', 'equipamentos', 'trg_num_equipamento',
  'trigger de numeração existe em equipamentos'
);

-- Omitindo codigo_interno: o DEFAULT '' passa o NOT NULL e o trigger substitui
INSERT INTO public.equipamentos (grupo_id, modelo_id, loja_atual_id, tipo, numero_serie)
VALUES ('cccccccc-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000001',
        'aaaaaaaa-0000-4000-8000-000000000011', 'SERIALIZADO', 'S-001');

SELECT matches(
  (SELECT codigo_interno FROM public.equipamentos WHERE numero_serie = 'S-001'),
  '^EQ-911-[0-9]{4}$',
  'insert sem codigo_interno é preenchido pelo trigger'
);

-- String vazia explícita também é substituída
INSERT INTO public.equipamentos (grupo_id, modelo_id, loja_atual_id, tipo, numero_serie, codigo_interno)
VALUES ('cccccccc-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000001',
        'aaaaaaaa-0000-4000-8000-000000000011', 'SERIALIZADO', 'S-002', '   ');

SELECT matches(
  (SELECT codigo_interno FROM public.equipamentos WHERE numero_serie = 'S-002'),
  '^EQ-911-[0-9]{4}$',
  'codigo_interno em branco é substituído pelo trigger'
);

-- Valor informado é preservado: import de legado / etiqueta física já existente
INSERT INTO public.equipamentos (grupo_id, modelo_id, loja_atual_id, tipo, numero_serie, codigo_interno)
VALUES ('cccccccc-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000001',
        'aaaaaaaa-0000-4000-8000-000000000011', 'SERIALIZADO', 'S-003', 'LA252028090');

SELECT is(
  (SELECT codigo_interno FROM public.equipamentos WHERE numero_serie = 'S-003'),
  'LA252028090',
  'codigo_interno informado é respeitado (legado não é renumerado)'
);

-- Dois inserts consecutivos não colidem no UNIQUE
INSERT INTO public.equipamentos (grupo_id, modelo_id, loja_atual_id, tipo, numero_serie)
VALUES ('cccccccc-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000001',
        'aaaaaaaa-0000-4000-8000-000000000011', 'SERIALIZADO', 'S-004');

SELECT is(
  (SELECT count(DISTINCT codigo_interno) FROM public.equipamentos
   WHERE numero_serie IN ('S-001', 'S-002', 'S-004')),
  3::bigint,
  'inserts consecutivos geram códigos distintos (sem 23505)'
);

SELECT * FROM finish();
ROLLBACK;
