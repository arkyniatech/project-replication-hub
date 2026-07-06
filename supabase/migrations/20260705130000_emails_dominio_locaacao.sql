-- ============================================================
-- Migra os logins do domínio provisório @locacaoerp.com para o
-- domínio oficial @locaacao.com.br
-- ============================================================
-- Defensivo: se o endereço de destino JÁ existir (ex.: conta antiga
-- duplicada no domínio novo), o usuário é PULADO com um NOTICE em
-- vez de estourar unique constraint. Idempotente.

DO $$
DECLARE
  r record;
  destino text;
BEGIN
  FOR r IN
    SELECT id, email FROM auth.users WHERE email LIKE '%@locacaoerp.com'
  LOOP
    destino := replace(r.email, '@locacaoerp.com', '@locaacao.com.br');

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = destino) THEN
      RAISE NOTICE 'PULADO: % -> % (destino já existe — resolver manualmente)', r.email, destino;
      CONTINUE;
    END IF;

    UPDATE auth.users
    SET email = destino, updated_at = now()
    WHERE id = r.id;

    UPDATE auth.identities
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(destino)),
        updated_at = now()
    WHERE user_id = r.id AND provider = 'email';

    RAISE NOTICE 'MIGRADO: % -> %', r.email, destino;
  END LOOP;
END $$;
