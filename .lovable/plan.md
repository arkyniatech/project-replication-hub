

## Plano: Webhook ZapSign + Corrigir Download PDF

### 1. Contrato assinado automaticamente nos Anexos

Atualmente **não existe webhook** para receber notificações da ZapSign. Quando o cliente assina, nada acontece automaticamente no sistema.

**Solução**: Criar edge function `zapsign-webhook` que:
- Recebe o callback da ZapSign quando o documento é assinado
- Baixa o PDF assinado da API ZapSign
- Faz upload para o bucket `contratos-anexos/{contrato_id}/`
- Adiciona automaticamente ao array `documentos` do contrato com tag `ASSINATURA`
- Atualiza `zapsign_status = 'ASSINADO'` e `zapsign_signed_at`

**Configuração necessária**: Após deploy, será preciso cadastrar a URL do webhook no painel da ZapSign (isso é feito uma vez só).

### 2. Corrigir erro de download do PDF

O botão "Baixar PDF" no preview do contrato usa `downloadContratoPDF()` que depende dos dados do rascunho (itens, cliente, entrega, pagamento). Preciso verificar se os dados estão chegando no formato correto — provavelmente o contrato salvo no banco tem estrutura diferente do rascunho esperado pela função.

**Alterações**:

| Arquivo | O que muda |
|---|---|
| `supabase/functions/zapsign-webhook/index.ts` | **Nova** edge function para receber callback da ZapSign, baixar PDF assinado e salvar nos anexos |
| `supabase/config.toml` | Adicionar config do webhook com `verify_jwt = false` (ZapSign chama sem auth) |
| `supabase/functions/zapsign-enviar/index.ts` | Adicionar `webhook_url` no payload enviado para ZapSign |
| `src/utils/contrato-pdf.ts` | Investigar e corrigir erro de geração/download |

