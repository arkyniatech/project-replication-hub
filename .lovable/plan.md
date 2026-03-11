

## Avaliação: Gestão Logística — Problemas e Melhorias

### Problemas de Performance Identificados

**1. Layout renderiza 4x `<Outlet />`**
O `LogisticaLayout` usa Radix Tabs com 4 `TabsContent`, cada um com `<Outlet />`. Radix Tabs mantém todos os conteúdos montados por padrão. Solução: usar `forceMount` apenas na aba ativa, ou trocar para renderização condicional simples.

**2. Itinerário renderiza 20 slots vazios**
O grid de horários renderiza todos os slots de 30min entre 08:00-18:00 mesmo sem tarefas, gerando DOM desnecessário. Solução: ocultar slots vazios ou colapsá-los.

**3. Endereço exibe `[object Object]`**
Linha 109 do ItinerarioDiario faz `JSON.stringify(t.endereco)` quando o endereço é um objeto JSON. Precisa formatar como `logradouro, numero - bairro`.

### Funcionalidades Incompletas

**4. Filtro de Motorista na Produtividade está vazio**
O Select de motoristas só mostra "Todos" — não carrega motoristas reais do Supabase.

**5. Quadro mistura Reagendado e Cancelado na mesma coluna**
A coluna "Reagendado/Cancelado" agrupa dois status diferentes. Melhor separar ou ao menos usar badges para diferenciar.

### Plano de Implementação

**`src/layouts/LogisticaLayout.tsx`**
- Substituir 4 `TabsContent` com `<Outlet />` por um único `<Outlet />` fora das tabs
- As tabs ficam apenas como navegação visual (já fazem navigate)

**`src/modules/logistica/ItinerarioDiario.tsx`**
- Formatar endereço: extrair `logradouro`, `numero`, `bairro`, `cidade` do objeto JSON
- Filtrar slots vazios: só renderizar slots que tenham tarefas (com opção de ver todos)

**`src/components/logistica/ProdutividadeLogistica.tsx`**
- Importar e usar `useSupabaseLogisticaMotoristas` para popular o Select de motoristas

**`src/components/logistica/QuadroLogistica.tsx`**
- Separar coluna CANCELADO de REAGENDADO, ou adicionar badge visual diferenciando

---

**Resumo**: 3 correções de performance/bugs + 2 melhorias funcionais. Foco principal no layout que monta componentes desnecessários e no endereço que aparece como JSON bruto.

