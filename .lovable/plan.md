

## Plano: Detecção Automática de Pagamento + Endpoints PIX

### Contexto

O webhook `inter-webhook` atualmente apenas **loga** os eventos — não atualiza nada. Precisamos:
1. Vincular `codigoSolicitacao` aos títulos para que o webhook saiba qual título foi pago
2. Atualizar automaticamente o status do título quando o Inter notifica pagamento
3. Adicionar endpoint de criação de cobrança PIX (QR Code)

### Problema de vínculo

A tabela `titulos` não tem coluna `codigo_solicitacao`. A tabela `cobrancas_inter` (referenciada no hook) **não existe** no banco. Precisamos criar essa tabela que faz o link: `cobrancas_inter.titulo_id` ↔ `cobrancas_inter.codigo_solicitacao`.

### Implementação (4 itens)

**1. Migration — Criar tabela `cobrancas_inter`**

Tabela que vincula titulo ao código Inter:
- `id`, `titulo_id` (FK titulos), `loja_id` (FK lojas), `codigo_solicitacao`, `status`, `idempotency_key`
- `linha_digitavel`, `codigo_barras`, `pix_copia_cola`, `qr_code_data_url`, `pdf_url`
- `history` (jsonb), `created_at`, `updated_at`, `created_by`
- RLS: master tudo, admin/staff da loja

**2. Edge Function `inter-webhook` — Processar pagamento automaticamente**

Quando recebe evento `PAGO`:
1. Busca `cobrancas_inter` pelo `codigo_solicitacao`
2. Atualiza `cobrancas_inter.status` → `PAID`
3. Atualiza `titulos.status` → `PAGO`, `titulos.pago` → valor recebido, `titulos.saldo` → 0
4. Cria registro em `recebimentos` (forma = `BOLETO_PIX_INTER`, valor recebido)
5. Marca `inter_webhook_events.processado` → true

Para `CANCELADO`/`EXPIRADO`: atualiza status na `cobrancas_inter` e no título.

**3. Edge Function `inter-proxy` — Adicionar criação de PIX**

Novo action `criar-pix` usando endpoint `/pix/v2/cob` do Inter:
- Gera cobrança PIX com QR Code
- Retorna `txid`, `pixCopiaECola`, `qrCodeUrl`

Novo action `consultar-pix-cobranca` usando `/pix/v2/cob/{txid}`.

**4. Nenhuma alteração no frontend necessária nesta fase**

O hook `useSupabaseCobrancasInter.ts` já está pronto para a tabela — só precisa existir no banco.

### Fluxo automático após implementação

```text
Boleto/PIX emitido → codigo_solicitacao salvo em cobrancas_inter
  → Cliente paga
  → Inter envia webhook (situacao: PAGO)
  → inter-webhook busca cobrancas_inter pelo codigo_solicitacao
  → Atualiza cobrancas_inter.status = PAID
  → Atualiza titulos.status = PAGO, pago = valor
  → Cria registro em recebimentos
  → Marca webhook_event como processado
```

### Resumo

| Item | Tipo | Escopo |
|------|------|--------|
| Tabela `cobrancas_inter` | Migration | 1 migration SQL |
| Webhook auto-atualização | Edge Function | `inter-webhook` |
| Endpoints PIX (criar/consultar) | Edge Function | `inter-proxy` |
| Frontend | Nenhum | Hook já existe |

