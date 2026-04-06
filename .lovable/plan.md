

## Varredura Completa — LocaHub ERP

### Arquitetura: O Problema Central

O sistema tem **duas camadas de dados concorrentes**:

1. **Supabase (real)** — 33 tabelas no banco, com hooks `useSupabase*` (44 hooks)
2. **Zustand/localStorage (mock)** — 16 stores locais + `localStorage` via `storage-deprecated.ts`

Muitas telas ainda usam dados mock enquanto outras já migraram para Supabase. Isso causa inconsistências graves.

---

### Diagnóstico por Módulo

#### DASHBOARD (/)
| Item | Status | Problema |
|------|--------|----------|
| KPIs de contratos/equipamentos | OK | Usa `useSupabaseContratos` e `useSupabaseEquipamentos` |
| Títulos a receber | MOCK | Usa `tituloStorage.getAll()` (localStorage) em vez de `useSupabaseTitulos` |
| Caixa do dia | OK | Usa `useSupabaseCaixa` |

#### CLIENTES (/clientes)
| Item | Status | Problema |
|------|--------|----------|
| Listagem | A verificar | Pode estar em Supabase (tabela `clientes` existe) |

#### EQUIPAMENTOS (/equipamentos/*)
| Item | Status | Problema |
|------|--------|----------|
| Lista/Detalhes | OK | Supabase |
| Catálogo de modelos | OK | Supabase (`modelos_equipamentos`, `grupos_equipamentos`) |
| Tabela de preços | OK | Supabase (`historico_precos`) |
| Agenda disponibilidade | MOCK | Store `agendaDisponibilidadeStore` (Zustand) |
| Conferência de estoque | MOCK | Store `conferenciaStore` (Zustand) |
| Transferências | PARCIAL | Hook Supabase existe, mas store Zustand também |
| Análise patrimonial | A verificar | |

#### CONTRATOS (/contratos/*)
| Item | Status | Problema |
|------|--------|----------|
| Listagem | OK | Supabase |
| Novo contrato (V2) | OK | Supabase |
| Detalhes/Timeline | PARCIAL | Timeline usa `timelineStore` (Zustand) |
| Aditivos | OK | Supabase |
| Cancelamento/Devolução | PARCIAL | TODOs no código — `usuarioNome: 'Usuário' // TODO: pegar do auth` |

#### FINANCEIRO — Contas a Receber
| Item | Status | Problema |
|------|--------|----------|
| Contas a receber | PARCIAL | Tabela `titulos` existe, mas Dashboard ainda usa localStorage |
| Faturamento | MOCK | Store `faturamentoStore` (Zustand), `emitidaPor: 'admin' // TODO` |
| Inadimplência | PARCIAL | Aging usa dados reais, mas cálculos podem ter gaps |
| Gestão CR | A verificar | |

#### FINANCEIRO — Contas a Pagar
| Item | Status | Problema |
|------|--------|----------|
| Dashboard | OK | Supabase (`titulos_pagar`, `parcelas_pagar`) |
| Parcelas | OK | Supabase |
| Fornecedores | OK | Supabase |
| DRE | MOCK | Store `financeiroStore` (Zustand) |

#### LOGÍSTICA (/logistica/*)
| Item | Status | Problema |
|------|--------|----------|
| Itinerário diário | OK | Recém-migrado para Supabase + Realtime |
| Quadro de motoristas | A verificar | |
| Produtividade | A verificar | |
| Configurações | A verificar | |
| Mobile motorista | A verificar | |

#### MANUTENÇÃO (/manutencao/*)
| Item | Status | Problema |
|------|--------|----------|
| Painel mecânico | OK | Supabase (`ordens_servico`) |
| OS Detalhes | PARCIAL | `// TODO: Generate PDF` |
| Solicitações | A verificar | |
| Pedido de peças | A verificar | |

#### VEÍCULOS (/veiculos/*)
| Item | Status | Problema |
|------|--------|----------|
| Todos os sub-módulos | MOCK | Store `veiculosStore` (Zustand) com seed local. Sem tabelas no Supabase |

