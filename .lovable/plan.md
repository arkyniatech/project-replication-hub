

# Adicionar botão "Ativar" no cadastro de clientes

## Problema
O formulário de cliente só tem o botão "Inativar" (suspender). Uma vez suspenso, não há como reativar o cliente pela interface.

## O que é um "Contrato Ativo"
Um contrato `ATIVO` é aquele que está em vigor: equipamentos entregues, cliente usando, período rodando. Fluxo: RASCUNHO → AGUARDANDO_ENTREGA → **ATIVO** → ENCERRADO/CANCELADO.

## Alterações

### `src/components/forms/ClienteForm.tsx`
- Adicionar função `handleActivate` que muda o status do cliente para `ATIVO` (status_credito = 'ATIVO') via `updateCliente.mutate`
- No footer, exibir condicionalmente:
  - Se cliente está `SUSPENSO` ou `EM_ANALISE` → mostrar botão **"Ativar"** (verde, com ícone UserCheck)
  - Se cliente está `ATIVO` → mostrar botão **"Inativar"** (vermelho, como já existe)
- Lógica simples: mesma estrutura do `handleInactivate`, mas setando `status: 'ATIVO'` e `statusCredito: 'Ativo'`

### Nenhuma alteração no banco
O campo `status_credito` já aceita `'ATIVO'` como valor — só falta o botão na UI.

