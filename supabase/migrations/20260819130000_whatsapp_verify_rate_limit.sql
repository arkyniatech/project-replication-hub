-- RELAY 55 — LOTE C, migration 2
-- Rate limit de força bruta no ramo `verify` do whatsapp-verify.
--
-- PROBLEMA
-- Código de 6 dígitos, TTL de 5 min, e nenhum contador de tentativas. O espaço
-- é 9·10^5 (não 10^6: Math.floor(100000 + random*900000) nunca gera zero à
-- esquerda), varrido por script em minutos.
--
-- POR QUE TABELA SEPARADA, E NÃO COLUNA EM whatsapp_verifications
-- Contador por código é contornado por reenvio: o atacante gasta 4 tentativas,
-- chama `send`, o send invalida o código anterior e insere uma LINHA NOVA — o
-- contador zera junto. Repete indefinidamente. O único estado que funciona é
-- por TELEFONE, sobrevivendo à rotação do código. Por isso a janela deslizante
-- fica em tabela própria, e NÃO existe coluna `attempts` em
-- whatsapp_verifications: duas fontes de verdade divergiriam.
--
-- LIMITE: 5 tentativas por telefone em 15 min.
-- Com 5 tentativas contra um código vivo: 5/900000 ≈ 5,6e-6 por rajada.
-- Folgado para quem erra de digitar, inviável para script.
--
-- O QUE ACONTECE AO ESTOURAR: recusa com 429, sem invalidar o código.
-- Invalidar obrigaria o usuário legítimo a pedir outro código. E o bloqueio
-- NÃO reusa `verified`: essa coluna já significa duas coisas ("verificou com
-- sucesso", linha 181 da função; e "código superado por rotação", linha 89).
-- Um terceiro significado a tornaria incapaz de responder "este telefone
-- chegou a ser verificado?".
--
-- ORÁCULO: a janela é checada ANTES de olhar o código (ver ordem dentro da
-- RPC). Se fosse depois, o 429 só apareceria para telefone com código pendente
-- e viraria oráculo. O 400 de hoje é indistinguível entre código errado,
-- expirado e telefone inexistente — essa propriedade é preservada.
--
-- CORRIDA: o incremento e o consumo do código acontecem em UMA instrução
-- (UPDATE ... RETURNING dentro da RPC). Sem isso, N requisições concorrentes
-- leem o mesmo contador e o teto de 5 vira "5 + o que couber num RTT"; e duas
-- requisições com o MESMO código correto teriam ambas sucesso (duplo consumo).
--
-- AS 7 VERIFICAÇÕES EXISTENTES: nada é apagado nem invalidado. A tabela nova
-- começa vazia e whatsapp_verifications só ganha uma coluna nullable.
--
-- COMPORTAMENTO DELIBERADO — bloqueio que se renova: a tentativa é gravada
-- ANTES da checagem da janela, então quem já está bloqueado e insiste
-- continua contando tentativas acima do teto, e o bloqueio passa a valer por
-- 15 min a partir da ÚLTIMA tentativa, não da primeira. Para um atacante é o
-- comportamento correto (cada retry reinicia o próprio castigo). Para um
-- usuário legítimo que fica reenviando o código errado, isso prolonga a
-- própria espera. Não mude sem decisão explícita — quem mexer aqui precisa
-- saber que é intencional, não um bug.

-- ---------------------------------------------------------------------
-- 1. Janela deslizante de tentativas, por telefone.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  -- quem tentou. O atacante realista aqui é um usuário autenticado do próprio
  -- ERP, então registrar o autor transforma o controle de preventivo em
  -- também detectivo. Nullable: tentativa pode chegar sem sessão resolvida.
  user_id uuid,
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- A consulta da janela é sempre (phone, attempted_at DESC) sobre tentativas
-- malsucedidas — daí o índice parcial.
CREATE INDEX IF NOT EXISTS idx_wa_attempts_phone_time
  ON public.whatsapp_verification_attempts (phone, attempted_at DESC)
  WHERE succeeded = false;

-- Usado só pela limpeza periódica.
CREATE INDEX IF NOT EXISTS idx_wa_attempts_time
  ON public.whatsapp_verification_attempts (attempted_at);

ALTER TABLE public.whatsapp_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Mesmo tratamento que whatsapp_verifications recebeu em 20260608182221:
-- a tabela só existe para a Edge Function (service_role). Ninguém alcança por
-- PostgREST. Sem policy para authenticated/anon é negação por default, mas o
-- REVOKE explícito é o que impede o acesso mesmo se alguém criar policy depois.
DROP POLICY IF EXISTS "Service role full access" ON public.whatsapp_verification_attempts;
CREATE POLICY "Service role full access" ON public.whatsapp_verification_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.whatsapp_verification_attempts FROM authenticated, anon;

COMMENT ON TABLE public.whatsapp_verification_attempts IS
  'RELAY 55 — janela deslizante de tentativas de verificação por telefone. '
  'Vive fora de whatsapp_verifications de propósito: o contador precisa '
  'sobreviver à rotação do código, senão reenviar zera o limite.';

-- ---------------------------------------------------------------------
-- 2. Marca de consumo em whatsapp_verifications.
--
-- Coluna própria em vez de reusar `verified`, que já está sobrecarregada.
-- Nullable e sem DEFAULT: as 7 linhas existentes ficam com NULL, que lê como
-- "não consumido por este mecanismo" — que é a verdade sobre elas.
-- ---------------------------------------------------------------------
ALTER TABLE public.whatsapp_verifications
  ADD COLUMN IF NOT EXISTS consumed_at timestamptz;

COMMENT ON COLUMN public.whatsapp_verifications.consumed_at IS
  'Quando este código foi consumido por uma verificação bem-sucedida. '
  'Distinto de `verified`, que também marca código superado por rotação.';

-- ---------------------------------------------------------------------
-- 3. RPC atômica de verificação.
--
-- Faz, numa única chamada e na ordem que importa:
--   a) grava a tentativa (sempre, mesmo que o telefone não tenha código);
--   b) conta a janela ANTES de olhar o código  -> 429 não vira oráculo;
--   c) consome o código com UPDATE ... RETURNING -> sem corrida, sem duplo uso.
--
-- SECURITY DEFINER porque a tabela está revogada de authenticated: a função
-- roda como o dono. Chamada exclusivamente pela Edge Function (service_role);
-- por isso NÃO recebe GRANT de volta para authenticated — mesmo critério da
-- 20260815200000, que fechou a superfície de RPC do repo.
--
-- Retorno é um único JSONB com um campo `status` que a função traduz para o
-- HTTP. Assim a assinatura chamada pelo front NÃO muda: quem fala com o
-- browser continua sendo a Edge Function, com o mesmo body e os mesmos códigos.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.whatsapp_verify_consume(
  p_phone   text,
  p_code    text,
  p_user_id uuid DEFAULT NULL,
  p_max_attempts int DEFAULT 5,
  p_window  interval DEFAULT interval '15 minutes'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recent int;
  v_id uuid;
  v_attempt_id uuid;
BEGIN
  IF p_phone IS NULL OR p_code IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  -- (a) A tentativa é registrada ANTES de qualquer decisão. Uma saída por
  -- exceção não pode deixar de contabilizar — é o que um atacante exploraria.
  -- O id é capturado aqui: identificar a linha depois por max(attempted_at)
  -- marcaria a linha errada quando duas requisições do mesmo telefone se
  -- cruzam (now() é o início da transação, igual entre concorrentes).
  INSERT INTO public.whatsapp_verification_attempts (phone, user_id)
  VALUES (p_phone, p_user_id)
  RETURNING id INTO v_attempt_id;

  -- (b) Janela contada antes de tocar no código. Inclui a tentativa recém
  -- inserida, então o limite é "a 6ª tentativa em 15 min já é recusada".
  --
  -- Só tentativas MALSUCEDIDAS contam. Contar as bem-sucedidas puniria o
  -- fluxo legítimo: quem erra 3 vezes, acerta na 4ª e precisa verificar um
  -- segundo telefone na mesma janela seria bloqueado tendo já provado ser
  -- legítimo. Força bruta se mede por falhas.
  SELECT count(*) INTO v_recent
  FROM public.whatsapp_verification_attempts
  WHERE phone = p_phone
    AND succeeded = false
    AND attempted_at > now() - p_window;

  IF v_recent > p_max_attempts THEN
    -- Recusa sem invalidar o código: o usuário legítimo que errou de digitar
    -- volta em 15 min com o mesmo código, sem precisar pedir outro.
    RETURN jsonb_build_object(
      'status', 'rate_limited',
      'retry_after_seconds', ceil(extract(epoch FROM p_window))::int
    );
  END IF;

  -- (c) Consumo atômico. As condições de validade ficam TAMBÉM no WHERE do
  -- UPDATE, não só na subconsulta: é o UPDATE que revalida sob o lock de
  -- linha. Duas requisições concorrentes com o mesmo código correto — a
  -- segunda bloqueia, reavalia, vê verified=true e não retorna linha.
  --
  -- Sem SKIP LOCKED de propósito: ele faria a segunda requisição PULAR a linha
  -- travada e responder "código inválido" a um código correto, gastando uma
  -- tentativa do usuário legítimo que clicou duas vezes.
  UPDATE public.whatsapp_verifications v
     SET verified = true,
         consumed_at = now()
   WHERE v.id = (
     SELECT id FROM public.whatsapp_verifications
      WHERE phone = p_phone
        AND code = p_code
        AND verified = false
        AND expires_at >= now()
      ORDER BY created_at DESC
      LIMIT 1
   )
     AND v.verified = false
     AND v.expires_at >= now()
  RETURNING v.id INTO v_id;

  IF v_id IS NULL THEN
    -- Indistinguível entre código errado, expirado, já usado e telefone sem
    -- código — a mesma propriedade que o 400 de hoje tem. Não detalhar.
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  -- Pela PK, não por max(attempted_at): marca exatamente a própria tentativa.
  UPDATE public.whatsapp_verification_attempts
     SET succeeded = true
   WHERE id = v_attempt_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.whatsapp_verify_consume(text, text, uuid, int, interval)
  FROM PUBLIC, anon, authenticated;

-- REVOKE ... FROM PUBLIC também tira o acesso implícito do service_role — a
-- mesma armadilha documentada em 20260815200000_fin_transferencia_escopo_loja.
-- Aqui é obrigatório e não precaução: a Edge Function é a ÚNICA chamadora, e
-- sem este GRANT o verify quebra 100% com "permission denied for function".
GRANT EXECUTE ON FUNCTION public.whatsapp_verify_consume(text, text, uuid, int, interval)
  TO service_role;

COMMENT ON FUNCTION public.whatsapp_verify_consume(text, text, uuid, int, interval) IS
  'RELAY 55 — verificação atômica com rate limit. Ordem deliberada: registra '
  'tentativa, checa janela, só então consulta o código (janela depois do '
  'código faria o 429 vazar quais telefones têm código pendente). '
  'Chamada só pela Edge Function via service_role.';

-- ---------------------------------------------------------------------
-- 4. Limpeza. Sem isto a tabela cresce sem teto.
-- Janela é de 15 min; 24 h de retenção deixa margem para auditar um ataque.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.whatsapp_verification_attempts_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.whatsapp_verification_attempts
   WHERE attempted_at < now() - interval '24 hours';
$$;

REVOKE ALL ON FUNCTION public.whatsapp_verification_attempts_cleanup()
  FROM PUBLIC, anon, authenticated;

-- Agendamento idempotente. cron.schedule só faz upsert por jobname a partir do
-- pg_cron 1.4; em versões anteriores reaplicar a migration levantaria unique
-- violation em cron.job.jobname. O unschedule prévio cobre as duas versões.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-verification-attempts-cleanup'
    ) THEN
      PERFORM cron.unschedule('whatsapp-verification-attempts-cleanup');
    END IF;
    PERFORM cron.schedule(
      'whatsapp-verification-attempts-cleanup',
      '17 4 * * *',
      $cron$SELECT public.whatsapp_verification_attempts_cleanup();$cron$
    );
  END IF;
END $$;
