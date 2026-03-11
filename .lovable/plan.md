

# Integração ZapSign — Enviar Contrato para Assinatura Digital

## Visão Geral
O PDF enviado para a ZapSign será gerado a partir do mesmo conteúdo do `ContratoResumoPreview` (cabeçalho da empresa, dados do cliente, tabela de equipamentos, condições de pagamento, campo de assinatura). Será usado `jsPDF` para gerar o documento programaticamente e enviá-lo em base64 para uma Edge Function que chama a API da ZapSign.

## Fluxo

```text
[Usuário clica "Enviar p/ Assinatura"]
  → Front gera PDF do contrato via jsPDF (mesmo layout do preview)
  → Converte para base64
  → Chama Edge Function "zapsign-enviar"
  → Edge Function envia para ZapSign API
  → Retorna link de assinatura
  → Salva token/status no contrato
  → Abre link ou exibe badge "Pendente Assinatura"
```

## Alterações

### 1. Secret: `ZAPSIGN_API_TOKEN`
- Solicitar ao usuário via ferramenta de secrets (não existe ainda)

### 2. Migration SQL — Colunas de rastreamento na tabela `contratos`
- `zapsign_doc_token text` — token do documento na ZapSign
- `zapsign_status text` — PENDENTE / ASSINADO
- `zapsign_signed_at timestamptz` — data da assinatura
- `zapsign_sign_url text` — link de assinatura do signatário

### 3. Novo arquivo: `src/utils/contrato-pdf.ts`
- Função `gerarContratoPDFBase64(contrato)` usando `jsPDF` + `jspdf-autotable` (já instalados)
- Reproduz o layout do `ContratoResumoPreview`: cabeçalho empresa, dados cliente, tabela de itens, condições de pagamento, campo de assinatura
- Retorna string base64

### 4. Nova Edge Function: `supabase/functions/zapsign-enviar/index.ts`
- Recebe: `{ pdf_base64, nome_documento, signatario: { nome, email, telefone }, contrato_id }`
- Chama `POST https://api.zapsign.com.br/api/v1/docs/` com header `Authorization: Bearer {ZAPSIGN_API_TOKEN}`
- Salva `zapsign_doc_token`, `zapsign_status = 'PENDENTE'`, `zapsign_sign_url` no contrato via service role
- Retorna `{ sign_url }`

### 5. `supabase/config.toml`
- Adicionar `[functions.zapsign-enviar]` com `verify_jwt = false`

### 6. `src/components/contratos/ContratoResumoPreview.tsx`
- `handleEnviarAssinatura`: gerar PDF base64 → chamar edge function via `supabase.functions.invoke('zapsign-enviar', ...)` → abrir link de assinatura em nova aba
- Botão "Baixar PDF": implementar download real usando a mesma função de geração

### 7. `src/pages/ContratoDetalhes.tsx`
- `onAssinar`: mesmo fluxo (gerar PDF + enviar ZapSign) para contratos já salvos
- Exibir badge "Assinatura Pendente" / "Assinado ✅" baseado em `zapsign_status`

