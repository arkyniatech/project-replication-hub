

# Ajuste do Menu: Alinhamento e Comportamento de Clique

## Problemas identificados

1. **Alinhamento**: Os ícones no NavRail não estão perfeitamente alinhados com os textos no painel expandido. As alturas dos itens e espaçadores de seção estão levemente diferentes entre os dois componentes.
2. **Comportamento**: Atualmente o menu abre com hover — o usuário quer que abra ao clicar e fique fixo automaticamente.

## Alterações

### 1. `src/components/layout/NavRail.tsx`
- Remover `onMouseEnter` do `<nav>` (não abre mais no hover)
- No botão Menu (bottom), ao clicar: expandir **e fixar** o painel automaticamente
- Ajustar altura dos itens para `h-10` consistente e espaçadores de seção para coincidir exatamente com os headers do overlay (`h-[28px]` — py-1 + text-[10px] + tracking)
- Ao clicar num ícone do rail, além de navegar, expandir e fixar o painel

### 2. `src/components/layout/NavOverlayPanel.tsx`
- Padronizar altura dos itens do menu para `h-10` (mesma do rail)
- Ajustar padding dos wrappers `py-1` → `py-0.5` para alinhar pixel-a-pixel com o rail
- Ajustar altura dos headers de seção para `h-[28px]` com flex/items-end

### 3. `src/hooks/useNavRail.ts`
- Alterar `expandPanel` para também fixar (pin) automaticamente
- Remover lógica de hover/inatividade — o menu só fecha ao clicar para desafixar
- Manter `onMouseEnterRail` mas como no-op ou remover

### 4. `src/components/layout/AppShell.tsx`
- Remover `onMouseEnter={onMouseEnterRail}` do NavRail (comportamento de hover desativado)

## Resultado esperado
- Clicar no ícone de menu ou em qualquer ícone do rail → painel abre e fica fixo
- Ícones do rail alinhados verticalmente com os itens de texto do painel
- Desafixar apenas pelo botão de pin no footer do painel

