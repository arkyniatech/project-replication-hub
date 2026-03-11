

## Plano: Visualizar Aditivo + Limpar opções do "Novo Aditivo"

### Problema
1. Não existe botão "Ver" para visualizar detalhes de um aditivo — só editar/deletar
2. O "Novo Aditivo" oferece "Renovação" como tipo, mas renovação tem fluxo próprio — isso confunde

### Alterações

**`src/components/contratos/AditivosTab.tsx`**
- Adicionar state `aditivoVisualizando` e botão "Ver" (ícone Eye) nas ações de cada aditivo
- Renderizar novo componente `VisualizarAditivoModal`

**`src/components/contratos/VisualizarAditivoModal.tsx`** (novo)
- Dialog read-only mostrando todos os campos do aditivo: número, tipo, descrição, justificativa, valor, vinculação, data de criação, criado por, status
- Layout limpo com ícones e badges coloridos por tipo
- Botão "Editar" no footer (se tiver permissão) que abre o modal de edição

**`src/components/contratos/NovoAditivoModal.tsx`**
- Remover "RENOVACAO" da lista de tipos disponíveis no RadioGroup (renovação tem fluxo próprio)
- Manter apenas: DESCONTO, TAXA, AJUSTE, OUTRO

