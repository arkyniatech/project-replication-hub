

# Fix: "Visualizar Contrato" na Etapa 6 não abre nada

## Problema
O botão "Visualizar Contrato" na Etapa 6 (Conferência) define `showPreview = true`, mas o componente `ContratoResumoPreview` só é renderizado dentro de outra etapa (linha 1891). Como cada etapa retorna seu próprio JSX isolado, o dialog não está presente no DOM quando o usuário está na Etapa 6.

## Solução
Adicionar o `ContratoResumoPreview` também na Etapa 6, logo após o botão "Visualizar Contrato" (após linha 2119), para que o dialog seja renderizado quando `showPreview` estiver `true`.

## Alteração em `src/pages/NovoContratoV2.tsx`

Após a `</div>` do botão (linha 2119), antes de `</CardContent>`, inserir:

```tsx
<ContratoResumoPreview 
  open={showPreview} 
  onClose={() => setShowPreview(false)} 
  contrato={contrato as any} 
  onEnviarAssinatura={handleEnviarAssinatura} 
/>
```

