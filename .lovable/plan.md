

# Fix: Edge Function payload/methods para uazapi v2

## Problema
A API uazapi v2 espera campos e métodos HTTP diferentes do que estamos enviando:

1. **`/instance/init`** — espera `{ "name": "..." }` no body, mas estamos enviando `{ "instanceName": "..." }`
2. **`/instance/connect`** — usa header `token` e body opcional `{ "phone": "..." }`. Não precisa de `instanceName` no body
3. **`/instance/status`** — é **GET** (não POST), usa header `token`
4. **`/instance/delete`** — é **DELETE** (não POST), usa header `admintoken`

## Correções no `supabase/functions/whatsapp-instance/index.ts`

### 1. Action `create` (linha 90)
```diff
- body: JSON.stringify({ instanceName: instance_name }),
+ body: JSON.stringify({ name: instance_name }),
```

### 2. Action `connect` (linhas 153-160)
Remover `instanceName` do body. O endpoint identifica a instância pelo `token` no header:
```diff
  const connectResponse = await fetch(`${uazapiUrl}/instance/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': instance.instance_token || adminToken,
    },
-   body: JSON.stringify({ instanceName: instance.instance_name }),
+   body: JSON.stringify({}),
  });
```

### 3. Action `status` (linhas 206-213)
Mudar de POST para GET, sem body:
```diff
- const statusResp = await fetch(`${uazapiUrl}/instance/status`, {
-   method: 'POST',
+ const statusResp = await fetch(`${uazapiUrl}/instance/status`, {
+   method: 'GET',
    headers: {
-     'Content-Type': 'application/json',
      'token': inst.instance_token,
    },
-   body: JSON.stringify({ instanceName: inst.instance_name }),
  });
```

### 4. Action `delete` (linhas 274-281)
Mudar de POST para DELETE:
```diff
- await fetch(`${uazapiUrl}/instance/delete`, {
-   method: 'POST',
+ await fetch(`${uazapiUrl}/instance/delete`, {
+   method: 'DELETE',
    headers: {
-     'Content-Type': 'application/json',
      'admintoken': adminToken,
+     'token': delInst.instance_token,
    },
-   body: JSON.stringify({ instanceName: delInst.instance_name }),
  });
```

### 5. Adicionar log do body enviado (debugging)
Adicionar `console.log` do body exato antes do fetch para facilitar debug futuro.

## Resumo
Todas as 4 ações precisam de ajuste para seguir a documentação oficial da uazapi v2. A principal causa do erro atual é o campo `name` vs `instanceName` no `/instance/init`.

