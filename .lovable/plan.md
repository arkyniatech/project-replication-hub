

## Plan

### 1. NavRail: Click to navigate without expanding

**Problem**: Line 166 in `NavRail.tsx` has `onClick={() => { if (!isExpanded) onToggleExpand(); }}` on the `<nav>` element. When clicking a NavLink icon, the click propagates up and triggers `onToggleExpand()` which calls `expandPanel()` -- and `expandPanel()` sets `isPinned = true`, forcing the menu open.

**Fix**:
- **`NavRail.tsx`**: Remove the `onClick` handler from the `<nav>` element. The NavLink icons already navigate via `react-router-dom`. The menu button at the bottom already has its own `onClick` with `e.stopPropagation()`.
- **`NavRail.tsx`**: Add `e.stopPropagation()` or `onClick` prevention on NavLink items to ensure they only navigate, not expand.

### 2. NavRail: Expand/Minimize adjusts content area

**Status**: This already works via `AppShell.tsx` lines 104-108 which use `isPinned` to set `marginLeft` and `width`. The issue is that `expandPanel` always sets `isPinned = true`. After fix #1, this should work correctly since the bottom Menu button is the only way to toggle expand, and `collapsePanel` sets `isPinned = false`.

**Fix**:
- **`useNavRail.ts`**: Keep `expandPanel` setting `isPinned = true` (expanding = pinning the sidebar). Keep `collapsePanel` setting `isPinned = false`. This is already the correct behavior -- expand pushes content, collapse brings content back.

### 3. Contracts: Show parent-child relationships (mãe e filhos)

**Problem**: When a contract is renewed, an `aditivos_contratuais` record is created and a new contract is generated (`RenovarContratoModal.tsx`). However, the contract list doesn't show the relationship between original (mãe) and renewed (filho) contracts.

**Approach**:
- In the contract list (`Contratos.tsx`), group contracts by their renewal chain. The `aditivos_contratuais` table links renewals to the parent `contrato_id`.
- Fetch aditivos data alongside contracts to identify parent-child relationships.
- Display contracts in a tree-like structure: parent contract with indented child renewals beneath it, using a collapsible UI pattern.
- Show a visual indicator (badge/icon) for parent contracts that have renewals and for child contracts that are renewals.

**Files to modify**:
- `src/hooks/useSupabaseContratos.ts` -- Add query to fetch aditivos with linked contract numbers
- `src/pages/Contratos.tsx` -- Group contracts by parent/child and render tree structure
- `src/components/layout/NavRail.tsx` -- Remove nav-level onClick
- `src/hooks/useNavRail.ts` -- No changes needed (expand/collapse already adjusts layout)

