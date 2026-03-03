

# Fix: Cliente desaparece ao clicar "Alterar" no novo contrato

## Problema
Ao clicar "Alterar" no card do cliente selecionado, o código limpa `clienteId` e `cliente` do estado, mas o campo de busca (`searchCliente`) fica vazio. Como a lista de clientes só aparece quando `searchCliente` tem conteúdo (linha 1058: `{searchCliente && !contrato.cliente && ...}`), o usuário fica sem ver nenhum cliente e precisa digitar algo para vê-los novamente.

## Solução
Ao clicar "Alterar", preencher automaticamente o `searchCliente` com o nome do cliente atual. Assim a lista aparece imediatamente mostrando o cliente (e similares), e o usuário pode limpar o campo para buscar outro.

## Alteração

### `src/pages/NovoContratoV2.tsx`
Na linha ~1048, alterar o `onClick` do botão "Alterar" para também setar o `searchCliente`:

```typescript
onClick={() => {
  const nomeAtual = contrato.cliente?.nomeRazao || '';
  setContrato(prev => ({ ...prev, clienteId: '', cliente: undefined }));
  setSearchCliente(nomeAtual);
}}
```

Isso garante que a lista de clientes aparece imediatamente com o nome previamente selecionado preenchido no campo de busca.

