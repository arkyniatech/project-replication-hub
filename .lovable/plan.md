

## Plano: Tornar os aditivos (contratos filhos) interativos

### Problema
As sub-linhas dos aditivos (ex: "4.1") na listagem de contratos são apenas visuais — não têm botões de ação. O usuário não consegue visualizar, editar ou interagir com eles.

### Solução

**`src/pages/Contratos.tsx`** — Adicionar botões de ação nas sub-linhas dos aditivos:
- **Botão "Ver"** (Eye) — Navega para `/contratos/{contrato_id}?tab=aditivos` (abre a página de detalhes do contrato pai já na aba de aditivos, onde o usuário pode gerenciar o aditivo)
- **Badge clicável** com informações mais completas (justificativa, valor, datas)
- Mostrar a **justificativa** quando disponível

**`src/pages/ContratoDetalhes.tsx`** — Garantir que a aba de aditivos abre automaticamente quando recebe `?tab=aditivos` na URL, para que o usuário chegue direto no contexto certo ao clicar no aditivo.

### Resultado
Ao clicar em "Ver" no aditivo "4.1", o usuário é levado à página do contrato "4" com a aba de aditivos aberta, onde pode visualizar detalhes, editar ou gerenciar o aditivo.

