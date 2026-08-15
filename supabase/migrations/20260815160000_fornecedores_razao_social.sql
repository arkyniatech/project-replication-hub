-- ============================================================
-- Restaura a coluna razao_social em fornecedores
--
-- A coluna existia na criacao original da tabela
-- (20251014154838, "razao_social TEXT") e foi perdida quando a
-- tabela foi recriada em 20260214005930 sem ela. A ausencia e
-- residuo dessa recriacao, nao decisao de produto: o
-- FornecedorForm sempre enviou o campo, o que fazia o PostgREST
-- rejeitar o insert com PGRST204 (coluna desconhecida).
--
-- NULLABLE de proposito: fornecedor pessoa fisica (tipo = 'PF',
-- identificado por cpf) nao possui razao social. NOT NULL
-- quebraria esse caso.
--
-- Tipo text seguindo a convencao das demais tabelas do schema
-- que ja possuem a coluna (clientes, lojas, config_organizacao).
-- ============================================================

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS razao_social text;

COMMENT ON COLUMN public.fornecedores.razao_social IS
  'Razao social do fornecedor PJ (nome juridico usado em nota fiscal). Nulo para fornecedor pessoa fisica.';
