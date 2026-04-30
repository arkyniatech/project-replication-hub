## Plano: Conclusão dos feedbacks restantes (16 itens)

Status atual: ✅ 6 itens prontos (RLS equipamentos, erro 7/7 com diagnóstico, marcas, variações, aba patrimonial resiliente, infra de transferências). Restam **16 itens** divididos em 5 blocos.

---

### Bloco A — Cadastro de Cliente PF (itens 11-17)

Arquivo principal: `src/components/forms/ClienteForm.tsx`

1. **Remover campo Responsável** do formulário PF.
2. **Data de Nascimento obrigatória** (PF) — adicionar validação zod e marcador visual.
3. **WhatsApp como contato principal** por padrão — primeiro contato pré-criado já com `tipo='whatsapp'` e `principal=true`.
4. **Corrigir dropdown "Tipo de Contato"** do primeiro contato (provável bug de `Select` com value vazio — investigar e corrigir).
5. **Bloquear finalização sem WhatsApp verificado** — adicionar flag `whatsapp_verificado` no estado do contato e impedir submit se principal=whatsapp e !verificado.
6. **Separar "Principal" em três campos** — `telefone_principal_id`, `whatsapp_principal_id`, `email_principal_id` (jsonb em `clientes.contato_principal`); cada contato ganha seleção independente.
7. **Condensar layout dos contatos** — cards menores, grid 2 colunas em md+, remover paddings excessivos.

### Bloco B — UX do Contrato (itens 21-25)

Arquivos: `src/pages/NovoContratoV2.tsx`, steps em `src/components/contratos/wizard/`, `SeletorObraModal.tsx`.

8. **Forma de pagamento**: substituir item "Cartão" por **"Cartão de Débito"** e **"Cartão de Crédito"** separados nos selects do contrato e telas financeiras que reusam o enum.
9. **Remover "Li e concordo"** durante elaboração do contrato (Step 4/5 — checkbox de termos).
10. **Remover botão "Assinar Digitalmente"** do usuário do sistema na tela de contrato (manter apenas envio para o cliente assinar).
11. **Vincular obra criada no contrato ao cliente** — em `SeletorObraModal`, quando criar nova obra, gravar `obras.cliente_id` com o cliente selecionado no contrato (já existe coluna; só garantir que está sendo populada).
12. **Toolbar auto-ocultar** na página do contrato — barra de ações fica fixa e some após 3s de inatividade do mouse, reaparece em hover/scroll.

### Bloco C — Cliente DB + Obras GPS + Transferir (itens 8, 9, 10, 19)

13. **`dia_vencimento_padrao` em clientes** (coluna já existe) — expor no `ClienteForm` aba "Condições & Políticas" e usar como default no contrato (Step 5).
14. **`negociacao_pontual` jsonb em clientes** (coluna já existe) — bloco no form com desconto %, prazo extra, observação; aplicar automaticamente ao montar políticas comerciais do contrato.
15. **GPS em Obras**: adicionar colunas `latitude numeric, longitude numeric` em `obras` (migration). No form de obra: campos numéricos + botão "Abrir no Google Maps" e "Capturar coordenadas atuais" (geolocation API).
16. **Modal Transferir Equipamento**: criar `src/components/equipamentos/TransferirEquipamentoModal.tsx` consumindo as tabelas `transferencias`/`transferencia_itens` já criadas. Botão "Transferir" no detalhe do equipamento abre modal → seleciona loja destino, motivo, observações → grava transferência PENDENTE.

### Bloco D — PDF do Contrato (item 26)

Arquivo: `src/utils/contrato-pdf.ts`

17. **Refatorar layout**:
    - Cabeçalho com faixa colorida (cor primária da marca) e logo
    - Seções claramente separadas: Dados do Cliente / Equipamentos / Condições / Assinaturas — cada uma com título em faixa colorida
    - Tabela de itens com header colorido, linhas zebradas, bordas suaves
    - Espaçamento generoso entre blocos
    - Rodapé com paginação ("Página X de Y") e nº do contrato

### Bloco E — WhatsApp UX (itens 2, 3)

18. **Mensagens de erro amigáveis** quando instância da loja não está conectada:
    - Em `whatsapp-verify` e `whatsapp-send`: detectar 401/instância desconectada e retornar `{ error: "WhatsApp da loja não está conectado. Acesse Configurações → WhatsApp para conectar." }`
    - No frontend (form de cliente / envio de contrato): exibir esse texto em toast com botão "Configurar agora" que leva para Configurações.

---

### Migrations necessárias

```sql
ALTER TABLE obras ADD COLUMN latitude numeric, ADD COLUMN longitude numeric;
-- (dia_vencimento_padrao e negociacao_pontual já existem em clientes)
-- (transferencias/transferencia_itens já existem)
```

### Ordem de execução

A → C (DB primeiro) → B → D → E. Sem perguntas intermediárias.

### Riscos / observações

- O Bloco A toca um arquivo grande (`ClienteForm.tsx`); pode quebrar campos não relacionados — vou rodar QA visual depois.
- A separação "Cartão Débito/Crédito" pode afetar relatórios financeiros existentes que filtram por `forma_pagamento='Cartão'`. Vou manter compat lendo os dois.
- O auto-hide da toolbar precisa de teste em mobile (viewport 402px atual) — vou garantir que em touch ela permaneça visível.
- WhatsApp UX: não vou tentar "consertar" instâncias desconectadas, só melhorar a comunicação do erro (a conexão é manual via QR Code já implementado).

Aprova?