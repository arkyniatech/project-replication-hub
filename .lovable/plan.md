

# Fix: Alinhar ícones do NavRail com itens do NavOverlayPanel

## Problema
Os ícones do NavRail estão desalinhados (acima) em relação aos itens correspondentes no painel overlay. Isso acontece porque o overlay tem headers de seção ("PRINCIPAL", "OPERAÇÃO", "GESTÃO") que ocupam ~20px cada, empurrando os itens para baixo, enquanto o NavRail usa apenas separadores finos de 1px.

## Solução
Substituir os separadores do NavRail por espaçadores invisíveis que tenham a mesma altura dos headers de seção do overlay (~20px). Isso inclui o primeiro header "PRINCIPAL" que precisa de um espaçador antes dos primeiros ícones.

## Alterações

**`src/components/layout/NavRail.tsx`**:
- Antes dos ícones de "Principal", adicionar um espaçador com a mesma altura do header de seção do overlay (~20px: py-1 + text height)
- Substituir os `<div className="mx-4 h-px bg-border/50 my-2" />` separadores por espaçadores de ~20px (matching the overlay section headers)
- Os itens do NavRail: cada um tem `mb-1` + `h-12` = 52px total. Os do overlay: `space-y-0.5` + `py-1` wrapper + `py-2.5` link ≈ ~42px. Ajustar a altura dos ícones do NavRail de `h-12` para `h-10` e o `mb-1` para `mb-0.5` para melhor correspondência com o overlay.

Resultado: cada ícone do NavRail ficará na mesma posição vertical que seu item correspondente no overlay.

