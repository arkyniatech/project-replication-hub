

# "Assinar Digitalmente" → Enviar para ZapSign

## Situação atual

O botão "Assinar Digitalmente" na página de detalhes do contrato (`ContratoDetalhes.tsx`, linha 406) apenas exibe um toast genérico — não faz nada real.

## O que será feito

Ao clicar em "Assinar Digitalmente", o sistema irá:
1. Montar os dados do contrato no formato esperado pelo `gerarContratoPDFBase64`
2. Chamar a edge function `zapsign-enviar` com o PDF, dados do signatário (nome, email, telefone do cliente) e o `contrato_id`
3. Se houver `sign_url` na resposta, abrir em nova aba
4. Exibir toast de sucesso ou erro
5. Se o contrato já tiver `zapsign_sign_url` salvo, abrir diretamente essa URL ao invés de reenviar

## Alterações

### `src/pages/ContratoDetalhes.tsx`

- Importar `gerarContratoPDFBase64` de `@/utils/contrato-pdf`
- Substituir o handler `onAssinar` (linha 406) por uma função `handleAssinarDigitalmente` que:
  - Verifica se já existe `zapsign_sign_url` no contrato → abre direto
  - Caso contrário, busca email/telefone do cliente no Supabase (tabela `cliente_contatos`)
  - Monta o objeto do contrato para gerar o PDF
  - Chama `supabase.functions.invoke('zapsign-enviar', { body: {...} })`
  - Abre `sign_url` retornada em nova aba
  - Toast de sucesso/erro

### Sem alterações na edge function
A `zapsign-enviar` já está funcional e usando sandbox.

