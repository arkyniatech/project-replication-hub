-- =============================================================================
-- RELAY 41 / item 9.12 — código de patrimônio gerado no servidor.
--
-- PROBLEMA: useSupabaseEquipamentos.ts gerava codigo_interno no cliente com
-- Date.now().slice(-6) + Math.random()*1000 — três dígitos de aleatoriedade,
-- sem checagem contra o banco. equipamentos.codigo_interno é TEXT NOT NULL com
-- UNIQUE (equipamentos_codigo_interno_key), então o banco JÁ protege o dado: uma
-- colisão não grava duplicata, levanta 23505 e o cadastro falha com mensagem
-- crua. O risco não é corromper, é falhar de forma incompreensível.
--
-- SOLUÇÃO: estender numeracao_contadores/proximo_numero_documento (migration
-- 168) em vez de criar um segundo mecanismo. Formato EQ-{lojas.codigo}-{seq:4},
-- 11 chars — codigo_interno é etiqueta física na locadora, precisa ser curto e
-- legível. A loja gravada é a de CADASTRO e nunca muda: renumerar numa
-- transferência quebraria a etiqueta colada na máquina.
--
-- NÃO renumera os equipamentos existentes. Os legados (LA252028090, BE-059,
-- CO-076) têm formatos distintos entre si, convivem com a série nova e ficam
-- exatamente como estão.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CHECK de tipo passa a aceitar 'equipamento'
--
-- Postgres não tem ALTER CONSTRAINT para CHECK: é DROP + ADD, na mesma
-- transação da migration.
-- -----------------------------------------------------------------------------
ALTER TABLE public.numeracao_contadores
  DROP CONSTRAINT IF EXISTS numeracao_contadores_tipo_check;

ALTER TABLE public.numeracao_contadores
  ADD CONSTRAINT numeracao_contadores_tipo_check
  CHECK (tipo IN ('titulo', 'fatura', 'equipamento'));

-- -----------------------------------------------------------------------------
-- 2. proximo_numero_documento: novo tipo + largura do sequencial por tipo
--
-- ATENÇÃO: a versão da 168 fazia LPAD(v_seq::text, 6, '0') FIXO. Fixo em 6 daria
-- EQ-004-000007 (13 chars) e a proposta perderia a razão de ser, que é caber na
-- etiqueta. A largura agora varia por tipo: 6 para titulo/fatura (comportamento
-- preservado byte a byte) e 4 para equipamento.
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
  v_largura integer;
BEGIN
  IF p_loja_id IS NULL THEN
    RAISE EXCEPTION 'numeracao: loja_id é obrigatório para gerar número de %', p_tipo
      USING ERRCODE = '23502';
  END IF;

  v_prefixo := CASE p_tipo
                 WHEN 'titulo'      THEN 'TIT'
                 WHEN 'fatura'      THEN 'FAT'
                 WHEN 'equipamento' THEN 'EQ'
               END;

  -- Largura do sequencial. Título e fatura crescem para sempre e mantêm 6.
  -- Patrimônio é acervo físico: 4 dígitos cobrem 9.999 itens por loja e
  -- economizam dois chars de etiqueta que nunca seriam usados.
  v_largura := CASE p_tipo
                 WHEN 'titulo'      THEN 6
                 WHEN 'fatura'      THEN 6
                 WHEN 'equipamento' THEN 4
               END;

  IF v_prefixo IS NULL THEN
    RAISE EXCEPTION 'numeracao: tipo inválido "%" (esperado titulo, fatura ou equipamento)', p_tipo
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

  -- Guarda preservada da 168: o formato depende de codigo ter exatamente 3
  -- dígitos, mas nada no schema garante isso — lojas.codigo é TEXT livre e o
  -- seed original usava 'loja-1'. Uma loja nova como 'Filial Centro' geraria
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

  RETURN v_prefixo || '-' || v_codigo || '-' || LPAD(v_seq::text, v_largura, '0');
END;
$$;

