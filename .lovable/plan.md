## Desabilitar verificação de WhatsApp no cadastro de cliente

### Situação atual
- `ClienteForm.tsx` já tem a flag `VITE_REQUIRE_WHATSAPP_VERIFICATION` (default `false`), então **salvar já funciona sem autenticar** — não há mais bloqueio no submit.
- Mas o botão **"Autenticar"** (com escudo) ainda aparece ao lado do campo WhatsApp e, ao clicar, abre o modal que dispara o envio do código via `whatsapp-verify`. É isso que o cliente está vendo.

### Mudança (1 arquivo, frontend apenas)
**`src/components/forms/ClienteForm.tsx`** — usar a mesma flag para esconder a UI de verificação:

1. Calcular `const requireWhatsAppVerification = import.meta.env.VITE_REQUIRE_WHATSAPP_VERIFICATION === 'true';` em um único lugar no topo do componente (hoje está calculada só dentro do `handleSubmit`).
2. Envolver o botão "Autenticar" (linhas 763-775) com `{requireWhatsAppVerification && isWhatsApp && contato.valor && (...)}` — sem a flag ligada, o botão simplesmente não aparece.
3. Renderizar `<WhatsAppVerificationModal />` (linhas 553-…) só quando `requireWhatsAppVerification` é true, para garantir que nada no fluxo dispara o `whatsapp-verify`.

### Fora de escopo
- Não mexer no edge function `whatsapp-verify` (segue disponível para outros fluxos).
- Não mexer no `WhatsAppVerificationModal.tsx`.
- Não alterar schema/banco — campo `verificado` continua existindo no contato (fica `false` por padrão).
- Quando o cliente quiser religar a autenticação, basta setar `VITE_REQUIRE_WHATSAPP_VERIFICATION=true` no `.env` — sem código novo.

### Validação
- Cadastrar um cliente novo informando WhatsApp → não aparece botão "Autenticar", salva direto.
- Build TypeScript sem erros, sem novas warnings no console.
