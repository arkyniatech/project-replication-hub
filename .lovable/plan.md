

# Adicionar botao "Novo Cliente" na etapa de selecao de cliente do Novo Contrato

## Problema
Na tela de Novo Contrato (etapa 0 - "Cliente"), o usuario so pode buscar clientes existentes. Se precisa cadastrar um novo, tem que sair da tela, ir em Clientes, cadastrar, e voltar.

## Solucao
Adicionar um botao "+ Novo Cliente" ao lado da barra de busca na `renderEtapaCliente()` do `NovoContratoV2.tsx`. Ao clicar, abre um Dialog com o `ClienteForm` ja existente. Ao salvar, o cliente criado e automaticamente selecionado no contrato.

## Alteracoes

### `src/pages/NovoContratoV2.tsx`
1. Importar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` de `@/components/ui/dialog` e `ClienteForm`
2. Adicionar estado `isClienteFormOpen` (boolean)
3. Na `renderEtapaCliente()`, ao lado do input de busca, adicionar botao `+ Novo Cliente` que abre o dialog
4. Adicionar o `<Dialog>` com `<ClienteForm>` dentro. No callback `onSave`, fechar o modal e selecionar automaticamente o cliente recem-criado no contrato (usando `selecionarCliente` com os dados retornados)

Reutiliza 100% do `ClienteForm` existente — sem duplicacao de codigo.

