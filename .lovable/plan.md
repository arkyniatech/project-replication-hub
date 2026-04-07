

## Analise do Fluxo de Conferencia — Problemas Encontrados

Apos analisar o codigo em detalhe, o fluxo de Conferencia **nao pode funcionar end-to-end** no estado atual. Existem problemas estruturais que impedem o teste.

---

### Problemas Criticos

#### 1. Dados de equipamentos vem do store local (vazio)

`gerarItens()` em `conferenciaStore.ts` (linha 270) usa `useEquipamentosStore.getState()` para obter equipamentos, grupos e modelos. Esse store local (Zustand + localStorage) esta **vazio** porque os dados reais estao no Supabase. Resultado: a sessao e criada mas **sem nenhum item para contar**.

#### 2. `canEdit()` usa localStorage mock (inseguro)

Linha 750-753: `canEdit()` verifica `localStorage.getItem('rh-dev-profile')` em vez de usar roles reais do Supabase. Funciona por acaso (default 'admin'), mas e inseguro e inconsistente com o resto do sistema.

#### 3. Usuario hardcoded como "demo-user"

Linhas 72-76 em `ConferenciaEstoque.tsx` e linha 97-101 em `ContagemForm.tsx`: o usuario e sempre `{ id: "demo-user", nome: "Demo User", perfil: localStorage... }`. Nao usa o usuario autenticado real.

#### 4. Toda a persistencia e local (localStorage)

Sessoes, itens, divergencias, ajustes — tudo fica apenas no localStorage do browser. Nao ha tabelas no Supabase para conferencia. Dados nao sao compartilhados entre usuarios.

---

### Plano de Correcao

Para que o fluxo funcione de verdade, preciso migrar o modulo para Supabase:

| # | Tarefa | Detalhes |
|---|--------|----------|
| 1 | **Criar tabelas no Supabase** | `sessoes_contagem`, `itens_contagem`, `divergencias_contagem`, `ajustes_contagem` com RLS adequado |
| 2 | **Criar hooks Supabase** | `useSupabaseConferencia` com queries/mutations para substituir o store local |
| 3 | **Gerar itens a partir do Supabase** | `gerarItens()` deve buscar de `equipamentos` no Supabase (ja existem dados reais la) |
| 4 | **Usar usuario autenticado real** | Substituir "demo-user" por `supabase.auth.getUser()` |
| 5 | **Usar roles reais** | `canEdit()` deve usar `has_role()` do Supabase em vez de localStorage |
| 6 | **Adaptar componentes** | `ConferenciaEstoque.tsx`, `ContagemForm.tsx`, `SessoesList.tsx`, `ResolucaoDivergencias.tsx` para usar os novos hooks |

### Tabelas Propostas

```text
sessoes_contagem
├── id (uuid, PK)
├── loja_id (uuid, FK lojas)
├── display_no (text)
├── status (text: ABERTA, EM_CONTAGEM, EM_REVISAO, AJUSTADA, FECHADA)
├── filtros (jsonb)
├── observacao (text)
├── criada_por (uuid, FK auth.users)
├── finalizada_em (timestamptz)
├── created_at / updated_at
└── log (jsonb)

itens_contagem
├── id (uuid, PK)
├── sessao_id (uuid, FK sessoes_contagem)
├── loja_id (uuid)
├── tipo (text: SERIE, SALDO)
├── codigo (text)
├── descricao (text)
├── grupo_nome (text)
├── modelo_nome (text)
├── qtd_contada (integer, nullable)
├── observacao (text)
└── created_at / updated_at

divergencias_contagem
├── id (uuid, PK)
├── sessao_id (uuid, FK)
├── item_id (uuid, FK itens_contagem)
├── qtd_sistema (integer)
├── qtd_contada (integer)
├── delta (integer)
├── perc (numeric)
├── justificativa (text)
├── acao (text)
├── status (text)
├── anexos (jsonb)
├── exige_aprovacao (boolean)
├── aprovacao (jsonb)
└── created_at / updated_at

ajustes_contagem
├── id (uuid, PK)
├── sessao_id (uuid, FK)
├── item_id (uuid, FK)
├── delta (integer)
├── motivo (text)
├── status (text: PROPOSTO, APROVADO, REJEITADO)
├── criado_por (uuid)
├── observacao (text)
└── created_at / updated_at
```

### Sem mudanca de banco necessaria para o plano atual

A migracao criara as 4 tabelas novas + policies RLS. Nenhuma tabela existente sera alterada.

### Resultado Esperado

Apos a migracao:
- Criar sessao buscara equipamentos reais do Supabase
- Contagem sera persistida no banco, compartilhada entre usuarios
- Divergencias calculadas com dados reais do sistema
- Permissoes baseadas em roles reais (has_role)

