

# Melhorar Visual da Tela de Relatórios + Expandir/Recolher NavPanel

## Problema
A tela de Relatórios está visualmente poluída — muitos cards empilhados sem hierarquia clara, e o painel lateral de navegação (NavOverlayPanel) sobrepõe o conteúdo de forma desorganizada. O usuário quer poder expandir e recolher o painel lateral.

## Solução

### 1. Melhorar o visual da página Relatórios (`src/pages/Relatorios.tsx`)
- Reorganizar o layout com um header mais limpo e compacto
- Usar ícones maiores e cards com melhor espaçamento
- Melhorar a seção de estatísticas com cores e ícones mais distintos
- Cards de relatórios com layout mais moderno (hover effects, bordas sutis)
- Seção de filtros de período mais compacta e integrada
- Relatório personalizado com visual mais atrativo

### 2. Melhorar o NavOverlayPanel (`src/components/layout/NavOverlayPanel.tsx`)
- O painel já tem funcionalidade de expandir/recolher via hover + pin
- Garantir que o botão de "Fixar menu" no rodapé do NavRail funcione como toggle expand/collapse
- Melhorar a transição visual ao abrir/fechar

### 3. AppShell - Suporte a pinned state (`src/components/layout/AppShell.tsx`)
- Quando o menu estiver "pinned", o conteúdo principal deve deslocar para a direita (marginLeft ajustado) em vez do painel sobrepor o conteúdo
- Isso dá ao usuário controle de expandir/recolher efetivamente

## Alterações Técnicas

**`src/components/layout/AppShell.tsx`** — Ajustar marginLeft do conteúdo quando `isPinned` for true (64px → 64px + 280px = 344px), com transição suave.

**`src/pages/Relatorios.tsx`** — Redesign visual:
- Header com gradiente sutil e ícone destacado
- Grid de estatísticas com ícones coloridos dentro dos cards
- Cards de relatórios com ícone à esquerda, botões mais compactos
- Selects estilizados com componentes shadcn/ui (Select)
- Espaçamento e tipografia melhorados

