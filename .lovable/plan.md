

# Fix WhatsApp Instance Edge Function Errors

## Problems Identified

From the logs:
- **Delete returns 401**: `uazapi delete response: 401 {"code":401,"message":"Invalid token."}` — the delete endpoint needs `admintoken`, not instance `token`
- **Connect returns 401**: Same issue — old/invalid instance token being used for connect
- **CORS headers incomplete**: Missing `x-supabase-client-platform` and other headers the Supabase JS client sends, which can cause preflight failures on some requests
- **whatsapp-send** has the same CORS issue

## Changes

### 1. `supabase/functions/whatsapp-instance/index.ts`

**CORS headers** (line 5): Add all Supabase client headers:
```
authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

**Delete action** (line 278-283): Use `admintoken` header instead of instance `token` for the uazapi DELETE call — same pattern as instance creation:
```javascript
const deleteResp = await fetch(`${uazapiUrl}/instance/delete/${delInst.instance_name}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'admintoken': adminToken,
  },
});
```

**Connect action** (line 154-161): Add `admintoken` as fallback header alongside `token` to handle cases where the instance token is invalid:
```javascript
headers: {
  'Content-Type': 'application/json',
  'token': instance.instance_token,
  'admintoken': adminToken,
},
```

### 2. `supabase/functions/whatsapp-send/index.ts`

**CORS headers** (line 4): Same fix — add all Supabase client headers.

### 3. No frontend changes needed

The frontend code is correct; the issue is entirely in the edge function's CORS and uazapi auth headers.

