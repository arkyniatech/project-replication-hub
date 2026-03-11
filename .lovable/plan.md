

## Plano: Anexos reais com Supabase Storage

### Situação atual
- A aba **Anexos** existe mas usa **dados mock** (hardcoded) — nada é salvo de verdade
- O upload converte para base64 mas não persiste em nenhum lugar
- A tabela `contratos` já tem um campo `documentos` (jsonb, default `[]`) que pode armazenar metadados dos anexos
- **Não existe nenhum bucket** de Storage no Supabase ainda
- O contrato assinado via ZapSign já gera um PDF base64 — seria ideal salvá-lo automaticamente nos anexos

### Alterações

**1. Criar bucket `contratos-anexos` no Supabase Storage** (migração SQL)
- Bucket público para leitura, com RLS para upload/delete
- Estrutura de pastas: `{contrato_id}/{filename}`

**2. Reescrever `AnexosTab.tsx`** — Usar dados reais
- Ler anexos do campo `contratos.documentos` (jsonb array com metadados: nome, path, tag, tamanho, usuario, data)
- Exibir com layout limpo: ícone por tipo, tag colorida, botões de ação
- Download real via Storage URL pública
- Preview inline para imagens e PDFs

**3. Reescrever `UploadAnexoModal.tsx`** — Upload real
- Upload do arquivo para o bucket `contratos-anexos/{contrato_id}/`
- Salvar metadados no campo `documentos` do contrato (append ao array jsonb)
- Tags: CONTRATO, ASSINATURA, OS, FOTO, OUTROS

**4. Salvar PDF assinado automaticamente** (opcional, próxima etapa)
- Quando ZapSign retorna status ASSINADO, salvar o PDF no bucket e adicionar aos documentos do contrato

### Resultado
Upload real de arquivos (PDF, fotos) vinculados ao contrato, com download funcional e visualização. O contrato assinado pode ser anexado manualmente ou automaticamente via ZapSign.

