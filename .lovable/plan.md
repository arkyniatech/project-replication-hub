

# Enviar link de assinatura por WhatsApp da loja

## O que será feito

Ao clicar no botão WhatsApp na tela de detalhes do contrato, o sistema enviará o link de assinatura ZapSign para o cliente via WhatsApp da loja (usando uazapi).

## Alterações

### 1. Nova Edge Function: `whatsapp-send` (novo arquivo)

Uma edge function genérica para enviar mensagens de texto pelo WhatsApp da loja. Reutiliza o padrão já existente em `whatsapp-verify` (uazapi `/send/text`).

- Recebe: `loja_id`, `phone`, `message`
- Busca o `instance_token` da loja na tabela `whatsapp_instances`
- Envia via uazapi `/send/text`
- Requer auth + role admin/gestor/vendedor

### 2. `supabase/config.toml`

Adicionar `[functions.whatsapp-send]` com `verify_jwt = false`.

### 3. `src/pages/ContratoDetalhes.tsx`

Substituir o mock `onWhatsApp` por `handleEnviarWhatsApp`:

- Verifica se o contrato tem `zapsign_sign_url` salvo — se não, avisa que precisa assinar primeiro
- Busca o telefone do cliente (contatos JSON do cliente, campo tipo "whatsapp" ou "celular")
- Monta mensagem: "Olá {nome}, segue o link para assinatura do contrato {numero}: {url}"
- Chama `supabase.functions.invoke('whatsapp-send', { body: { loja_id, phone, message } })`
- Toast de sucesso/erro

## Fluxo

```text
Botão WhatsApp → tem zapsign_sign_url?
  ├─ NÃO → toast "Envie para assinatura primeiro"
  └─ SIM → busca telefone do cliente
       ├─ sem telefone → toast erro
       └─ com telefone → invoke whatsapp-send → toast sucesso
```

