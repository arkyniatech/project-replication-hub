

# Fix: ZapSign Sandbox URL

## Problema
A edge function `zapsign-enviar` usa a URL de produção (`api.zapsign.com.br`), mas o token configurado é do ambiente sandbox. Por isso o erro "API token not found".

## Correção

### `supabase/functions/zapsign-enviar/index.ts`
Alterar a URL da API de:
```
https://api.zapsign.com.br/api/v1/docs/
```
Para:
```
https://sandbox.api.zapsign.com.br/api/v1/docs/
```

Alteração de 1 linha em 1 arquivo.

> **Nota futura:** Quando migrar para produção, basta trocar a URL de volta e atualizar o `ZAPSIGN_API_TOKEN` com o token de produção.

