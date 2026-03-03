

# Melhorias na verificação WhatsApp

## Problema 1: Erro técnico ao digitar código errado
Quando o código está errado, a edge function retorna status 400 com `{ error: "Código inválido ou expirado" }`. O `supabase.functions.invoke` interpreta qualquer status não-2xx como `error`, e a mensagem mostrada ao usuário inclui detalhes técnicos ("Edge function returned...") ao invés de uma mensagem amigável.

**Solução**: No `handleVerifyCode` do `WhatsAppVerificationModal.tsx`, capturar o erro e sempre mostrar uma mensagem user-friendly, ignorando a mensagem técnica do SDK. Verificar se `data?.error` existe antes de olhar `error.message`.

## Problema 2: Delay na tela de sucesso
Após verificação bem-sucedida, há um `setTimeout` de 1500ms antes de chamar `onVerified()` e fechar o modal. Isso é puramente cosmético (para mostrar o checkmark verde).

**Solução**: Reduzir o timeout de 1500ms para 800ms para que o fluxo pareça mais ágil, mantendo o feedback visual.

## Alterações

### `src/components/forms/WhatsAppVerificationModal.tsx`

1. No `catch` do `handleVerifyCode`, usar mensagem fixa amigável em vez de `err.message`:
   - title: "Código inválido"
   - description: "O código informado está incorreto ou expirado. Tente novamente."
   - Não expor `err.message` que pode conter "Edge function returned 400..."

2. Reduzir o `setTimeout` de sucesso de 1500ms para 800ms.

