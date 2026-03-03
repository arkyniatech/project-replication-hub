

# Usar token da instância conectada para enviar mensagens de verificação

## Problema
A edge function `whatsapp-verify` usa o secret `UAZAPI_TOKEN` fixo para enviar mensagens. Deveria usar o token da instância WhatsApp conectada à loja (salvo na tabela `whatsapp_instances`).

Além disso, o formato do número precisa garantir o prefixo `55` + DDD + número sem formatação.

## Alterações

### 1. `src/components/forms/WhatsAppVerificationModal.tsx`
- Adicionar prop `lojaId: string` na interface
- Passar `loja_id` no body da chamada `action: 'send'`

### 2. `src/components/forms/ClienteForm.tsx`
- Passar `lojaId={lojaAtual?.id}` ao `WhatsAppVerificationModal`

### 3. `supabase/functions/whatsapp-verify/index.ts`
- No `action: 'send'`, receber `loja_id` do body
- Buscar o token da instância conectada na tabela `whatsapp_instances` usando `loja_id`
- Se não encontrar instância conectada, retornar erro claro
- Usar `instance_token` no header `token` da chamada uazapi
- Formatar número: remover tudo não-numérico, garantir prefixo `55`, resultado tipo `5511987553558`
- Endpoint uazapi v2: `POST /message/sendText` com header `token` e body `{ number, text }`

### Formato do número
```
Input: (11) 98755-3558
Clean: 11987553558
Final: 5511987553558
```

A lógica existente `cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone` já cobre isso corretamente.

