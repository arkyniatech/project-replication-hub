-- =============================================================================
-- RELAY 26 — Numeração server-side de títulos e faturas
--
-- Formato: TIT-{lojas.codigo}-{seq:6}  ->  TIT-001-000042  (14 chars)
--          FAT-{lojas.codigo}-{seq:6}  ->  FAT-001-000042
--
-- Decisões de desenho (ver PR):
--  * Contador DEDICADO. Nunca MAX() sobre o que já está gravado: os números
--    legados (TIT-2026-00002, "LOC-2026-00007/1", ".../ENC") extraem dígitos
--    espúrios e travariam a sequência nova logo no primeiro insert.
--  * Atômico via UPDATE ... RETURNING. O UPDATE trava a linha do contador, então
--    dois inserts concorrentes na mesma loja enfileiram. Nada de SELECT+UPDATE.
--  * numero é NOT NULL sem default nas duas tabelas. Damos DEFAULT '' e o trigger
--    substitui quando vier vazio ou nulo — mesmo padrão do trigger de Compras.
--    Não derrubamos o NOT NULL: manteria a porta aberta para título sem número
--    escapar por algum caminho não mapeado.
--  * Número já preenchido é RESPEITADO. É isso que mantém a numeração relacional
--    deliberada funcionando sem mudança: "{contrato}/1", "{contrato}/ENC" e as
--    faturas reusadas em CobrancaUnicaModal herdam integridade do contrato pai,
--    que já tem UNIQUE (loja_id, numero).
--  * SEM constraint UNIQUE em titulos.numero / faturas.numero nesta migration.
--    Existem 2 títulos duplicados legados; a constraint abortaria. Renumerar está
--    vetado (numero vira seuNumero no boleto do Inter). Fica para relay futuro,
--    depois de o dono decidir o que fazer com o legado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela de contadores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.numeracao_contadores (
  loja_id       uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo          text NOT NULL,
  ultimo_numero integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT numeracao_contadores_pkey PRIMARY KEY (loja_id, tipo),
  CONSTRAINT numeracao_contadores_tipo_check CHECK (tipo IN ('titulo', 'fatura')),
  CONSTRAINT numeracao_contadores_ultimo_numero_check CHECK (ultimo_numero >= 0)
);

COMMENT ON TABLE public.numeracao_contadores IS
  'Contador dedicado por (loja, tipo) para numeração de títulos e faturas. '
  'Deliberadamente NÃO deriva de MAX() sobre os dados gravados — os números '
  'legados corrompem a extração de dígitos. Ver RELAY 26.';

