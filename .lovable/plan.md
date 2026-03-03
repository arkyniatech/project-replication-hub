

# Fix: Delete na uazapi nao funciona

## Problema
A URL de delete esta incorreta. O codigo atual faz `DELETE ${uazapiUrl}/instance/delete`, mas a API uazapi espera `DELETE ${uazapiUrl}/instance` com o header `token`.

## Solucao
Alterar a URL do fetch no case `delete` de `${uazapiUrl}/instance/delete` para `${uazapiUrl}/instance`.

## Alteracao

**Arquivo:** `supabase/functions/whatsapp-instance/index.ts` (linha 278)

Mudar:
```typescript
const deleteResp = await fetch(`${uazapiUrl}/instance/delete`, {
```
Para:
```typescript
const deleteResp = await fetch(`${uazapiUrl}/instance`, {
```

Depois, re-deploy da edge function.

