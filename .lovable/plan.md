

# Integrar Verificacao WhatsApp real via uazapi

## O que preciso de voce

Para integrar com a **uazapi**, preciso de 2 informacoes:

1. **URL da sua instancia uazapi** (ex: `https://sua-instancia.uazapi.com`)
2. **Token de autenticacao da API** (o token da sua instancia)

Vou armazenar o token como secret seguro no Supabase (nunca exposto no frontend).

## Como vai funcionar

### Fluxo
1. Usuario clica "Enviar Codigo" → frontend chama edge function `whatsapp-verify`
2. Edge function gera codigo aleatorio de 6 digitos, salva no banco com expiracao de 5 min, e envia via uazapi para o numero do cliente
3. Usuario digita o codigo recebido → frontend chama a mesma edge function (acao `verify`)
4. Edge function compara o codigo, retorna sucesso ou erro

### Alteracoes

**1. Tabela `whatsapp_verifications`** (migration)
- `id`, `phone`, `code` (6 digitos), `expires_at`, `verified`, `created_at`
- Expiracao automatica de 5 minutos

**2. Edge Function `whatsapp-verify/index.ts`**
- Acao `send`: gera codigo, insere na tabela, chama API uazapi `POST /sendText` com mensagem contendo o codigo
- Acao `verify`: busca codigo valido (nao expirado, nao usado) para o telefone, compara, marca como verificado

**3. `WhatsAppVerificationModal.tsx`**
- Substituir mock por chamadas reais a `supabase.functions.invoke('whatsapp-verify', ...)`
- Remover dica de teste "123456"
- Adicionar loading states

**4. Secrets necessarios**
- `UAZAPI_URL` — URL da instancia
- `UAZAPI_TOKEN` — Token de autenticacao

## Proximo passo

Me confirme a **URL da instancia** e o **token** da uazapi, e eu configuro tudo.

