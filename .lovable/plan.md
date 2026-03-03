

# Integração WhatsApp por Loja via uazapi

## Resumo

Cada loja poderá conectar seu próprio WhatsApp via uazapi. Na aba "Integrações" das configurações, o card de WhatsApp será ativado com funcionalidades para criar instância, conectar via QR Code e desconectar.

## Arquitetura

```text
Frontend (Configurações > Integrações > WhatsApp)
  │
  ├─ Criar Instância → Edge Function "whatsapp-instance"
  │     └─ POST uazapi /instance/init (token admin)
  │           └─ Retorna instance_key (token da instância)
  │                 └─ Salva na tabela whatsapp_instances
  │
  ├─ Conectar (QR Code) → Edge Function "whatsapp-instance"
  │     └─ POST uazapi /instance/connect (token da instância)
  │           └─ Retorna base64 do QR Code
  │                 └─ Exibe no frontend para escanear
  │
  └─ Deletar Instância → Edge Function "whatsapp-instance"
        └─ DELETE uazapi (token admin)
              └─ Remove registro da tabela
```

## Alterações

### 1. Secret: `UAZAPI_ADMIN_TOKEN`
- Token de admin da uazapi para criar/deletar instâncias
- Armazenado como secret no Supabase

### 2. Tabela `whatsapp_instances` (migration)
- `id` uuid PK
- `loja_id` uuid NOT NULL (referência a lojas)
- `instance_name` text (nome da instância na uazapi)
- `instance_token` text (token retornado pelo /instance/init — usado para enviar msgs)
- `status` text DEFAULT 'desconectado' (desconectado, conectado, qr_pendente)
- `phone_number` text (número conectado, preenchido após conexão)
- `created_at`, `updated_at`
- RLS: admin/master podem gerenciar; gestores podem ver

### 3. Edge Function `whatsapp-instance/index.ts`
Ações:
- **`create`**: Chama `POST {UAZAPI_URL}/instance/init` com token admin. Salva instance_token na tabela.
- **`connect`**: Chama `POST {instance_url}/instance/connect` com token da instância. Retorna QR code base64.
- **`status`**: Consulta status da instância na uazapi.
- **`delete`**: Chama endpoint de delete com token admin. Remove registro da tabela.

### 4. Atualizar `whatsapp-verify` Edge Function
- Em vez de usar o secret fixo `UAZAPI_TOKEN`, buscar o token da instância da loja na tabela `whatsapp_instances`
- Isso permite que cada loja envie mensagens pelo seu próprio WhatsApp

### 5. UI: Componente `WhatsAppConfigForm.tsx`
- Exibido dentro do card "WhatsApp Business" na aba Integrações
- Estados:
  - **Sem instância**: Botão "Criar Instância" (gera nome automático baseado na loja)
  - **Instância criada, desconectada**: Botão "Conectar" → exibe QR Code em modal/inline
  - **Conectada**: Badge verde "Conectado" + número + botão "Desconectar"
- Seletor de loja para admin/master que gerenciam múltiplas lojas

### 6. Atualizar `IntegracoesForm.tsx`
- Mudar status do WhatsApp de "indisponivel" para "configurar"
- Renderizar `WhatsAppConfigForm` quando expandido

## Próximo passo
Preciso do token de admin da uazapi para salvar como secret e prosseguir com a implementação.

