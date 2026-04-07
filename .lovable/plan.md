

## Diagnóstico: Integração Inter + Abas "Financeiro a Receber"

### A integração Inter esta conectada ao Financeiro a Receber?

**Sim, parcialmente.** A aba "Contas a Receber" (TitulosTab) ja esta integrada:
- Usa `useSupabaseCobrancasInter` para criar cobranças na tabela `cobrancas_inter`
- Tem botao "Emitir BolePix" que chama o `EmitirBolePixModal`
- O `BackendInterAdapter` chama a Edge Function `inter-proxy` para emitir boletos
- O webhook `inter-webhook` atualiza automaticamente `titulos.status` → `PAGO` e cria registro em `recebimentos`

**O que NAO esta integrado ainda:**
- A aba **Faturamento** emite faturas mas nao gera cobrancas Inter automaticamente (fatura → titulo → cobranca Inter nao e automatico)
- A aba **Inadimplencia** mostra aging/vencidos mas nao tem acao de "reemitir boleto" ou "gerar PIX" direto
- A aba **Gestao Financeira** exibe KPIs de faturado/recebido mas nao reflete status de cobrancas Inter (PAID/ISSUED)

---

### Estado de cada aba

| Aba | Status | Dados Reais? | Integração Inter |
|-----|--------|--------------|------------------|
| **Contas a Receber** | Funcional | Sim (Supabase `titulos` + `recebimentos`) | Sim — emitir boleto, criar cobranca |
| **Faturamento** | Funcional | Parcial (usa zustand store, nao Supabase direto) | Nao — fatura nao gera cobranca Inter |
| **Inadimplencia** | Funcional | Sim (Supabase `titulos` + `clientes`) | Nao — sem acao de recobranca |
| **Gestao Financeira** | Funcional | Sim (Supabase `titulos` + `recebimentos`) | Nao — nao reflete status Inter |

---

### Plano de Integração Completa (4 itens)

**1. Faturamento → Cobranca Inter automatica**
- Quando uma fatura e emitida e gera titulos, oferecer opcao de "Emitir Boleto/PIX" automaticamente
- Adicionar botao no `FaturamentoCarrinho` para emitir cobranca Inter apos confirmar fatura
- Chamar `inter-proxy` com action `emitir-boleto` para cada titulo gerado

**2. Inadimplencia → Acoes de recobranca**
- Adicionar botao "Reemitir Boleto" e "Gerar PIX" na tabela de aging por titulo vencido
- Usar `BackendInterAdapter.emitCharge()` para gerar nova cobranca
- Mostrar status da ultima cobranca Inter (ISSUED/PAID/EXPIRED) em cada linha

**3. Gestao Financeira → Indicadores Inter**
- Adicionar KPI "Cobranças Ativas" (count de `cobrancas_inter` com status ISSUED)
- Adicionar KPI "Taxa de Conversão" (PAID / total emitidas)
- No AlertsTable, mostrar cobranças expiradas ou com falha

**4. Coluna de status Inter na TitulosTab**
- Mostrar badge com status da cobranca Inter (ISSUED/PAID/EXPIRED) ao lado do status do titulo
- Link para PDF do boleto quando disponivel
- Botao copiar PIX copia-e-cola

### Arquivos a alterar

- `src/components/faturamento/FaturamentoCarrinho.tsx` — botao emitir cobranca pos-fatura
- `src/pages/Inadimplencia.tsx` — botoes reemitir boleto/PIX por titulo
- `src/pages/GestaoContasReceber.tsx` — KPIs de cobrancas Inter
- `src/components/contas-receber/TitulosTab.tsx` — coluna status Inter + acoes

Nenhuma migration necessaria — as tabelas `cobrancas_inter` e `inter_webhook_events` ja existem.

