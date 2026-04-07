

## Analise Completa - Modulos Principais

### Resumo Executivo

Os modulos Dashboard, Clientes, Contratos e Logistica estao **estruturalmente OK**. Encontrei **3 problemas reais** que precisam de correcao imediata e **2 melhorias de dados** para o sistema funcionar corretamente com os dados atuais.

---

### Problema 1: RLS bloqueando criacao de faturas (CRITICO)

**Sintoma**: Erro `new row violates row-level security policy for table "faturas"` no console.

**Causa**: A policy de INSERT na tabela `faturas` aceita roles `vendedor`, `gestor`, `financeiro`, `admin` — mas **nao inclui `master`**. Os dois usuarios do sistema (`contato@arkynia.com` e `admin@locacaoerp.com`) possuem role `master`, entao nao conseguem criar faturas.

**Correcao**: Migration SQL para atualizar a policy:
```sql
DROP POLICY "Vendedor pode criar faturas" ON faturas;
CREATE POLICY "Staff pode criar faturas" ON faturas FOR INSERT
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') 
   OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'admin'))
  AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);
```

---

### Problema 2: Titulos com valor/saldo zerados

Os 2 titulos do contrato ativo tem `valor = 0` e `saldo = 0`. Mesmo com o Faturamento e Contas a Receber funcionando, os KPIs mostrarao tudo zerado.

**Correcao**: Migration SQL:
```sql
UPDATE titulos SET valor = 100, saldo = 100 
WHERE contrato_id = '53882f9f-3dd1-46ae-b75f-e48ee65cd81a';
```

---

### Problema 3: NovoContratoV2.tsx e ContratoDetalhes.tsx com @ts-nocheck

Esses dois arquivos criticos (2325 e 879 linhas) usam `@ts-nocheck`, o que significa que erros de tipo passam silenciosamente. Isso e um risco tecnico, mas **nao e urgente** — pode ser tratado em uma fase de refatoracao.

---

### Status por Modulo

| Modulo | Status | Observacoes |
|--------|--------|-------------|
| **Dashboard** | OK | Cards de acao, KPIs, modais — tudo funcional. Dados reais do Supabase via hooks. |
| **Clientes** | OK | CRUD completo, busca, Visao 360. Apenas 1 cliente cadastrado (dados de teste). |
| **Contratos** | OK | Listagem, detalhes, renovacoes, aditivos. Contrato ativo com datas de Abril. |
| **Logistica** | OK | Quadro Kanban, mobile driver, tarefas — estrutura completa. |
| **Faturamento** | PARCIAL | Filtros corrigidos no ultimo ciclo, mas criacao de faturas bloqueada pela RLS (Problema 1). |
| **Contas a Receber** | PARCIAL | Titulos com valor zerado (Problema 2). Apos correcao, KPIs e listagem funcionarao. |

---

### Plano de Correcao

1. **Migration SQL**: Corrigir RLS da tabela `faturas` para incluir `is_master()`
2. **Migration SQL**: Atualizar `valor` e `saldo` dos titulos existentes para R$100
3. Nenhuma alteracao de codigo frontend necessaria

### Arquivos Afetados

| Recurso | Alteracao |
|---------|-----------|
| Policy `faturas` (INSERT) | Adicionar `is_master()` |
| Tabela `titulos` (dados) | Atualizar valor/saldo para 100 |