-- -----------------------------------------------------------------------------
-- 2. Função atômica: incrementa e devolve o próximo
--
-- INSERT ... ON CONFLICT DO UPDATE resolve numa instrução só os dois casos:
-- contador inexistente (cria já em 1) e contador existente (incrementa).
-- O ON CONFLICT trava a linha conflitante, serializando concorrentes na mesma
-- loja. Não há janela entre ler e escrever.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proximo_numero_documento(
  p_loja_id uuid,
  p_tipo    text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq     integer;
  v_codigo  text;
  v_prefixo text;
BEGIN
  IF p_loja_id IS NULL THEN
    RAISE EXCEPTION 'numeracao: loja_id é obrigatório para gerar número de %', p_tipo
      USING ERRCODE = '23502';
  END IF;

  v_prefixo := CASE p_tipo
                 WHEN 'titulo' THEN 'TIT'
                 WHEN 'fatura' THEN 'FAT'
               END;

  IF v_prefixo IS NULL THEN
    RAISE EXCEPTION 'numeracao: tipo inválido "%" (esperado titulo ou fatura)', p_tipo
      USING ERRCODE = '22023';
  END IF;

  -- codigo é TEXT NOT NULL UNIQUE e já vem com 3 dígitos ('001'..'004'),
  -- então não aplicamos LPAD. codigo_numerico está NULL em todas as linhas e
  -- por isso NÃO é usado como fonte.
  SELECT codigo INTO v_codigo FROM public.lojas WHERE id = p_loja_id;

  IF v_codigo IS NULL THEN
    RAISE EXCEPTION 'numeracao: loja % não encontrada', p_loja_id
      USING ERRCODE = '23503';
  END IF;

  -- O formato de 14 chars depende de codigo ter exatamente 3 dígitos, mas nada
  -- no schema garante isso: lojas.codigo é TEXT livre, e o seed original usava
  -- 'loja-1'. Uma loja nova cadastrada como 'Filial Centro' geraria
  -- TIT-Filial Centro-000001, que estoura o seuNumero do boleto do Inter.
  -- Falhar aqui é melhor que emitir boleto com número inválido.
  IF v_codigo !~ '^[0-9]{3}$' THEN
    RAISE EXCEPTION
      'numeracao: lojas.codigo "%" não tem 3 dígitos — número excederia o seuNumero do Inter', v_codigo
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.numeracao_contadores (loja_id, tipo, ultimo_numero)
  VALUES (p_loja_id, p_tipo, 1)
  ON CONFLICT (loja_id, tipo) DO UPDATE
    SET ultimo_numero = public.numeracao_contadores.ultimo_numero + 1,
        updated_at    = now()
  RETURNING ultimo_numero INTO v_seq;

  RETURN v_prefixo || '-' || v_codigo || '-' || LPAD(v_seq::text, 6, '0');
END;
$$;

COMMENT ON FUNCTION public.proximo_numero_documento(uuid, text) IS
  'Devolve o próximo número de documento no formato PREFIXO-{lojas.codigo}-{seq:6}. '
  'Atômico: o ON CONFLICT DO UPDATE trava a linha do contador.';

-- -----------------------------------------------------------------------------
-- 3. Trigger BEFORE INSERT — preenche numero só quando vier vazio ou nulo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_gerar_numero_documento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Número preenchido é respeitado. Preserva a numeração relacional
  -- ("{contrato}/1", "{contrato}/ENC", fatura reusada) e qualquer import legado.
  IF NEW.numero IS NULL OR btrim(NEW.numero) = '' THEN
    NEW.numero := public.proximo_numero_documento(NEW.loja_id, TG_ARGV[0]);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_gerar_numero_documento() IS
  'Trigger BEFORE INSERT. Preenche numero via proximo_numero_documento quando o '
  'valor vier nulo ou vazio; respeita valor já informado. TG_ARGV[0] = tipo.';

-- -----------------------------------------------------------------------------
-- 4. DEFAULT '' + attach dos triggers
--
-- numero é NOT NULL nas duas tabelas e não tem default. O DEFAULT '' permite que
-- o cliente omita a coluna: o valor vazio passa o NOT NULL e o BEFORE INSERT
-- substitui antes de a linha ser gravada.
-- -----------------------------------------------------------------------------
ALTER TABLE public.titulos ALTER COLUMN numero SET DEFAULT '';
ALTER TABLE public.faturas ALTER COLUMN numero SET DEFAULT '';

-- ORDEM DE DISPARO É LOAD-BEARING: o Postgres dispara triggers do mesmo evento
-- em ordem ALFABÉTICA por nome. 'trg_demo_readonly' < 'trg_num_*', então o
-- bloqueio de demo roda ANTES e aborta sem queimar número do contador.
-- Renomear estes triggers para algo que ordene antes de 'trg_demo_readonly'
-- (ex.: 'trg_gerar_numero') faria usuário demo consumir numeração real.
DROP TRIGGER IF EXISTS trg_num_titulo ON public.titulos;
CREATE TRIGGER trg_num_titulo
  BEFORE INSERT ON public.titulos
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_documento('titulo');

DROP TRIGGER IF EXISTS trg_num_fatura ON public.faturas;
CREATE TRIGGER trg_num_fatura
  BEFORE INSERT ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_documento('fatura');

-- -----------------------------------------------------------------------------
-- 5. Semear as lojas em ZERO
--
-- Zero, não MAX(). Os números legados convivem com a sequência nova: têm formato
-- distinto (TIT-2026-00002 vs TIT-001-000001), então não colidem.
-- ON CONFLICT DO NOTHING mantém a migration idempotente e nunca zera um contador
-- que já andou.
-- -----------------------------------------------------------------------------
INSERT INTO public.numeracao_contadores (loja_id, tipo, ultimo_numero)
SELECT l.id, t.tipo, 0
FROM public.lojas l
CROSS JOIN (VALUES ('titulo'), ('fatura')) AS t(tipo)
ON CONFLICT (loja_id, tipo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. RLS
--
-- A tabela é infraestrutura de numeração: escrita só pelo trigger, que roda como
-- SECURITY DEFINER e portanto ignora RLS. Cliente não escreve direto.
-- -----------------------------------------------------------------------------
ALTER TABLE public.numeracao_contadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contadores de numeração legíveis por autenticados"
  ON public.numeracao_contadores;
CREATE POLICY "Contadores de numeração legíveis por autenticados"
  ON public.numeracao_contadores
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.numeracao_contadores FROM anon, authenticated;

-- NÃO concedemos EXECUTE em proximo_numero_documento para authenticated.
-- O trigger roda como SECURITY DEFINER e não precisa que o chamador tenha o
-- privilégio. Conceder abriria caminho para um usuário queimar numeração de uma
-- loja a que não tem acesso, furando a sequência contígua do contador.
REVOKE ALL ON FUNCTION public.proximo_numero_documento(uuid, text) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Demo somente-leitura
--
-- Obrigatório para tabelas novas — ver cabeçalho de
-- 20260809140000_demo_readonly_triggers.sql: o DO daquela migration já rodou e
-- não alcança tabelas criadas depois. Sem isto, um usuário demo emitindo título
-- atravessaria o SECURITY DEFINER e mexeria no contador real (triggers disparam
-- dentro de SECURITY DEFINER; RLS não).
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_demo_readonly ON public.numeracao_contadores;
CREATE TRIGGER trg_demo_readonly
  BEFORE INSERT OR UPDATE OR DELETE ON public.numeracao_contadores
  FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_demo();
