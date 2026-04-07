

## Analise Completa: RH, Relatorios, Veiculos, Compras

### Diagnostico

Todos os 4 modulos compartilham o mesmo problema fundamental: **dependem de dados mock hardcoded ou Zustand/localStorage** em vez do Supabase. Apenas `Pessoas.tsx` e `PessoaDetalhes.tsx` no modulo RH usam Supabase real.

---

### RH & Pessoas — Problemas por Pagina

| Pagina | Fonte de Dados | Problema |
|--------|---------------|----------|
| Dashboard.tsx | Hardcoded (247, 8.2%, etc) | KPIs ficticios, graficos estaticos |
| Vagas.tsx | `mockVagas` hardcoded | Nenhum dado real |
| Candidatos.tsx | `mockCandidatos` hardcoded | Nenhum dado real |
| Admissoes.tsx | `mockAdmissoes` hardcoded | Nenhum dado real |
| Ferias.tsx | `feriasMock` + `useRhStore` | Dados localStorage |
| BancoHoras.tsx | `useRhStore` (bancoHorasMovs) | Dados localStorage |
| Ponto.tsx | `mockPontoData` hardcoded | Nenhum dado real |
| Holerites.tsx | `useRhStore` + mock inline | Dados localStorage |
| Beneficios.tsx | `mockBeneficios` + `useRhStore` | Dados ficticios |
| Aprovacoes.tsx | Mock inline + `useRhStore` | Dados ficticios |
| Documentos.tsx | `mockTemplates` + `useRhStore` | Dados ficticios |
| Offboarding.tsx | Mock inline hardcoded | Nenhum dado real |
| SSMA.tsx | `useRhStore` | Dados localStorage |
| Portal/*.tsx | `useRhStore` | Dados localStorage |
| Relatorios/*.tsx | `useRhStore` + seed funcs | Dados localStorage |

**Seed/Mock arquivos a remover**: `seedRhContent.ts` (521 linhas), `seedRhMissing8.ts` (391 linhas), e o seeding no `RhModuleProvider.tsx`.

### Relatorios — Problemas

- `Relatorios.tsx` linhas 318-327: `estatisticas` usa `clienteStorage`, `equipamentoStorage`, `contratoStorage`, `faturaStorage` (localStorage deprecated). Deve usar queries Supabase.
- A aba de Faturas ja funciona com Supabase (`useSupabaseFaturasRelatorio`).
- `UtilizacaoTab` usa `relatorioUtilizacaoStore` (Zustand local).

### Veiculos — 100% Local

- 12 paginas, todas usam `useVeiculosStore` (Zustand persist localStorage)
- Nenhuma tabela no Supabase
- ~24 arquivos dependentes (componentes, utils, reports)

### Compras — 100% Local

- 7 paginas, todas usam `useComprasStore` ou `useAlmoxStore` (Zustand persist)
- Nenhuma tabela no Supabase
- ~14 arquivos dependentes

---

### Plano de Implementacao

**Foco: remover dados mock/ficticios e conectar ao Supabase onde possivel. Modulos sem tabelas (Veiculos/Compras) ficam com telas vazias funcionais (empty states) em vez de dados falsos.**

#### Etapa 1 — RH Dashboard: KPIs reais da tabela `pessoas`

Reescrever `Dashboard.tsx` para usar `useSupabasePessoas()`:
- Headcount = `pessoas.filter(p => p.situacao === 'ativo').length`
- Distribuicao por cargo/loja (agrupamento real)
- Remover arrays hardcoded `kpiData`, `headcountData`, `distribuicaoData`
- KPIs que nao tem dados reais (turnover, HE, absenteismo) mostrar "—" ou "N/D"

#### Etapa 2 — RH: Remover todos os mocks inline

Para cada pagina com `mockVagas`, `mockCandidatos`, `mockAdmissoes`, `mockPontoData`, `mockBeneficios`, etc:
- Remover arrays mock
- Mostrar empty state: "Nenhum registro encontrado"
- Manter formularios/modais funcionais (sem submit real, apenas UI)
- Paginas que usam `useRhStore` para `pessoas` trocar por `useSupabasePessoas()`

#### Etapa 3 — RhModuleProvider: Remover seeding

- Remover imports de `seedRhContent` e `seedRhMissing8`
- Remover logica de seed no `useEffect`
- Manter Provider apenas para scope/filters/devProfile

#### Etapa 4 — Deletar arquivos de seed

- `src/modules/rh/utils/seedRhContent.ts`
- `src/modules/rh/utils/seedRhMissing8.ts`

#### Etapa 5 — Relatorios: Estatisticas do Supabase

Reescrever `estatisticas` em `Relatorios.tsx`:
- Remover imports de `clienteStorage`, `equipamentoStorage`, `contratoStorage`, `faturaStorage`
- Usar queries Supabase inline: `supabase.from('contratos').select('id, status')`, etc.
- Buscar contagens reais de contratos, equipamentos, faturas, clientes

#### Etapa 6 — Veiculos e Compras: Limpar mock data

- Nos stores (`veiculosStore.ts`, `comprasStore.ts`, `almoxStore.ts`): remover qualquer seed/mock data pre-populado
- Nas paginas: garantir empty states quando nao ha dados
- **NAO** migrar para Supabase agora (escopo grande demais) — manter Zustand funcional mas sem dados ficticios

---

### Arquivos Modificados (estimativa)

| Etapa | Arquivos |
|-------|----------|
| 1 | `Dashboard.tsx` |
| 2 | `Vagas.tsx`, `Candidatos.tsx`, `Admissoes.tsx`, `Ferias.tsx`, `BancoHoras.tsx`, `Ponto.tsx`, `Holerites.tsx`, `Beneficios.tsx`, `Aprovacoes.tsx`, `Documentos.tsx`, `Offboarding.tsx`, `SSMA.tsx`, `Portal.tsx` e sub-paginas |
| 3 | `RhModuleProvider.tsx` |
| 4 | Deletar 2 arquivos |
| 5 | `Relatorios.tsx` |
| 6 | Verificar stores por seed data |

