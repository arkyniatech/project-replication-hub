

# Numeração de Contrato com Renovações: `1` → `1.1`, `1.2`, etc.

## Situação Atual
- Contratos recebem número sequencial simples (ex: `1`, `2`, `3`)
- Renovações geram aditivos com formato `{numero}-01`, `{numero}-02` (separador traço, zero-padded)

## Alterações

### 1. `src/components/modals/RenovarContratoModal.tsx`
- Linha 467: Mudar formato de `${contrato.numero}-${proximoSequencial.toString().padStart(2, '0')}` para `${contrato.numero}.${proximoSequencial}`
- Resultado: contrato `1` gera renovações `1.1`, `1.2`, `1.3`...

### 2. `src/pages/NovoContratoV2.tsx`
- Atualmente usa `autoIncrementContrato()` que gera número numérico simples via localStorage
- Manter como está — o número base do contrato continua sendo sequencial (`1`, `2`, `3`)

### 3. Exibição nos listagens
- Verificar se a listagem de contratos/aditivos já exibe o campo `numero` corretamente — como é só mudança de formato string, não precisa alterar componentes de listagem

Mudança mínima: apenas 1 linha no `RenovarContratoModal.tsx`.

