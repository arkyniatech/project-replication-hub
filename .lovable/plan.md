

# Melhorar UX do QR Code — loading state

## Problema
Ao clicar em "Conectar", o QR Code é setado no state antes da imagem carregar, mostrando uma imagem quebrada por alguns instantes até o browser renderizar o base64.

## Solução
1. **Mostrar spinner enquanto conecta** — quando `connectMutation.isPending` ou `isPolling` (aguardando QR do polling), exibir um placeholder com spinner no lugar do QR Code
2. **Pré-validar a imagem antes de exibir** — adicionar um state `qrImageLoaded` que só fica `true` após o `onLoad` da `<img>`. Enquanto `false`, mostrar skeleton/spinner. Resetar para `false` sempre que `qrCode` mudar.
3. **Ocultar `<img>` até carregar** — usar `className="hidden"` na img até `onLoad` disparar

## Alterações em `WhatsAppConfigForm.tsx`

### Novo state
```tsx
const [qrImageLoaded, setQrImageLoaded] = useState(false);
```

### Reset ao mudar QR
Sempre que `setQrCode(...)` for chamado, também chamar `setQrImageLoaded(false)`.

### Área do QR Code (linhas 215-229)
Substituir o bloco atual por:

- Se `connectMutation.isPending || (isPolling && !qrCode)`: mostrar placeholder com `Loader2` animado + texto "Gerando QR Code..."
- Se `qrCode` presente: mostrar container com:
  - Skeleton/spinner visível enquanto `!qrImageLoaded`
  - `<img>` com `onLoad={() => setQrImageLoaded(true)}` e classe condicional `hidden` enquanto não carregou

Isso garante transição suave sem imagem quebrada.

