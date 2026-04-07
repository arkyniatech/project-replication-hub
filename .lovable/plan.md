

## Analise e Melhorias - Gestao de Equipamentos (6 abas)

### Problemas Identificados

---

#### 1. Layout: Outlet duplicado dentro de TabsContent (BUG ESTRUTURAL)

O `EquipamentosLayout.tsx` renderiza `<Outlet />` dentro de **cada** `TabsContent`. Porem, o React Router so renderiza **um** Outlet. O resultado: o conteudo so aparece quando o `TabsContent` ativo corresponde ao valor correto. Funciona, mas e fragil e gera 6 Outlets redundantes no DOM.

**Correcao**: Renderizar `<Outlet />` uma unica vez, fora dos `TabsContent`. Remover todos os `TabsContent` e usar as tabs apenas como navegacao (que ja e o caso — `handleTabChange` faz `navigate()`).

---

#### 2. Agenda: Linhas muito pequenas (32px) e grid comprimido

A agenda usa `style={{ height: '32px' }}` para cada linha e colunas de `w-8` (32px) para os dias. Isso torna a visualizacao ilegivel, especialmente com 30 colunas. O label da data (`dd/MM`) tambem e cortado em 32px.

**Correcao**:
- Aumentar altura das linhas para `h-10` (40px)
- Aumentar largura das colunas de dias para `w-12` (48px) 
- Garantir que o grid use `overflow-x-auto` com scroll horizontal suave
- Adicionar header sticky para a coluna de equipamento

---

#### 3. Tabela de Precos: Usando store local (Zustand) em vez de Supabase

`TabelaPrecos.tsx` importa `useEquipamentosStore` para obter `grupos` e `modelos`. Esse store local (persist/localStorage) pode estar vazio ou desatualizado. As outras abas (Lista, Catalogo) ja usam `useSupabaseGrupos` e `useSupabaseModelos`.

**Correcao**: Substituir `useEquipamentosStore` por `useSupabaseGrupos` + `useSupabaseModelos` no `TabelaPrecos.tsx`. Adaptar os campos (`nome_comercial` vs `nomeComercial`, `grupo_id` vs `grupoId`, `tabela_por_loja` vs `tabelaPorLoja`).

---

#### 4. Conferencia de Estoque: Mesma fonte de dados errada

`ConferenciaEstoque.tsx` usa `useEquipamentosStore` para `grupos`, `modelos` e `lojas`. Dados podem estar vazios.

**Correcao**: Migrar para hooks Supabase (`useSupabaseGrupos`, `useSupabaseModelos`). Para `lojas`, usar `useMultiunidade().lojas`.

---

#### 5. Catalogo: Contagem de equipamentos usando store local

`CatalogoGruposModelos.tsx` usa `useEquipamentosStore().equipamentos` para contar itens por grupo (`getEquipamentosCount`). Esse dado esta no store local e pode estar vazio.

**Correcao**: Usar `useSupabaseEquipamentos` para obter a contagem real.

---

#### 6. Headers duplicados entre Layout e paginas internas

O `EquipamentosLayout` ja renderiza titulo "Gestao de Equipamentos". Mas cada pagina filha tambem renderiza seu proprio header (ex: "Equipamentos" na Lista, "Transferencias entre Lojas", "Agenda de Disponibilidade"). Isso cria redundancia visual.

**Correcao**: Remover os headers e breadcrumbs das paginas filhas (Lista, Catalogo, Agenda, Transferencias, Precos, Conferencia) ja que o Layout cuida do contexto. Manter apenas o conteudo funcional.

---

#### 7. Transferencias: Padding duplo do container

`Transferencias.tsx` usa `className="container mx-auto p-6"` mas o layout pai ja aplica `container mx-auto p-4`. Resultado: padding dobrado.

**Correcao**: Remover `container mx-auto p-6` do componente Transferencias, usar apenas `space-y-6`.

---

### Plano de Implementacao

| # | Tarefa | Arquivos |
|---|--------|----------|
| 1 | Simplificar EquipamentosLayout — remover TabsContent duplicados, usar Outlet unico | `EquipamentosLayout.tsx` |
| 2 | Melhorar Agenda — linhas maiores, colunas mais largas, scroll horizontal | `AgendaDisponibilidade.tsx` |
| 3 | Migrar TabelaPrecos para Supabase hooks | `TabelaPrecos.tsx` |
| 4 | Migrar ConferenciaEstoque para Supabase hooks | `ConferenciaEstoque.tsx` |
| 5 | Corrigir contagem no Catalogo usando Supabase | `CatalogoGruposModelos.tsx` |
| 6 | Remover headers/breadcrumbs redundantes das paginas filhas | Todas as 6 paginas |
| 7 | Corrigir padding duplo em Transferencias | `Transferencias.tsx` |

### Sem alteracao de banco de dados necessaria

