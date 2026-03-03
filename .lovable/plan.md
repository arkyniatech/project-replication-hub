

# Fix: Mostrar lista de clientes sem precisar digitar

## Problema
A lista de clientes só aparece quando `searchCliente` tem conteúdo (linha 1058: `{searchCliente && !contrato.cliente && ...}`). O usuário quer ver os clientes disponíveis assim que abre a tela, sem precisar digitar nada.

## Solução
Remover a condição `searchCliente &&` para que a lista apareça sempre que não houver cliente selecionado. Ajustar o filtro de clientes para mostrar todos (limitados a 10) quando a busca estiver vazia.

## Alterações em `src/pages/NovoContratoV2.tsx`

1. **Linha ~244-248** — No `useEffect` de filtro, quando `searchCliente` estiver vazio, mostrar todos os clientes (já limitado a 10 pelo `.slice(0, 10)`):
   - Remover o filtro condicional: se `searchCliente` estiver vazio, retornar `todosClientes.slice(0, 10)` direto.

2. **Linha 1058** — Remover `searchCliente &&` da condição de renderização:
   - De: `{searchCliente && !contrato.cliente && ...}`
   - Para: `{!contrato.cliente && ...}`

Isso faz a lista de clientes aparecer imediatamente, mostrando os 10 primeiros. Ao digitar, filtra normalmente.