#### RH (/rh/*)
| Item | Status | Problema |
|------|--------|----------|
| Todos os 20+ sub-módulos | MOCK | Store `rhStore` (Zustand) com `seedRhContent()`. Tabela `pessoas` existe mas RH usa store local |
| Portal do colaborador | MOCK | Usa IDs hardcoded (`'pessoa-1'`) |
| Usuários/Perfis | PARCIAL | CRUD real via Supabase Auth, mas listagem pode ter gaps |

#### COMPRAS & ESTOQUE (/compras/*)
| Item | Status | Problema |
|------|--------|----------|
| Todos os sub-módulos | A verificar | Sem tabelas dedicadas no banco. Provavelmente mock |

#### CONFIGURAÇÕES
| Item | Status | Problema |
|------|--------|----------|
| Layout documentos | MOCK | Usa dados mockData inline |
| Config segurança | A verificar | |

#### ADMIN
| Item | Status | Problema |
|------|--------|----------|
| Gestão de usuários | OK | Supabase Auth + `user_roles` |
| Logs | PENDENTE | `{/* TODO: Implement Log List Component */}` |
| Seed page | OK | Funcional |

---

### TODOs Explícitos no Código (13 arquivos)

1. **`useSupabaseContratos.ts`** — 4x `usuarioNome: 'Usuário' // TODO: pegar do auth`
2. **`faturamentoStore.ts`** — `emitidaPor: 'admin' // TODO: get from auth`
3. **`PagarModal.tsx`** — `comprovante_url: comprovante?.name // TODO: Upload real`
4. **`BackendInterAdapter.ts`** — 6x `// TODO: Implementar quando backend estiver pronto` (BolePix inteiro)
5. **`OSDetalhe.tsx`** — `// TODO: Generate PDF`
6. **`disponibilidadeStore.ts`** — `grupoNome: 'Grupo Mock'`
7. **`UserManagement.tsx`** — `{/* TODO: Implement Log List Component */}`
8. **`centro-custo-utils.ts`** — Dados mock hardcoded

---

### Stores Zustand que Precisam ser Migradas para Supabase

| Store | Módulo | Prioridade |
|-------|--------|------------|
| `veiculosStore` | Veículos | Alta (sem tabelas no DB) |
| `faturamentoStore` | Financeiro | Alta |
| `financeiroStore` | DRE | Alta |
| `conferenciaStore` | Equipamentos | Média |
| `agendaDisponibilidadeStore` | Equipamentos | Média |
| `disponibilidadeStore` | Equipamentos | Média |
| `contratosStore` | Contratos (legacy) | Média |
| `equipamentosStore` | Equipamentos (legacy) | Média |
| `bolePixStore` | BolePix | Baixa (depende de backend Inter) |
| `transferenciasStore` | Equipamentos | Baixa (hook Supabase já existe) |
| `timelineStore` | Contratos | Baixa |
| `rhStore` (no módulo RH) | RH | Alta (20+ telas dependem) |
| `itinerarioStore` (logística) | Logística | Baixa (já migrado parcialmente) |

---

### Tabelas Supabase sem Uso Aparente

- `config_avisos_header` — causa 404
- `avisos_sistema` — causa 404
- `checklist_templates` — sem referência clara no frontend
- `horimetro_leituras` — sem referência clara no frontend
- `whatsapp_instances` / `whatsapp_verifications` — funcionalidade WhatsApp não implementada

---

### Resumo Executivo

| Categoria | Quantidade |
|-----------|-----------|
| Módulos 100% Supabase | 4 (Dashboard parcial, Contratos, Equipamentos parcial, Contas a Pagar) |
| Módulos 100% Mock | 3 (Veículos, RH, Compras) |
| Módulos Parciais | 4 (Financeiro CR, Logística, Manutenção, Equipamentos sub-telas) |
| TODOs explícitos | 13+ itens em 13 arquivos |
| Stores Zustand a migrar | 13 stores |

### Recomendação de Prioridade

1. **Migrar Dashboard** — remover `tituloStorage` do Dashboard (já existe hook Supabase)
2. **Resolver TODOs de auth** — substituir `'Usuário'` por nome real do usuário logado (5 locais)
3. **Módulo Veículos** — criar tabelas no Supabase e migrar (módulo inteiro é mock)
4. **Módulo RH** — migrar `rhStore` para Supabase (20+ telas afetadas)
5. **Faturamento/DRE** — migrar stores financeiros
6. **BolePix** — implementar backend real quando API Inter estiver disponível

Por onde quer começar?

