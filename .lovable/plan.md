

## Re-analise dos 3 Modulos — Status Atual

### MANUTENCAO — Correcoes Aplicadas com Sucesso

| Item | Status |
|------|--------|
| Layout Outlet unico | OK — `ManutencaoLayout.tsx` renderiza `<Outlet />` uma unica vez |
| Rotas apontam para versoes New | OK — `AreaListNew` e `OSDetalheNew` nas rotas com `:slug` |
| PedidoPecasPage migrado para Supabase | OK — usa `useSupabaseOrdensServico` |
| Padding duplo removido | OK — subpaginas sem `p-6` |
| Mecanicos hardcoded removidos | OK — filtro de mecanico agora so mostra "Todos" (sem lista fixa) |

#### Pendencias restantes (Manutencao)

**A. Filtros de Mecanico e Loja vazios (ProdutividadePage)**
Os selects de "Loja" e "Mecanico" (linhas 192-207) so tem a opcao "Todos/Todas as lojas". Nao buscam dados reais. O hardcoded foi removido mas nao foi substituido por dados do Supabase.

**B. Arquivos OLD ainda existem**
`AreaList.tsx` e `OSDetalhe.tsx` (versoes Zustand) continuam no repositorio. Nao sao mais usados pelas rotas, mas `manutencaoStore.ts` tambem permanece. Limpeza de codigo pendente.

**C. AnalisePatrimonial tem rota mas nao tem aba**
A rota `/equipamentos/analise-patrimonial` existe no `App.tsx`, mas `EquipamentosLayout.tsx` nao tem uma aba para ela. A pagina so e acessivel por URL direto.

---

### PAGAR — Correcoes Aplicadas com Sucesso

| Item | Status |
|------|--------|
| Tabelas criadas (contas_financeiras, movimentos_pagar) | OK — migration executada |
| Filtro de periodo conectado a query | OK — `periodDays` calculado e passado |
| Filtros dinamicos (lojas e categorias) | OK — `PagarParcelas.tsx` busca do Supabase |

#### Pendencias restantes (Pagar)

**D. `useSupabaseMovimentosPagar()` nunca executa no Dashboard**
`PagarDashboard.tsx` linha 97 chama `useSupabaseMovimentosPagar()` **sem parcelaId**. O hook tem `enabled: !!parcelaId` (linha 45 do hook), entao a query nunca roda. O dashboard nunca carrega movimentos — `movimentos` sera sempre `[]`.

**Correcao**: O hook precisa de um modo "todos os movimentos" quando chamado sem parcelaId (remover `enabled: !!parcelaId` ou tornar condicional).

**E. Botoes CSV/PDF no Dashboard continuam sem funcionalidade**
`handleExportData` e `handleGenerateReport` apenas mostram toast. Baixa prioridade.

---

### EQUIPAMENTOS — Verificacao

| Item | Status |
|------|--------|
| AnalisePatrimonial tem rota | OK |
| AnalisePatrimonial tem aba no layout | **NAO** — nao aparece no menu de abas |

---

### Resumo de Pendencias

| # | Prioridade | Problema | Correcao |
|---|-----------|----------|----------|
| 1 | **ALTA** | `useSupabaseMovimentosPagar` nunca executa no Dashboard (enabled: false) | Permitir query sem parcelaId |
| 2 | MEDIA | Filtros de Loja/Mecanico vazios em ProdutividadePage | Buscar de `lojas` e `pessoas` (ou produtividade agrupada) |
| 3 | MEDIA | AnalisePatrimonial sem aba no EquipamentosLayout | Adicionar aba ou decidir se deve ser acessivel |
| 4 | BAIXA | Arquivos OLD (AreaList, OSDetalhe, manutencaoStore) no repositorio | Deletar arquivos nao utilizados |
| 5 | BAIXA | Botoes CSV/PDF do Dashboard Pagar sem funcionalidade | Implementar ou remover |

### Plano de Implementacao

**Etapa 1 — Corrigir bug critico do hook de movimentos**
- Em `useSupabaseMovimentosPagar.ts`: mudar `enabled: !!parcelaId` para `enabled: true` (ou tornar condicional). Quando parcelaId nao for passado, buscar todos os movimentos.

**Etapa 2 — Popular filtros da Produtividade**
- Em `ProdutividadePage.tsx`: usar `useMultiunidade()` para lojas e extrair mecanicos unicos dos dados de produtividade ja carregados.

**Etapa 3 — Adicionar aba AnalisePatrimonial**
- Em `EquipamentosLayout.tsx`: adicionar entrada com icone `TrendingUp` e rota `/equipamentos/analise-patrimonial`.

**Etapa 4 — Limpeza de arquivos obsoletos**
- Deletar `AreaList.tsx`, `OSDetalhe.tsx`, `manutencaoStore.ts`.

