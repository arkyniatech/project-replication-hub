## Rodada 1 — Correções de urgência alta

Escopo: **#7, #8, #11, #12 (parcial), #15, #16**. Os demais itens (#13, #14, #10, #9, #6) ficam para rodadas seguintes após aprovação desta.

---

### #7 — Erro ao cadastrar novo modelo

**Diagnóstico:** o Postgres retorna `duplicate key value violates unique constraint "modelos_equipamentos_prefixo_codigo_key"`. O form está enviando um `prefixo`+`codigo` que já existe (provavelmente vazio/`null` em outro modelo, ou colidindo com um modelo recém-criado).

**Correção:**
1. Migration: relaxar o unique constraint `modelos_equipamentos_prefixo_codigo_key` para permitir múltiplos modelos sem código (`WHERE codigo IS NOT NULL AND codigo <> ''`), mantendo a unicidade só quando o código é preenchido.
2. No form de "Novo Modelo", autogerar `codigo` a partir do nome+grupo quando o usuário não informar, validando no client com Zod.
3. Tratar o erro 23505 do Postgres no `useSupabaseModelos.create` com toast amigável ("Já existe um modelo com este código no grupo").

---

### #8 — Código do equipamento amigável (formato `CT-081`)

**Estado atual:** o card mostra `LA416211070` (código interno auto) em destaque e `S/N: 081` como secundário.

**Correção (apenas apresentação, sem migração):**
1. Criar helper `formatCodigoExibicao(equipamento)` em `src/lib/equipamentos-utils.ts` que retorna `{prefixoGrupo}-{numeroSerie}` (ex: `CT-081`). Prefixo do grupo vem do campo `prefixo` em `grupos_equipamentos` (ou primeiras 2 letras do nome como fallback).
2. Substituir o uso de `equipamento.codigo` (LA...) pelo helper nos pontos visíveis ao usuário:
   - `EquipamentosLista.tsx` (card)
   - Wizard de contrato — lista "Equipamentos Disponíveis" (`NovoContratoV2.tsx`)
   - `ContratoDetalhes.tsx` — "Itens do Contrato"
   - Geração do PDF do contrato (`utils/contrato-pdf.ts`)
3. O código interno `LA...` continua existindo no banco como chave técnica; só fica invisível.
4. Busca/filtro passa a aceitar tanto o S/N (`081`) quanto o código composto (`CT-081`).

---

### #11 — Valor do equipamento e frete editáveis no contrato

**Estado atual:** `valorUnitario` é calculado por `precoTabela()` e nunca é editável; frete fixo em R$ 50.

**Correção:**
1. **Item do contrato**: tornar o campo `valorUnitario` editável na lista de itens da etapa do wizard. Mantém valor sugerido da tabela como default; usuário pode sobrescrever para mais ou menos. Recalcular `subtotal` ao alterar.
2. **Frete**: adicionar campo `valorFrete` editável na etapa de logística (substitui o R$ 50 fixo). Default = valor calculado pela política de deslocamento; usuário pode editar.
3. Persistir `valorUnitario` em `contrato_itens.preco_unitario` (já existe coluna) e `valorFrete` em `contratos.logistica.valorFrete` (jsonb existente).
4. Quando "Cliente retira e devolve" estiver marcado, `valorFrete = 0` e campo fica desabilitado.

---

### #12 — Contrato (3 pontos críticos do PDF)

**Estado atual no PDF:**
- Endereço puxa do cadastro do cliente em vez do endereço da obra/entrega informado no contrato.
- Frete não aparece como linha.
- Total fica zerado (não soma frete + itens).

**Correção em `src/utils/contrato-pdf.ts` e `ContratoResumoPreview.tsx`:**
1. **Endereço de entrega**: priorizar nessa ordem — (1) endereço da obra vinculada (`obras.endereco`), (2) `logistica.endereco` informado no wizard, (3) endereço do cadastro do cliente como último fallback. Adicionar bloco "Local de Entrega" separado de "Dados do Cliente".
2. **Frete**: adicionar linha "Taxa de Entrega/Frete" na tabela de valores, lendo `contrato.logistica.valorFrete`.
3. **Total**: recalcular como `Σ subtotal_itens + valorFrete` (estava ignorando o frete). Ajustar também o "Total" exibido no rodapé da etapa 7 do wizard.

