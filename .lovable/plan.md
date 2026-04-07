

## Revisão Completa do Site — Problemas Encontrados e Correções

### Build & TypeScript
- **TypeScript compila sem erros** (0 erros)
- **Dev server roda sem warnings** (apenas aviso de browserslist desatualizado)

---

### Problemas Encontrados (por prioridade)

#### 1. CRÍTICO — Páginas usando localStorage em vez de Supabase (dados vazios/inconsistentes)

| Arquivo | Problema |
|---------|----------|
| `ClienteVisao.tsx` | Usa `clienteStorage`, `contratoStorage`, `tituloStorage` — dados locais. Deveria usar hooks Supabase |
| `Faturas.tsx` | Usa `faturaStorage` — e **nem está roteado** no App.tsx (página órfã) |
| `Relatorios.tsx` | Usa `clienteStorage`, `equipamentoStorage`, `contratoStorage`, `faturaStorage` para abas que não usam hook Supabase |
| `NovoContrato.tsx (V1)` | Usa storage local — porém é deprecated (V2 já existe) |
| `NovoContratoV2.tsx` | Usa storage como fallback — aceitável mas gera duplicatas |

#### 2. ALTO — Componentes com TODOs funcionais ativos

| Arquivo | TODO |
|---------|------|
| `PagarModal.tsx` | `comprovante_url: comprovante?.name` — upload fake, não persiste arquivo |
| `FaturamentoCarrinho.tsx` | `unidadeId: 'loja1'` hardcoded |
| `EmissaoAvulsaModal.tsx` | `generateNumber('fatura', '1')` — loja hardcoded |
| `ContratoDetalhes.tsx` | `valorPago = 0` e `recebimentos: []` — financeiro não integrado |
| `ContratoDetalhes.tsx` | `clienteBloqueado = false` — sempre false |
| `OSDetalhe.tsx` | `// TODO: Generate PDF` — botão não funciona |

#### 3. MÉDIO — Componentes usando storage local para funcionalidades ativas

| Arquivo | Uso |
|---------|-----|
| `AbrirCaixaModal.tsx` | `caixaStorage` |
| `CaixaDoDiaDrawer.tsx` | `caixaStorage` |
| `LancarDespesaModal.tsx` | `caixaStorage` |
| `DevolucaoModal.tsx` | `contratoStorage`, `tituloStorage`, `equipamentoStorage` |
| `SubstituicaoModal.tsx` | `contratoStorage` |
| `EstoqueEventHandler.tsx` | `equipamentoStorage` |
| `GlobalSearch.tsx` | `clienteStorage`, `contratoStorage`, `tituloStorage`, `equipamentoStorage` |
| `EnviarAvisoModal.tsx` | `clienteStorage`, `tituloStorage` |
| `RegistrarContatoModal.tsx` | `clienteStorage`, `tituloStorage` |
| `LayoutDocumentosForm.tsx` | `getAppConfig`, `setAppConfig` |

#### 4. BAIXO — Páginas com `@ts-nocheck` (erros de tipo suprimidos)

- `ContratoDetalhes.tsx`
- `NovoContratoV2.tsx`
- `AnalisePatrimonial.tsx`
- `EquipamentosLista.tsx`
- `Transferencias.tsx`
- `AcessoTab.tsx` (RH)
- `useSupabasePessoaMovimentos.ts` (RH)

---

### Plano de Correção (em ordem de impacto)

#### Fase 1 — Corrigir funcionalidades quebradas (5 itens)

1. **ClienteVisao.tsx → Supabase**: Substituir `clienteStorage/contratoStorage/tituloStorage` pelos hooks `useSupabaseClientes`, `useSupabaseContratos`, `useSupabaseTitulos`

2. **ContratoDetalhes.tsx — Integrar recebimentos**: Buscar `recebimentos` do Supabase para calcular `valorPago` real em vez de `0`. Verificar `clienteBloqueado` via status do cliente

3. **GlobalSearch.tsx → Supabase**: Migrar a busca global para usar dados reais do Supabase (clientes, contratos, equipamentos, títulos)

4. **FaturamentoCarrinho.tsx — Usar loja ativa**: Substituir `'loja1'` hardcoded por `lojaAtual?.id` via `useMultiunidade`

5. **Remover página órfã Faturas.tsx**: Não está no roteador e usa storage local. Pode ser deletada ou redirecionada para a aba de Faturas dentro de Relatórios

#### Fase 2 — Corrigir modais com dados locais (4 itens)

6. **DevolucaoModal.tsx → Supabase**: Ler/escrever contratos e equipamentos via hooks Supabase
7. **SubstituicaoModal.tsx → Supabase**: Mesma migração
8. **Caixa (AbrirCaixaModal/CaixaDoDiaDrawer/LancarDespesaModal)**: Verificar se `useSupabaseCaixa` cobre todos os cenários — se sim, migrar
9. **Inadimplencia modais (EnviarAvisoModal/RegistrarContatoModal)**: Migrar para hooks Supabase

#### Fase 3 — Qualidade de código (3 itens)

10. **Remover `@ts-nocheck`** dos 7 arquivos e corrigir erros de tipo
11. **Relatórios.tsx**: Migrar abas que usam storage local para Supabase
12. **OSDetalhe.tsx**: Implementar geração de PDF ou remover botão

---

### Resumo

- **5 páginas com dados quebrados** (localStorage vazio em produção)
- **6 TODOs funcionais** que afetam o comportamento do sistema
- **16 componentes** usando storage deprecated
- **7 arquivos** com `@ts-nocheck`
- **1 página órfã** sem rota

Recomendo começar pela **Fase 1** que resolve as funcionalidades visíveis que o usuário acessa diretamente. Quer que eu implemente?

