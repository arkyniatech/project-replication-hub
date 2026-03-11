

# Fix: WhatsApp contact lookup case mismatch

## Problem
The `handleEnviarWhatsApp` function in `ContratoDetalhes.tsx` searches for `c.tipo === 'whatsapp'` (lowercase), but contacts are stored as `'WhatsApp'` (capitalized) in the `clientes.contatos` JSON. This causes the "cliente não possui WhatsApp cadastrado" error even when the contact exists.

## Fix

**File: `src/pages/ContratoDetalhes.tsx`**

Two locations need fixing (lines 312 and 403-404): change the `.find()` to use case-insensitive comparison:

```typescript
// Before
const contatoWhatsApp = clienteContatos.find(
  (c: any) => c.tipo === 'whatsapp' || c.tipo === 'celular'
);

// After
const contatoWhatsApp = clienteContatos.find(
  (c: any) => {
    const tipo = (c.tipo || '').toLowerCase();
    return tipo === 'whatsapp' || tipo === 'celular' || tipo === 'telefone';
  }
);
```

Both the `handleEnviarWhatsApp` function (line 403) and the earlier `handleAssinarDigitalmente` contact lookup (line 312) will be updated with the same fix.

No edge function or database changes needed.

