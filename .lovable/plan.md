

# Botão "Finalizar" → "Enviar para Assinatura Digital"

## O que muda

O fluxo atual: o botão "Finalizar" salva o contrato no Supabase e redireciona para `/contratos`. A assinatura digital é um passo manual separado (mock).

Novo fluxo: o botão "Finalizar" é substituído por "Enviar para Assinatura". Ao clicar, ele:
1. Salva o contrato no Supabase (como já faz)
2. Gera o PDF em base64
3. Chama a Edge Function `zapsign-enviar` com email e telefone do cliente
4. A ZapSign envia automaticamente por email E WhatsApp (já suportado pela API — `send_automatic_email` e `send_automatic_whatsapp`)
5. Atualiza o contrato com `zapsign_status = 'PENDENTE'`
6. Exibe toast de sucesso e redireciona

## Alterações técnicas

### 1. `src/pages/NovoContratoV2.tsx`

- **Renomear botão**: "Finalizar" → "Enviar para Assinatura" com ícone `Send`
- **Refatorar `finalizarContrato`**: Após salvar o contrato com sucesso no Supabase, adicionar chamada à edge function `zapsign-enviar` passando:
  - `pdf_base64` (gerado via `gerarContratoPDFBase64`)
  - `nome_documento`
  - `signatario.nome` (nome/razão social do cliente)
  - `signatario.email` (extraído dos contatos do cliente, tipo "Email")
  - `signatario.telefone` (extraído dos contatos do cliente, tipo "WhatsApp" ou "Telefone")
  - `contrato_id` (ID retornado pelo insert)
- **Tratamento de erro**: Se a ZapSign falhar, o contrato já foi salvo — exibir toast informando que o contrato foi criado mas a assinatura falhou, com opção de tentar novamente depois
- **Remover `handleEnviarAssinatura` mock**: Substituir pela integração real

### 2. Envio por WhatsApp
A ZapSign **já suporta** envio automático via WhatsApp quando `send_automatic_whatsapp: true` e `phone_number` está preenchido. A edge function `zapsign-enviar` já configura isso (linhas 57-58). Basta garantir que o telefone do cliente seja passado corretamente.

### 3. `src/utils/contrato-pdf.ts`
- Já existe e funciona — será usado para gerar o PDF a partir dos dados do contrato montados na `finalizarContrato`

### 4. Edge Function `zapsign-enviar`
- Já existe e funciona — sem alterações necessárias

### 5. Etapa "Documentos e Assinatura" (etapa 6)
- Remover botão "Enviar para Assinatura Digital (mock)" da etapa de documentos
- Manter apenas "Contrato de Locação (Resumo)" para preview
- O envio real acontece via botão principal "Enviar para Assinatura"

