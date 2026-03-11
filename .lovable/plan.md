

## Diagnóstico

O sistema de renovação **não cria contratos filhos** — ele apenas estende as datas do contrato existente e cria um registro na tabela `aditivos_contratuais`. Porém, a implementação anterior de "mãe e filhos" no `Contratos.tsx` tentava vincular `aditivo.numero` a `contrato.numero`, o que nunca funciona porque nenhum contrato novo é criado.

**Dados atuais no banco:**
- 1 contrato: número "4", status ATIVO
- 0 registros em `aditivos_contratuais` (as renovações falharam por erros anteriores de RLS/schema)

## Plano: Mostrar histórico de renovações no contrato

Como a arquitetura atual não cria contratos filhos (apenas aditivos), a abordagem correta é mostrar os **aditivos como sub-registros** do contrato pai na listagem.

### Alterações

**1. `src/pages/Contratos.tsx`** — Reescrever a lógica parent-child

- Em vez de tentar mapear `aditivo.numero` → `contrato.numero`, mostrar os aditivos diretamente como linhas filhas expandíveis abaixo do contrato pai.
- Cada contrato que tem aditivos mostra um botão de expandir com badge "X renovação(ões)".
- Ao expandir, exibe as renovações com: número do aditivo, data de criação, valor, status.

**2. `src/hooks/useSupabaseContratos.ts`** — Ajustar query de aditivos

- Trazer campos adicionais: `justificativa`, `criado_em`, `valor`, `descricao`.
- Remover a dependência de `childToParentMap` baseada em `contrato.numero`.

**3. `src/components/modals/RenovarContratoModal.tsx`** — Corrigir criação do aditivo

- A RLS de INSERT para `aditivos_contratuais` exige roles `vendedor`, `gestor` ou `admin`. Verificar se `master` está incluído (mesmo problema do `titulos`).

**4. Migração SQL** — Adicionar `is_master` na RLS de INSERT de `aditivos_contratuais`

```sql
DROP POLICY IF EXISTS "Staff pode criar aditivos" ON public.aditivos_contratuais;
CREATE POLICY "Staff pode criar aditivos" ON public.aditivos_contratuais 
FOR INSERT TO authenticated
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);
```

### Resultado esperado

Na aba "Todos", cada contrato mostra suas renovações (aditivos) como linhas aninhadas com ícone de renovação, número (ex: "4.1"), valor e data. O fluxo de renovação também passa a funcionar para usuários `master`.

