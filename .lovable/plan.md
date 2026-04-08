

## Varredura Completa do Sistema — Auditoria Ponta a Ponta

### Resumo Executivo

O sistema tem **~15 modulos** com graus variados de maturidade. Os modulos core (Dashboard, Contratos, Clientes, Equipamentos, Logistica, Manutencao, Contas a Receber, Contas a Pagar) ja usam Supabase. Porem, existem **camadas de dados ficticios, seeds, e referencias "(mock)" espalhadas por todo o sistema** que precisam ser removidas para entregar um produto limpo.

---

### CATEGORIA 1: Dados Ficticios e Seeds Ativos (CRITICO)

**1A. AppInitializer.tsx — Semeia dados falsos a cada sessao**

O `AppInitializer.tsx` executa 3 seeds a cada carga:
- `seedRhContent()`, `seedRhContentMissing()`, `seedRhMissing8()` — popula localStorage com 60+ pessoas, vagas, candidatos ficticios no modulo RH
- `initializeMockData()` — cria clientes, equipamentos, contratos falsos no localStorage
- `seedVeiculosData()` — cria veiculos, postos, oleos ficticios
- `seedContratosV2()` — cria lojas e configs mock no localStorage
- `seedIntegrationTestData()` — cria transferencia de teste

Todos esses seeds devem ser REMOVIDOS. O sistema deve iniciar vazio e popular via Supabase.

**1B. Arquivos de Seed a deletar:**
- `src/modules/rh/utils/seedRhContent.ts`
- `src/modules/rh/utils/seedRhContentMissing.ts`
- `src/modules/rh/utils/seedRhMissing8.ts`
- `src/modules/rh/utils/seedData.ts`
- `src/utils/veiculos-seed.ts`
- `src/utils/equipamentos-seed.ts`
- `src/utils/supabase-equipamentos-seed.ts`
- `src/utils/clear-equipment-storage.ts`
- `src/utils/force-reseed-equipments.ts`
- `src/lib/mock-data.ts` (813 linhas de dados ficticios)
- `src/lib/mock-financial-data.ts` (250 linhas, nao importado por ninguem)

**1C. itinerarioStore.ts — Auto-seed na importacao**
Linhas 223-228: executa `initializeWithMockData()` automaticamente se vazio. Criar motoristas/veiculos/tarefas ficticias. Logistica JA usa Supabase — este store local e redundante para itinerarios.

---

### CATEGORIA 2: localStorage Deprecated Ainda em Uso (ALTO)

**2A. Relatorios.tsx (linhas 318-327)**
Usa `clienteStorage`, `equipamentoStorage`, `contratoStorage`, `faturaStorage` para estatisticas. Deve usar Supabase queries.

**2B. NovoContratoV2.tsx**
Importa `clienteStorage, equipamentoStorage, contratoStorage` como fallback. Ja tem Supabase hooks (`useSupabaseClientes`, `useSupabaseEquipamentos`). O fallback localStorage deve ser removido e `contratoStorage.add()` deve ser substituido por `supabase.from('contratos').insert()`.

**2C. Componentes com localStorage:**
| Arquivo | Uso |
|---------|-----|
| `EstoqueEventHandler.tsx` | `equipamentoStorage.update()` |
| `RegistrarContatoModal.tsx` | `clienteStorage`, `tituloStorage` |
| `EnviarAvisoModal.tsx` | `clienteStorage`, `tituloStorage` |
| `SubstituicaoModal.tsx` | `contratoStorage` |
| `EmissaoAvulsaModal.tsx` | `faturaStorage`, `tituloStorage` |
| `AbrirCaixaModal.tsx` | `caixaStorage` |
| `CaixaDoDiaDrawer.tsx` | `caixaStorage` |
| `LancarDespesaModal.tsx` | `caixaStorage` |
| `LayoutDocumentosForm.tsx` | `getAppConfig`, `setAppConfig` |
| `taxaDeslocamentoService.ts` | `contratoStorage` |
| `useDisponibilidadeRT.ts` | `contratoStorage` |

**2D. Arquivos deprecated a remover eventualmente:**
- `src/lib/storage-deprecated.ts` (545 linhas)
- `src/lib/storage.ts` (re-export hub para deprecated)

---

### CATEGORIA 3: Palavra "mock" Visivel na UI (MEDIO)

27 arquivos contem textos como "(mock)" visiveis ao usuario. Exemplos:
- `RegistrarRecebimentoModal.tsx`: "Gerar Recibo (mock)", "Notificar cliente (mock)"
- `FaturasTab.tsx`: "Fiscal (Mock)", "Preview da Fatura (Mock)", "Dados do Boleto (Mock)"
- `ProximoPassoSnackbar.tsx`: "Segunda via do saldo foi gerada (mock)"
- `EmissaoAvulsaModal.tsx`: "PIX/Boleto disponivel (mock)"
- `FinanceiroForm.tsx`: "Contas Bancarias & PIX (Mock)"
- `SegurancaForm.tsx`: "Requer codigo adicional via SMS (Mock)"
- `ParametrizacoesLocacaoForm.tsx`: "Gerar comprovante digital (mock)"
- `FechamentoMensalDrawer.tsx`: "PDF do fechamento exportado (mock)"
- `Compliance.tsx`: toast "(mock)"

