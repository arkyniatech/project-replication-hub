
## Análise dos Módulos: RH, Relatórios, Veículos e Compras

---

### RH & PESSOAS — Problemas Encontrados

#### 1. Maioria das páginas usa Zustand/localStorage em vez de Supabase

**Páginas que usam Supabase (OK):**
- `Pessoas.tsx` — usa `useSupabasePessoas` ✅
- `PessoaDetalhes.tsx` — usa `useSupabasePessoas` + `useSupabasePessoaMovimentos` ✅

**Páginas que usam `useRhStore` (Zustand/localStorage — dados locais/mock):**
- `Ferias.tsx` — dados mock hardcoded
- `BancoHoras.tsx` — usa `useRhStore().bancoHorasMovs` + seed local
- `Ausencias.tsx` — usa `useRhStore().ausencias`
- `Holerites.tsx` — usa `useRhStore().pessoas`
- `Beneficios.tsx` — usa `useRhStore().beneficios`
- `portal/Holerites.tsx` — usa `useRhStore()`
- `portal/Ferias.tsx` — usa `useRhStore().ferias`
- Relatórios: `Executivo.tsx`, `Financeiro.tsx`, `Compliance.tsx` — todos usam `useRhStore`

**Páginas com dados 100% mock/hardcoded:**
- `Dashboard.tsx` — KPIs hardcoded (Headcount: 247, Turnover: 8.2%, etc.)
- `Ponto.tsx` — dados mock inline, sem store nem Supabase

**Impacto**: Após login, todas essas páginas mostram dados fictícios ou vazios. Apenas Pessoas e PessoaDetalhes mostram dados reais.

**Correção**: Migrar progressivamente para Supabase. Priorizar Dashboard (KPIs calculados) e páginas mais acessadas.

#### 2. Dashboard RH com KPIs estáticos

`Dashboard.tsx` (linhas 17-23) tem valores fixos como `{ title: 'Headcount', value: '247' }`. Deveria calcular a partir da tabela `pessoas`.

**Correção**: Usar `useSupabasePessoas` para calcular headcount, turnover, etc.

#### 3. Tabelas de domínio do RH não existem no Supabase

Não existem tabelas para: `ferias`, `banco_horas`, `ausencias`, `holerites`, `beneficios`, `ponto`. Apenas `pessoas` e `produtividade_manutencao` existem.

**Correção (grande escopo)**: Criar tabelas no Supabase. Dado o volume, sugerir migração faseada.

---

### RELATÓRIOS — Problemas Encontrados

#### 4. Estatísticas usam localStorage (`clienteStorage`, `equipamentoStorage`, etc.)

`Relatorios.tsx` (linhas 318-327) busca contagens de `clienteStorage.getAll()`, `equipamentoStorage.getAll()`, etc. Essas são storages locais que **não refletem dados do Supabase**.

**Impacto**: Os cards de "Contratos Ativos", "Equipamentos Disponíveis", "Faturas Pendentes" e "Clientes Ativos" mostram 0 ou dados desatualizados.

**Correção**: Substituir por queries Supabase (contratos, equipamentos, faturas, clientes — todas essas tabelas já existem no banco).

#### 5. Aba de Utilização usa store Zustand

`UtilizacaoTab` é alimentada por `useRelatorioUtilizacaoStore` (Zustand). Dados provavelmente mock/vazios.

**Correção**: Calcular utilização a partir das tabelas `contrato_itens` e `equipamentos` no Supabase.

#### 6. Aba de Faturas funciona com Supabase ✅

`useSupabaseFaturasRelatorio` busca dados reais. PDF e CSV são gerados. **OK**.

---

### VEÍCULOS — Problemas Encontrados

#### 7. Módulo inteiro usa Zustand/localStorage (`useVeiculosStore`)

**Todas** as 24 páginas/componentes do módulo de veículos usam `useVeiculosStore` (Zustand com `persist` = localStorage). Nenhuma tabela de veículos existe no Supabase.

Páginas afetadas:
- Cadastros: Veículos, Postos, Óleos, Oficinas, Serviços
- Lançamentos: Abastecimentos, Trocas de Óleo, Manutenções
- Relatórios: Eficiência, Custos, Disponibilidade, Manutenções
- Configurações

**Impacto**: Dados ficam apenas no navegador do usuário. Sem persistência real, sem compartilhamento entre usuários.

**Correção (grande escopo)**: Criar tabelas no Supabase e migrar hooks. Módulo completo precisaria de ~5-8 tabelas.

---

### COMPRAS & ESTOQUE — Problemas Encontrados

#### 8. Módulo inteiro usa Zustand/localStorage

`useComprasStore` e `useAlmoxStore` são ambos Zustand com `persist`. Nenhuma tabela de compras/estoque existe no Supabase.

Páginas afetadas:
- PainelUnificado, Requisições, Cotações, PedidosCompra, Recebimento
- EstoqueUnificado, CatálogoItens, Movimentos, Contagem

**Impacto**: Mesmo problema — dados locais, sem persistência real.

#### 9. PainelUnificado com dados mock inline

`PainelUnificado.tsx` (linhas 14-27) tem `leadTimeData` e `estoqueData` hardcoded.

**Correção**: Quando migrado para Supabase, calcular a partir dos dados reais.

---

### Resumo — Mapa de Maturidade

| Módulo | Supabase | Zustand/Local | Mock/Hardcoded |
|--------|----------|--------------|----------------|
| **RH - Pessoas** | ✅ Pessoas, PessoaDetalhes | | |
| **RH - Outros** | | ❌ Férias, BH, Ausências, Holerites, Benefícios, Portal | ❌ Dashboard, Ponto |
| **Relatórios** | ✅ Faturas | | ❌ Estatísticas (localStorage), Utilização |
| **Veículos** | | ❌ Tudo (24 arquivos) | |
| **Compras** | | ❌ Tudo (14 arquivos) | ❌ PainelUnificado |

---

### Plano de Melhorias (por prioridade)

| # | Prioridade | Tarefa | Escopo |
|---|-----------|--------|--------|
| 1 | **ALTA** | Dashboard RH: calcular KPIs reais a partir de `pessoas` | 1 arquivo |
| 2 | **ALTA** | Relatórios: substituir `clienteStorage`/etc por queries Supabase | 1 arquivo |
| 3 | **MÉDIA** | RH Férias/BancoHoras: criar tabelas e migrar | Migration + 2 arquivos |
| 4 | **MÉDIA** | Veículos: criar tabelas core (veiculos, abastecimentos, manutencoes) | Migration + hooks |
| 5 | **MÉDIA** | Compras: criar tabelas core (requisicoes, cotacoes, pedidos_compra) | Migration + hooks |
| 6 | **BAIXA** | Ponto: decidir se integra com sistema externo ou cria tabela | Avaliar |
| 7 | **BAIXA** | Relatório de Utilização: migrar para Supabase | 1 hook + 1 componente |

### Recomendação

Os itens **1 e 2** são correções rápidas (substituir dados mock/localStorage por queries Supabase em tabelas que já existem). Os itens **3-5** são migrações grandes que exigem criar múltiplas tabelas e reescrever hooks — sugiro fazê-los módulo por módulo.

**Deseja que eu implemente os itens 1 e 2 agora (correções rápidas) e planeje a migração dos módulos maiores separadamente?**
