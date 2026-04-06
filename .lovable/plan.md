

## Quando o Itinerário é Criado — Fluxo Atual

Hoje o fluxo funciona assim:

```text
Contrato status → ATIVO
       │
       ▼
useContratoLogisticaSync (hook client-side)
       │
       ▼
INSERT em logistica_tarefas (status=PROGRAMADO, motorista=null)
       │
       ▼
Gestor abre Itinerário Diário → vê tarefa em "Não Atribuídas"
       │
       ▼
Clica "Atribuir Motorista" → modal → UPDATE motorista_id/veiculo_id
```

**Problemas identificados:**

1. O hook `useContratoLogisticaSync` roda no **browser do gestor** — se ninguém abrir o app, a tarefa não é criada
2. Não há notificação/alerta visual de que existem tarefas pendentes de atribuição
3. A tela de itinerário mistura dados do Zustand (mock local via `itinerarioStore`) com dados reais do Supabase, gerando confusão
4. O gestor precisa entrar na aba de itinerário manualmente para descobrir que há tarefas novas

## Plano de Melhorias

### 1. Migrar a criação de tarefas para um Database Trigger (confiabilidade)
- Criar uma **edge function** ou **database trigger** que escuta INSERT/UPDATE em `contratos` com `status = 'ATIVO'`
- Isso garante que a tarefa é criada mesmo que ninguém esteja com o app aberto
- Remover a lógica duplicada do `useContratoLogisticaSync` (manter apenas como fallback de leitura)

### 2. Remover dependência do Zustand/mock store
- O `ItinerarioDiario.tsx` ainda importa `useItinerarioStore` (linha 32) — remover essa dependência
- Garantir que 100% dos dados venham do Supabase via `useSupabaseLogisticaTarefas`

### 3. Adicionar badge de "tarefas pendentes" no menu de Logística
- No layout ou sidebar, mostrar um contador vermelho com quantidade de tarefas com `motorista_id IS NULL` para o dia atual
- Isso alerta o gestor sem precisar entrar na aba

### 4. Melhorar a seção "Não Atribuídas" no itinerário
- Tornar mais proeminente com banner amarelo/laranja
- Adicionar botão "Atribuir Todas" para atribuição em lote
- Mostrar há quanto tempo a tarefa está pendente

### 5. Auto-refresh com Realtime
- Adicionar subscription Supabase Realtime na tabela `logistica_tarefas` para que o itinerário atualize automaticamente quando uma tarefa for criada ou modificada por outro usuário

### Alterações por arquivo

| Arquivo | Ação |
|---|---|
| `supabase/functions/criar-tarefa-logistica/index.ts` | **Novo** — Edge function trigger para criar tarefa ao ativar contrato |
| `supabase/migrations/xxx_trigger_contrato_logistica.sql` | **Nova** — Trigger que chama a edge function |
| `src/modules/logistica/ItinerarioDiario.tsx` | Remover import do `itinerarioStore`, melhorar seção "Não Atribuídas", adicionar realtime subscription |
| `src/hooks/useContratoLogisticaSync.ts` | Simplificar — remover lógica de criação (agora no trigger), manter apenas como verificador |
| `src/layouts/LogisticaLayout.tsx` | Adicionar badge com contagem de tarefas não atribuídas |

### Resumo
- 1 edge function nova (criação confiável server-side)
- 1 migração SQL (trigger)
- 3 arquivos editados (itinerário, sync hook, layout)
- Resultado: tarefas criadas de forma confiável, gestor alertado proativamente, dados 100% do Supabase