---

### CATEGORIA 4: Zustand Stores Locais (Sem Supabase)

| Store | Modulo | Status |
|-------|--------|--------|
| `veiculosStore.ts` | Veiculos | 100% local, 449 linhas |
| `comprasStore.ts` | Compras | 100% local, 395 linhas |
| `almoxStore.ts` | Almox | 100% local |
| `rhStore.ts` | RH | Usado por relatorios RH (Jornada, Financeiro, Compliance, RS) |
| `equipamentosStore.ts` | Equipamentos | Misto — algumas paginas usam Supabase, store ainda importado |
| `conferenciaStore.ts` | Conferencia | 100% local |
| `itinerarioStore.ts` | Logistica | Redundante — Logistica ja usa Supabase |
| `relatorioUtilizacaoStore.ts` | Relatorios | Gera dados ficticios (mock receita, mock manutencao) |
| `contratosStore.ts` | Disponibilidade | Synca do Supabase — OK |
| `faturamentoStore.ts` | Faturamento | Local |
| `financeiroStore.ts` | Financeiro | Local |
| `transferenciasStore.ts` | Transferencias | Local |
| `timelineStore.ts` | Timeline | Local |

---

### CATEGORIA 5: Imports Nao Utilizados no App.tsx

`App.tsx` linhas 31-34 importam mas **nunca usam** diretamente:
```
import { initializeMockData } from "./lib/mock-data";
import { seedVeiculosData } from "./utils/veiculos-seed";
import { seedContratosV2 } from "./lib/contratos-v2-utils";
import { seedEquipamentosData } from "./utils/equipamentos-seed";
```
Esses imports inflam o bundle desnecessariamente.

---

### CATEGORIA 6: AgendaDisponibilidade — Seed de Teste

`AgendaDisponibilidade.tsx` linha 85 chama `seedIntegrationTestData()` a cada render, criando transferencias ficticias.

---

### CATEGORIA 7: Funcionalidades com "user hardcoded"

- `ConciliacaoTab.tsx`: `criadoPor: 'user'`
- `EnviarAvisoModal.tsx`: `user: { id: 'user-1', nome: 'Admin' }`
- `conferenciaStore.ts`: `devProfile = localStorage.getItem('rh-dev-profile')`

Devem usar o usuario autenticado real (`useAuth()` ou `useSupabaseAuth()`).

---

### Plano de Implementacao (Priorizado)

#### Etapa 1 — Limpar AppInitializer e Imports (CRITICO)
- Remover TODOS os seeds do `AppInitializer.tsx` (manter apenas `useContratoLogisticaSync` e `useContratoManutencaoSync`)
- Remover imports mortos do `App.tsx` (linhas 31-34)
- Remover auto-seed do `itinerarioStore.ts` (linhas 223-228)
- Remover `seedIntegrationTestData()` do `AgendaDisponibilidade.tsx`

#### Etapa 2 — Deletar Arquivos de Seed/Mock (11 arquivos)
- Deletar todos os arquivos listados em 1B

#### Etapa 3 — Relatorios.tsx: Migrar Estatisticas para Supabase
- Substituir `clienteStorage.getAll()` etc por queries Supabase
- Usar `supabase.from('contratos').select('id, status')` etc

#### Etapa 4 — Remover "(mock)" da UI
- Substituir em 27+ arquivos todas as strings "(mock)", "(Mock)", "MOCK" visiveis ao usuario
- Onde a funcionalidade existe de verdade: remover a palavra
- Onde e placeholder: trocar por "Em breve" ou remover o botao

#### Etapa 5 — NovoContratoV2: Remover Fallback localStorage
- Remover imports de `clienteStorage`, `equipamentoStorage`, `contratoStorage`
- Usar apenas hooks Supabase ja existentes
- Trocar `contratoStorage.add()` por insert Supabase

#### Etapa 6 — Componentes com localStorage deprecated
- Migrar `EstoqueEventHandler`, `SubstituicaoModal`, `EmissaoAvulsaModal`, modais de inadimplencia, caixa para usar hooks Supabase

#### Etapa 7 — Stores Zustand: Limpeza
- `rhStore.ts`: manter para relatorios RH (que ainda nao tem tabelas Supabase), mas garantir que inicia vazio
- `veiculosStore.ts`, `comprasStore.ts`, `almoxStore.ts`: manter funcional mas sem seed data
- `relatorioUtilizacaoStore.ts`: remover mock de receita/manutencao

#### Etapa 8 — User Hardcoded
- Substituir `'user'`, `'user-1'`, `'Admin'` hardcoded por dados do auth context real

---

### Estimativa

| Etapa | Arquivos Afetados | Prioridade |
|-------|-------------------|------------|
| 1 | 3 | CRITICA |
| 2 | 11 deletados | CRITICA |
| 3 | 1 | ALTA |
| 4 | ~27 | ALTA |
| 5 | 1 | ALTA |
| 6 | ~10 | MEDIA |
| 7 | ~5 | MEDIA |
| 8 | ~3 | BAIXA |

