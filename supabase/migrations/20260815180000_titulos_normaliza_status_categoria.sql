-- ============================================================
-- Normaliza titulos.status e titulos.categoria, trava dominio
--
-- O codigo sempre grava status em maiusculo com underscore
-- (EM_ABERTO, CANCELADO, QUITADO, PARCIAL) e categoria como
-- 'LOCACAO'. A tabela, porem, foi criada com
-- DEFAULT 'ABERTO' (20260214005248) e varios pontos do codigo
-- gravavam literais fora desse padrao:
--   - status 'PENDENTE': FaturamentoCarrinho.tsx (nao usado em
--     nenhum outro lugar do app para titulos)
--   - status 'ABERTO': DevolucaoModal.tsx
--   - categoria 'Locação' acentuada/capitalizada: DevolucaoModal.tsx,
--     CobrancaUnicaModal.tsx, RenovarContratoModal.tsx,
--     EmitirFaturaModal.tsx, NovoContratoV2.tsx,
--     useSupabaseContratos.ts (dois pontos de insercao: titulo de
--     encerramento e o de renovacao/fatura), taxaDeslocamentoService.ts
-- Levantamento feito varrendo TODO .from('titulos').insert(...) do
-- app (nao so grep por 'Locação' literal) — cobre também os casos em
-- que o payload é montado em variavel antes do insert
-- (NovoContratoV2.tsx: tituloRow) e os dois callers do createTitulo
-- generico de useSupabaseTitulos.ts (Renovar/EmitirFatura). Nao ha
-- INSERT em titulos partindo de RPC/função Postgres — toda escrita é
-- client-side. Todos os pontos foram corrigidos neste PR para gravar
-- EM_ABERTO / LOCACAO e serao cobertos pelo UPDATE abaixo para os
-- registros que ja foram gravados errados.
--
-- 'PENDENTE' e tratado como bug do codigo (nao valor legitimo):
-- nenhuma tela ou filtro de titulos reconhece 'PENDENTE' como
-- estado de titulo (contas a receber usa EM_ABERTO/PARCIAL/
-- QUITADO/CANCELADO em todos os filtros), entao alinhamos para
-- EM_ABERTO em vez de incluir no dominio do CHECK.
--
-- subcategoria fica FORA deste CHECK de proposito: o campo
-- mistura convencoes (evento de contrato vs., num ponto,
-- forma de pagamento por bug ja corrigido) e ha registros reais
-- de contrato cujo significado nao esta totalmente mapeado.
-- Ver relay 11 / docs/relay-10-varredura-schema.md.
--
-- Contagem esperada nesta aplicacao (medida no banco em 2026-08-15):
--   UPDATE de status    -> 1 linha (status = 'ABERTO'; 0 em 'PENDENTE' hoje)
--   UPDATE de categoria -> 8 linhas (categoria = 'Locação')
-- ============================================================

-- 1) Normaliza dados existentes antes de travar o dominio
UPDATE public.titulos
SET status = 'EM_ABERTO'
WHERE status IN ('ABERTO', 'PENDENTE');

UPDATE public.titulos
SET categoria = 'LOCACAO'
WHERE categoria = 'Locação';

-- 2) Corrige o default da coluna (estava desalinhado com o
--    dominio real usado pelo codigo desde a criacao da tabela)
ALTER TABLE public.titulos
  ALTER COLUMN status SET DEFAULT 'EM_ABERTO';

-- 3) Trava os dois campos para impedir nova divergencia
ALTER TABLE public.titulos
  ADD CONSTRAINT titulos_status_check
  CHECK (status IN ('EM_ABERTO', 'PARCIAL', 'CANCELADO', 'QUITADO'));

ALTER TABLE public.titulos
  ADD CONSTRAINT titulos_categoria_check
  CHECK (categoria IS NULL OR categoria = 'LOCACAO');