> Refinamento de layout/campos extras para igualar o PDF da loja fica para rodada futura, quando o PDF modelo for anexado.

---

### #15 — Substituir item do contrato não funciona

**Bug exato (`ContratoDetalhes.tsx:739`):** o `onSubstituir` chama apenas `toast({ title: 'Iniciando substituição...' })` e **nunca abre o `SubstituicaoModal`** (que já existe e está montado na linha 792).

**Correção (1 linha):**
```tsx
onSubstituir={(itemId) => {
  setItemParaSubstituir(itemId);
  setShowSubstituicaoModal(true);
}}
```
Validar o fluxo completo do modal (`SubstituicaoModal.tsx`) depois — o código de finalização (`completeSubstituicao`) já está implementado.

---

### #16 — Contas a Receber não atualizam após criar contrato

**Diagnóstico provável:** ao salvar o contrato como ATIVO, a função `gerarTitulosFechamento` (em `src/lib/contratos-v2-utils.ts`) ou não está sendo chamada, ou está gravando em tabela errada (legacy vs `titulos`). A página Contas a Receber lê de `titulos`/`faturas`, então se a geração for local-only, nada aparece.

**Correção:**
1. Auditar `NovoContratoV2.tsx` no submit final: garantir que após `INSERT` em `contratos` + `contrato_itens` com status ATIVO, seja chamada a geração de `titulos` na tabela Supabase `titulos` (não em store local).
2. Criar/ajustar função `gerarTitulosContrato(contratoId)` que insere em `public.titulos`:
   - 1 título por parcela (lendo `contrato.condicoes_pagamento`)
   - Vencimento conforme regra do contrato
   - `cliente_id`, `loja_id`, `contrato_id`, `valor`, `status = 'ABERTO'`, `tipo = 'LOCACAO'`
3. Adicionar trigger Postgres alternativa (ou função RPC) caso a chamada client-side seja perdida em refresh — preferência: gerar via RPC `gerar_titulos_contrato(p_contrato_id uuid)` chamada explicitamente no submit.
4. Validar que `useSupabaseTitulos` (usado em Contas a Receber) refaz query após o submit (invalidar `['titulos']` no React Query).

---

### Detalhes técnicos por arquivo

```text
Banco:
  - migration: relaxar unique modelos_equipamentos_prefixo_codigo
  - migration (opcional): função RPC gerar_titulos_contrato

Backend (edge functions): nenhum

Frontend:
  src/lib/equipamentos-utils.ts          (#8 helper)
  src/lib/contratos-v2-utils.ts          (#16 gerarTitulos)
  src/utils/contrato-pdf.ts              (#12)
  src/pages/equipamentos/EquipamentosLista.tsx  (#8)
  src/pages/NovoContratoV2.tsx           (#8, #11, #16)
  src/pages/ContratoDetalhes.tsx         (#8, #15)
  src/components/contratos/ContratoResumoPreview.tsx (#12)
  src/components/contratos/ItensList.tsx (#8)
  src/components/modelos/ModeloForm.tsx  (#7 — caminho exato a confirmar na implementação)
  src/hooks/useSupabaseModelos.ts        (#7 tratamento erro 23505)
```

### Validação após implementação
- Cadastrar 2 modelos sem código → ambos salvam (#7)
- Cards de equipamento mostram `CT-081`, busca por `081` encontra (#8)
- Editar valor unitário e frete no wizard, valores persistem e aparecem no PDF (#11)
- PDF traz endereço de obra + frete em linha + total somado (#12)
- Botão Substituir abre o modal (#15)
- Criar contrato ATIVO → Contas a Receber lista os títulos imediatamente (#16)
