

## Analise dos Modulos: Equipamentos, Manutencao e Pagar

---

### MANUTENCAO — Problemas Encontrados

#### 1. Layout: Outlet duplicado (mesmo bug do Equipamentos)

`ManutencaoLayout.tsx` renderiza `<Outlet />` dentro de **cada** `TabsContent` (linhas 150-180). Mesmo problema estrutural ja corrigido em Equipamentos. Apenas um Outlet e renderizado pelo React Router, os outros ficam redundantes.

**Correcao**: Renderizar `<Outlet />` uma unica vez, fora dos `TabsContent`.

#### 2. Rotas usam versao OLD (Zustand) em vez da NEW (Supabase)

`App.tsx` (linhas 349-351) registra:
- `AreaList` (usa `useManutencaoStore` — Zustand/localStorage)
- `OSDetalhe` (usa `useManutencaoStore`)

Existem versoes prontas que usam Supabase:
- `AreaListNew` (usa `useSupabaseOrdensServico` + `useSupabaseEquipamentos`)
- `OSDetalheNew` (usa `useSupabaseOrdensServico` + `useSupabaseEquipamentos`)

Resultado: ao clicar "Ver Area" ou "Ver OS" no PainelMecanico (que usa Supabase), o usuario cai nas paginas OLD que buscam dados do localStorage vazio. **Nada aparece**.

**Correcao**: Trocar as rotas para usar `AreaListNew` e `OSDetalheNew`. Remover os arquivos OLD.

#### 3. PedidoPecasPage usa Zustand (dados locais vazios)

`PedidoPecasPage.tsx` importa `useManutencaoStore` para ordens, pedidos e todas as acoes. Nao existe versao "New" para essa pagina.

**Correcao**: Migrar para hooks Supabase (`useSupabaseOrdensServico`) ou criar um hook dedicado.

#### 4. ChecklistRunner e OSTimeline tipados com tipos locais

Ambos componentes aceitam `OSOficina` (tipo do Zustand) como prop, mas `OSDetalheNew` passa `os as any` para contornar. Isso mascara erros de tipo.

**Correcao**: Atualizar props para aceitar o tipo `OrdemServico` do Supabase ou criar interface compartilhada.

#### 5. Filtros de Produtividade com mecanicos hardcoded

`ProdutividadePage.tsx` (linhas 207-210) lista mecanicos como `"Mecânico 1"`, `"Mecânico 2"`. Deveria buscar de `pessoas` ou `user_profiles`.

**Correcao**: Buscar mecanicos do Supabase.

#### 6. Subpaginas com padding duplo

PainelMecanico, AreaList, OSDetalhe todas usam `p-6`, mas o Layout ja aplica `p-6`. Padding dobrado.

**Correcao**: Remover `p-6` das paginas filhas.

---

### PAGAR — Problemas Encontrados

#### 7. Tabelas `movimentos_pagar` e `contas_financeiras` nao existem no banco

A query confirmou que essas tabelas **nao existem** no Supabase. Os hooks `useSupabaseMovimentosPagar` e `useSupabaseContasFinanceiras` vao falhar silenciosamente ou retornar erro.

Impacto:
- `PagarDashboard`: KPIs de "Saldo das Contas" e "Saldo Apos Pagamentos" = 0
- `PagarModal`: Nao lista contas disponiveis para pagamento
- Registrar pagamento falha

**Correcao**: Criar as tabelas `movimentos_pagar` e `contas_financeiras` no Supabase com RLS.

#### 8. Filtros de Unidade e Categoria hardcoded

`PagarParcelas.tsx` (linhas 306-325) lista "Matriz", "Filial Norte", "Filial Sul" fixo, e categorias "A5.01" a "A5.05" fixas. Deveria buscar de `lojas` e `categorias_n2`.

**Correcao**: Usar `useMultiunidade().lojas` e `useSupabaseCategoriasN2()`.

#### 9. Dashboard Pagar: botoes CSV/PDF sem funcionalidade real

`handleExportData` e `handleGenerateReport` apenas mostram toast. Nao exportam nada.

**Correcao (menor prioridade)**: Implementar export real ou remover botoes.

#### 10. Dashboard Pagar: periodo selecionado nao afeta a query

O `selectedPeriod` (7d/30d/90d) nao e passado para `useSupabaseParcelasPagar`. A query sempre busca 30 dias.

**Correcao**: Conectar o filtro de periodo a query.

---

### EQUIPAMENTOS — Verificacao Pos-Correcao

#### 11. AnalisePatrimonial.tsx nao esta nas rotas

Existe `src/pages/equipamentos/AnalisePatrimonial.tsx` mas nao aparece no `EquipamentosLayout` nem nas rotas. Pagina orfã.

**Verificar**: Se deve ser adicionada como aba ou removida.

---

### Plano de Implementacao (por prioridade)

| # | Prioridade | Tarefa | Arquivos |
|---|-----------|--------|----------|
| 1 | CRITICA | Trocar rotas para AreaListNew e OSDetalheNew | `App.tsx` |
| 2 | CRITICA | Criar tabelas `movimentos_pagar` e `contas_financeiras` | Migration SQL |
| 3 | ALTA | Simplificar ManutencaoLayout (Outlet unico) | `ManutencaoLayout.tsx` |
| 4 | ALTA | Migrar PedidoPecasPage para Supabase | `PedidoPecasPage.tsx` |
| 5 | ALTA | Conectar filtro de periodo no Dashboard Pagar | `PagarDashboard.tsx` |
| 6 | MEDIA | Atualizar tipos ChecklistRunner e OSTimeline | `ChecklistRunner.tsx`, `OSTimeline.tsx` |
| 7 | MEDIA | Filtros dinamicos no Pagar (lojas e categorias) | `PagarParcelas.tsx` |
| 8 | MEDIA | Remover padding duplo das subpaginas Manutencao | 5 paginas |
| 9 | MEDIA | Buscar mecanicos reais nos filtros de Produtividade | `ProdutividadePage.tsx` |
| 10 | BAIXA | Remover arquivos OLD (AreaList.tsx, OSDetalhe.tsx) | 2 arquivos |
| 11 | BAIXA | Verificar AnalisePatrimonial.tsx (orfão) | Avaliar |

### Tabelas a criar no Supabase

```text
contas_financeiras
├── id (uuid, PK)
├── loja_id (uuid, FK lojas)
├── nome (text)
├── tipo (text: CORRENTE, POUPANCA, CAIXA)
├── banco (text)
├── agencia (text)
├── conta (text)
├── saldo_atual (numeric, default 0)
├── ativa (boolean, default true)
├── created_at / updated_at

movimentos_pagar
├── id (uuid, PK)
├── parcela_id (uuid, FK parcelas_pagar)
├── titulo_id (uuid, FK titulos_pagar)
├── conta_id (uuid, FK contas_financeiras)
├── loja_id (uuid, FK lojas)
├── data_pagamento (date)
├── valor_bruto (numeric)
├── juros (numeric, default 0)
├── multa (numeric, default 0)
├── desconto (numeric, default 0)
├── valor_liquido (numeric, generated)
├── forma (text)
├── comprovante_url (text)
├── observacoes (text)
├── created_by (uuid, FK auth.users)
├── created_at (timestamptz)
```

