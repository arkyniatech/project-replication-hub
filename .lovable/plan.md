

# Fix: `obra_id` com valor inválido "temp-cliente-endereco"

## Problema

Na linha 723, `obra_id: contrato.obra?.id || null` passa o valor `"temp-cliente-endereco"` quando o usuário escolhe "Endereço do Cliente" como local de entrega. Esse string não é um UUID válido, causando erro `22P02` no Postgres.

## Correção

Na linha 723 de `NovoContratoV2.tsx`, validar se `contrato.obra?.id` é um UUID real antes de usá-lo. Se for o placeholder `"temp-cliente-endereco"`, enviar `null`:

```typescript
// Linha 723 - de:
obra_id: contrato.obra?.id || null,
// para:
obra_id: contrato.obra?.id && contrato.obra.id !== 'temp-cliente-endereco' ? contrato.obra.id : null,
```

Alteração de 1 linha em 1 arquivo.

