-- RELAY 70 — ANTI-DUPLICIDADE DE NOTA FISCAL EM titulos_pagar
--
-- O QUE ESTA MIGRATION RESOLVE
-- A proteção anti-duplicidade do módulo de contas a pagar não era fraca: ela
-- nunca existiu. No código, `updateDupIndex` estava importado no
-- NovoTituloDrawer e nunca era chamado; `localStorage['titulosPagar']`, que o
-- `dupSearch` lia para comparar, nunca era escrito por nenhum código do repo.
-- Resultado: `dupSearch` percorria um índice vazio contra uma lista vazia e
-- devolvia [] em toda execução. O DuplicityReviewModal — 379 linhas, com
-- alçada por valor, justificativa obrigatória e comparação lado a lado —
-- nunca abriu uma única vez em produção.
--
-- Além disso não havia ONDE guardar o dado: titulos_pagar tem 16 colunas e
-- nenhuma delas é doc_tipo, doc_numero ou chave_fiscal_44. O formulário
-- coletava os três campos e `montarTituloParaInsert` os espremia em `numero`
-- como texto ("NF 456"), perdendo a chave fiscal inteira.
--
-- POR QUE NO BANCO E NÃO NO CLIENTE
-- Checagem no cliente é contornável: recarregar a página, outro navegador,
-- outra máquina, dois usuários simultâneos. Duas lojas lançando a mesma nota
-- nunca se veriam. Índice único é a única forma de a regra valer para todo
-- caminho de escrita, inclusive os que ainda não existem.
--
-- ============================================================================
-- POR QUE VALOR E EMISSÃO FICAM FORA DA CHAVE
-- ============================================================================
-- Este é o ponto mais fino do desenho, e é contraintuitivo.
--
-- O fingerprint antigo (`fpExact`) era fornecedor + tipo + número + VALOR. Pôr
-- o valor na chave parece tornar a regra mais precisa. Na verdade abre a porta
-- exata que a regra existe para fechar:
--
--   O operador lança a nota 12345 de R$ 1.500,00. Semanas depois, sem lembrar,
--   lança de novo e digita R$ 1.500,01. Com valor na chave, as duas chaves são
--   diferentes, a constraint não dispara, e a duplicata entra. O erro de
--   digitação — precisamente o que causa o lançamento repetido — vira o
--   mecanismo de bypass.
--
-- Mesmo raciocínio para a data de emissão: quem redigita a nota erra a data
-- com a mesma facilidade, e cada erro cria uma chave nova.
--
-- Valor e emissão continuam úteis, mas do outro lado da fronteira: como SINAL
-- DE ALERTA na tela (mesmo fornecedor, mesmo valor, mesma emissão, documento
-- diferente), nunca como componente de chave única.
--
-- ============================================================================
-- ESCOPO: GLOBAL, NÃO POR LOJA
-- ============================================================================
-- Nenhum dos dois índices inclui loja_id, e isso é deliberado. Uma NF é
-- emitida contra um destinatário e pertence a um título; a mesma nota lançada
-- na loja 001 e de novo na 002 é exatamente o cenário que motivou este relay
-- ("numa locadora com 4 lojas, é a diferença entre pagar um fornecedor uma vez
-- ou duas"). Se as lojas têm CNPJs distintos, elas recebem notas com chaves
-- distintas e a unicidade global nunca gera falso positivo. Se compartilham
-- CNPJ, com mais razão ainda é duplicata.
--
-- Rateio (uma nota de energia dividida entre lojas) não é exceção a isto: seria
-- UM título com centro de custo dividido, não dois títulos. E não existe rateio
-- no schema — titulos_pagar.loja_id é singular.
--
-- ============================================================================
-- SEM ESCAPE: O "FORÇAR MESMO ASSIM" SAI
-- ============================================================================
-- Os índices são UNIQUE duros, sem cláusula de exceção. Não há coluna de
-- justificativa que retire uma linha do índice, e o botão "Forçar Mesmo
-- Assim" é removido da tela no mesmo PR — botão que promete o que a constraint
-- não permite é pior que botão nenhum.
--
-- A alçada que existia (`canForceDuplicity`) devolvia true incondicional para
-- admin e lia o perfil como string solta, fora do useRbac. Era o escape mais
-- permissivo do sistema apoiado na peça menos confiável dele. E o cenário em
-- que o forçar seria acionado — fim do mês, fornecedor cobrando, pressa — é o
-- cenário em que ninguém avalia: só desbloqueia.
--
-- Custo de errar é assimétrico e favorece a constraint: UNIQUE barrando um
-- lançamento legítimo é um chamado, resolvido numa migration de uma linha.
-- Duplicata passando é dinheiro que saiu.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. COLUNAS
-- ---------------------------------------------------------------------------
-- Os três campos já eram coletados pelo formulário desde antes do relay 61 —
-- eram os "campos fantasma" que ficaram no drawer justamente à espera deste
-- momento. Todos nullable: despesa sem documento (reembolso, ajuste interno)
-- tem que continuar sendo lançável.
ALTER TABLE public.titulos_pagar
  ADD COLUMN IF NOT EXISTS doc_tipo        text,
  ADD COLUMN IF NOT EXISTS doc_numero      text,
  ADD COLUMN IF NOT EXISTS chave_fiscal_44 text;

COMMENT ON COLUMN public.titulos_pagar.doc_tipo IS
  'Tipo do documento fiscal: NF, NFS, Boleto, Outro. Compoe a chave de duplicidade.';
COMMENT ON COLUMN public.titulos_pagar.doc_numero IS
  'Numero do documento como digitado. A comparacao usa a forma normalizada (upper, so alfanumerico) - ver idx_titulos_pagar_documento_unico.';
COMMENT ON COLUMN public.titulos_pagar.chave_fiscal_44 IS
  'Chave de acesso da NF-e, 44 digitos. Identificador unico nacional: contem CNPJ do emitente, modelo, serie e numero.';

-- ---------------------------------------------------------------------------
-- 2. ÍNDICE 1 — CHAVE FISCAL
-- ---------------------------------------------------------------------------
-- Único global. A chave já contém o CNPJ do emitente, então fornecedor_id
-- seria redundante no índice.
--
-- O guard de 44 dígitos impede indexar chave meio digitada: um prefixo
-- indexado colidiria com outra nota cuja digitação parou no mesmo ponto,
-- bloqueando um lançamento legítimo. `length(...) = 44` sobre a forma
-- só-dígitos reproduz o guard que o cliente já aplica em
-- `chaveFiscalIndexavel`.
CREATE UNIQUE INDEX IF NOT EXISTS idx_titulos_pagar_chave_fiscal_unica
  ON public.titulos_pagar (regexp_replace(chave_fiscal_44, '[^0-9]', '', 'g'))
  WHERE chave_fiscal_44 IS NOT NULL
    AND length(regexp_replace(chave_fiscal_44, '[^0-9]', '', 'g')) = 44;

COMMENT ON INDEX public.idx_titulos_pagar_chave_fiscal_unica IS
  'RELAY 70: a mesma NF-e nao pode ser lancada duas vezes, nem em lojas diferentes. Compara so os digitos.';

-- ---------------------------------------------------------------------------
-- 3. ÍNDICE 2 — FORNECEDOR + TIPO + NÚMERO
-- ---------------------------------------------------------------------------
-- Para a despesa sem NF-e: boleto de aluguel, recibo, fatura de serviço.
--
-- A ORDEM DAS OPERAÇÕES É PARTE DA REGRA, NÃO ESTILO.
-- É `regexp_replace(upper(x), '[^A-Z0-9]', ...)` — upper PRIMEIRO, filtro
-- depois — para reproduzir `normalizeDocNumber` do cliente, que faz
-- `.toUpperCase().replace(/[^A-Z0-9]/g,'')` nessa ordem.
--
-- Medido: na ordem inversa (`upper(regexp_replace(x,'[^A-Za-z0-9]',...))`) as
-- duas divergem. O eszett e a ligadura "fi" são descartados pelo filtro antes
-- de o upper poder expandi-los para SS e FI, enquanto o cliente, que faz upper
-- primeiro, os conserva. Divergência entre as duas normalizações é o pior modo
-- de falha possível aqui: a tela diz "sem duplicidade" e o insert é recusado
-- com 23505 depois do formulário inteiro preenchido. O teste
-- src/lib/__tests__/anti-duplicidade.test.ts compara as duas caractere a
-- caractere, incluindo esses casos.
--
-- fornecedor_id entra na chave porque numeração de nota é sequencial POR
-- emitente: dois fornecedores emitem "NF 1" no primeiro dia de operação de
-- cada um. doc_tipo entra porque Boleto 123 e NF 123 do mesmo fornecedor são
-- documentos distintos.
--
-- Sobre o WHERE parcial: em Postgres dois NULL nunca são iguais num índice
-- único, então título sem documento já não colidiria. O WHERE existe para a
-- string VAZIA, que não é NULL e colidiria consigo mesma — bloqueando o
-- segundo lançamento sem documento do mesmo fornecedor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_titulos_pagar_documento_unico
  ON public.titulos_pagar (
    fornecedor_id,
    doc_tipo,
    regexp_replace(upper(doc_numero), '[^A-Z0-9]', '', 'g')
  )
  WHERE doc_numero IS NOT NULL
    AND regexp_replace(upper(doc_numero), '[^A-Z0-9]', '', 'g') <> '';

COMMENT ON INDEX public.idx_titulos_pagar_documento_unico IS
  'RELAY 70: mesmo fornecedor + tipo + numero nao pode repetir. Valor e emissao ficam FORA da chave de proposito: inclui-los faria um erro de digitacao de centavo virar bypass da protecao.';

COMMIT;

-- ============================================================================
-- ALCANCE RETROATIVO
-- ============================================================================
-- O índice único vale contra TODAS as linhas da tabela, não só as novas — não
-- existe passo de "reindexar o histórico". É a diferença central entre este
-- desenho e o índice manual em localStorage que ele substitui.
--
-- A ressalva não é sobre datas, é sobre preenchimento: título com doc_numero e
-- chave_fiscal_44 nulos fica fora dos dois índices parciais e não protege nada.
-- Hoje isso vale para 1 título (o único existente), o que é irrelevante. MAS se
-- a locadora importar histórico, a rotina de importação PRECISA preencher
-- doc_numero e chave_fiscal_44, senão anos de notas entram invisíveis para a
-- checagem. Registrado aqui porque quem escrever a importação vai ler esta
-- migration antes de escrever o INSERT.
--
-- Recuperação parcial, se um dia for preciso: `numero` guarda o texto no
-- formato "NF 123456", do qual dá para extrair tipo e número por split. O dado
-- não está perdido, só está no lugar errado.
