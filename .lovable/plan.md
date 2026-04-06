

## Plano: Implementar Itinerários Reais no Supabase

### Situação Atual

- Quando um contrato é ativado, o `useContratoLogisticaSync` cria automaticamente uma **tarefa** na tabela `logistica_tarefas` com status `PROGRAMADO`
- A tarefa é criada **sem motorista e sem veículo** (`motorista_id` e `veiculo_id` ficam `null`)
- Não existe tabela `logistica_itinerarios` no banco — o conceito de "itinerário" (agrupar tarefas por motorista+veículo+dia) só existe como mock local no Zustand
- O itinerário diário mostra todas as tarefas do dia sem agrupamento por motorista

### O que vai mudar

O gestor de logística poderá atribuir motorista e veículo às tarefas pendentes diretamente na tela de itinerário. As tarefas serão agrupadas visualmente por motorista, formando o "itinerário do dia" sem necessidade de uma tabela extra.

### Abordagem: Sem tabela nova

A tabela `logistica_tarefas` já possui `motorista_id` e `veiculo_id`. Basta:
1. Permitir atribuição via UI
2. Agrupar tarefas por motorista na visualização

Isso evita complexidade de sincronização entre duas tabelas.

### Alterações

**1. Migração SQL** — Nenhuma necessária (colunas `motorista_id` e `veiculo_id` já existem)

**2. `src/components/logistica/AtribuirTarefaModal.tsx`** (novo)
- Modal para atribuir motorista + veículo a uma ou mais tarefas selecionadas
- Select de motoristas (do hook existente) e veículos (do hook existente)
- Botão "Atribuir" que faz update em `logistica_tarefas` via Supabase

**3. `src/modules/logistica/ItinerarioDiario.tsx`** (refatorar)
- Adicionar botão "Atribuir motorista" nas tarefas que não têm `motorista_id`
- Agrupar tarefas por `motorista_id` no grid (seções colapsáveis por motorista)
- Tarefas sem motorista aparecem em seção "Não atribuídas" no topo
- Buscar nome do motorista/veículo via join ou lookup local

**4. `src/hooks/useSupabaseLogisticaTarefas.ts`** (ajustar)
- Adicionar filtro por `motorista_id` direto (coluna já existe na tabela, não precisa mais fazer sub-query em `logistica_itinerarios`)
- Simplificar a query removendo o workaround de buscar itinerários

**5. `src/hooks/useContratoLogisticaSync.ts`** (melhorar)
- Quando só existe 1 motorista ativo na loja, atribuir automaticamente
- Quando há múltiplos, manter `null` para atribuição manual

### Fluxo Final

```text
Contrato Ativado
      │
      ▼
Tarefa criada (PROGRAMADO, motorista=null)
      │
      ▼
Gestor abre Itinerário Diário
      │
      ├─ Seção "Não Atribuídas" → botão "Atribuir"
      │         │
      │         ▼
      │   Modal: escolher motorista + veículo
      │         │
      │         ▼
      │   UPDATE motorista_id, veiculo_id
      │
      ▼
Tarefas agrupadas por motorista (itinerário visual)
```

### Resumo
- 1 componente novo (modal de atribuição)
- 2 arquivos editados (itinerário + hook de tarefas)
- 1 melhoria no sync (auto-atribuição quando há 1 motorista)
- Zero migrações SQL

