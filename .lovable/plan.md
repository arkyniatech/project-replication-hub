

# Renovações: Listar todos os contratos ativos com opção rápida

## Problema atual
A aba "Renovações" só mostra contratos próximos do vencimento (30 dias). O usuário quer ver **todos** os contratos ativos com opção de renovar. Além disso, quer dois modos de renovação: **manter tudo** (só muda a data) ou **editar** (permite alterar itens/valores).

## Alterações

### 1. `src/pages/Contratos.tsx` — Filtro de renovações
- Alterar `contratosParaRenovacao` para incluir **todos** os contratos ativos, não só os próximos do vencimento
- Adicionar filtro "TODOS_ATIVOS" como padrão
- Manter filtros de criticidade (Hoje, Amanhã, 7 dias, Encerrados) como sub-filtros opcionais

### 2. `src/pages/Contratos.tsx` — Dois botões por contrato
Na listagem de cada contrato na aba Renovações, trocar o botão único "Renovar" por dois:
- **"Renovar Rápido"** — abre o modal com modo `manter`, que preenche automaticamente o mesmo período/forma e só pede confirmação da nova data
- **"Editar e Renovar"** — abre o modal no modo atual (editável), permitindo mudar período, quantidade, forma de cobrança

### 3. `src/components/modals/RenovarContratoModal.tsx` — Modo "manter"
- Adicionar prop `modo: 'manter' | 'editar'` (default: `'editar'`)
- No modo `'manter'`: pré-preencher período e forma com os mesmos do contrato original, desabilitar edição dos campos, mostrar resumo simplificado
- No modo `'editar'`: manter comportamento atual

### 4. KPIs atualizados
- Adicionar KPI "Total Ativos" para dar visibilidade de todos os contratos renováveis

