

# Fix: RLS Policy para Contratos não inclui role `master`

## Problema
A política de INSERT na tabela `contratos` verifica apenas roles `vendedor`, `gestor` e `admin`, mas o usuário logado tem role `master`. O `is_master()` não é verificado na política.

## Solução
Atualizar a política de INSERT da tabela `contratos` para incluir `is_master(auth.uid())` como condição permitida, igual já é feito em outras tabelas do sistema (ex: `clientes`, `equipamentos`).

## Alteração

**Migration SQL** — Recriar a policy `Active staff can create contracts`:

```sql
DROP POLICY IF EXISTS "Active staff can create contracts" ON public.contratos;

CREATE POLICY "Active staff can create contracts"
ON public.contratos FOR INSERT
TO public
WITH CHECK (
  is_active(auth.uid()) AND
  (
    is_master(auth.uid()) OR
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  ) AND
  loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas
    WHERE user_id = auth.uid()
  )
);
```

Também verificar e corrigir a policy de INSERT em `contrato_itens`, que tem o mesmo problema (não inclui `is_master`).