COMMENT ON FUNCTION public.proximo_numero_documento(uuid, text) IS
  'Devolve o próximo número no formato PREFIXO-{lojas.codigo}-{seq}. '
  'Sequencial de 6 dígitos para titulo/fatura e 4 para equipamento. '
  'Atômico: o ON CONFLICT DO UPDATE trava a linha do contador.';

-- -----------------------------------------------------------------------------
-- 3. Trigger BEFORE INSERT para equipamentos
--
-- trg_gerar_numero_documento() da 168 escreve em NEW.numero e lê NEW.loja_id;
-- equipamentos usa codigo_interno e loja_atual_id, então precisa de função
-- própria. O contrato é o mesmo: só preenche quando vier nulo ou vazio.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_gerar_codigo_equipamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Código informado é respeitado. Preserva import de legado e qualquer
  -- cadastro que traga a etiqueta física já existente do equipamento.
  IF NEW.codigo_interno IS NULL OR btrim(NEW.codigo_interno) = '' THEN
    NEW.codigo_interno := public.proximo_numero_documento(NEW.loja_atual_id, 'equipamento');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_gerar_codigo_equipamento() IS
  'Trigger BEFORE INSERT em equipamentos. Preenche codigo_interno via '
  'proximo_numero_documento(loja_atual_id, ''equipamento'') quando vier nulo ou '
  'vazio; respeita valor já informado.';

-- -----------------------------------------------------------------------------
-- 4. DEFAULT '' + attach do trigger
--
-- codigo_interno é NOT NULL e não tem default. O DEFAULT '' permite que o
-- cliente omita a coluna: o valor vazio passa o NOT NULL e o BEFORE INSERT
-- substitui antes de a linha ser gravada. Mesmo padrão de titulos/faturas.
--
-- O UNIQUE (equipamentos_codigo_interno_key) continua valendo e agora é a rede
-- de segurança de um gerador determinístico, não de um Math.random().
-- -----------------------------------------------------------------------------
ALTER TABLE public.equipamentos ALTER COLUMN codigo_interno SET DEFAULT '';

-- ORDEM DE DISPARO É LOAD-BEARING: o Postgres dispara triggers do mesmo evento
-- em ordem ALFABÉTICA por nome. equipamentos já tem 'trg_demo_readonly'
-- (BEFORE INSERT OR UPDATE OR DELETE, aplicado pela varredura de pg_tables em
-- 20260809140000_demo_readonly_triggers.sql). 'trg_demo_readonly' <
-- 'trg_num_equipamento', então o bloqueio de demo roda ANTES e aborta sem
-- queimar número do contador. Renomear este trigger para algo que ordene antes
-- (ex.: 'trg_codigo_equipamento', com 'c' < 'd') faria usuário demo consumir
-- numeração real a cada tentativa de cadastro.
DROP TRIGGER IF EXISTS trg_num_equipamento ON public.equipamentos;
CREATE TRIGGER trg_num_equipamento
  BEFORE INSERT ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_codigo_equipamento();

-- -----------------------------------------------------------------------------
-- 5. Semear as lojas em ZERO para o novo tipo
--
-- Zero, não MAX(). Os 14 equipamentos existentes ficam como estão e seus códigos
-- legados (LA252028090, BE-059, CO-076) têm formato distinto do EQ-004-0001, então
-- não colidem com a série nova. ON CONFLICT DO NOTHING mantém a migration
-- idempotente e nunca zera um contador que já andou.
-- -----------------------------------------------------------------------------
INSERT INTO public.numeracao_contadores (loja_id, tipo, ultimo_numero)
SELECT l.id, 'equipamento', 0
FROM public.lojas l
ON CONFLICT (loja_id, tipo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Permissões
--
-- Nada a conceder: o REVOKE da 168 sobre numeracao_contadores e sobre
-- proximo_numero_documento continua valendo. O trigger é SECURITY DEFINER e não
-- precisa que o chamador tenha EXECUTE na função de numeração.
-- CREATE OR REPLACE preserva os grants existentes da função.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.trg_gerar_codigo_equipamento() FROM PUBLIC, anon, authenticated;
