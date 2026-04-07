

## Sequência Lógica: Quando gerar Boleto/PIX no sistema

### Problema atual

O sistema tem **3 botoes separados e desconectados** no Faturamento:
1. "Emitir Fatura" — cria fatura no store (Zustand, nem vai pro Supabase)
2. "Gerar Cobranca" — funcao do store, nao chama Inter
3. "Emitir BolePix Inter" — chama Inter mas sem titulo_id, sem salvar cobranca_inter

Na Contas a Receber, o fluxo funciona: titulo existe → clica "Emitir BolePix" → modal abre → emite → salva em `cobrancas_inter`. Mas no Faturamento nao tem titulo pra vincular.

### Fluxo logico correto (proposta)

```text
CONTRATO ATIVO
  └─→ Gera TITULOS (parcelas) no Supabase
       └─→ Titulo com status PENDENTE
            └─→ Na aba Contas a Receber:
                 Botao "Emitir BolePix" por titulo
                 └─→ Chama Inter API (boleto + PIX)
                 └─→ Salva em cobrancas_inter
                 └─→ Titulo fica EMITIDO
                      └─→ Cliente paga
                      └─→ Webhook Inter detecta PAGO
                      └─→ Titulo atualiza para PAGO
                      └─→ Recebimento criado automaticamente

FATURAMENTO (agrupamento)
  └─→ Seleciona titulos pendentes do cliente
  └─→ Emite FATURA (agrupa titulos)
  └─→ Apos confirmar fatura:
       Opcao "Emitir BolePix para todos os titulos"
       └─→ Loop: emite Inter para cada titulo da fatura
       └─→ Salva cobrancas_inter vinculadas

INADIMPLENCIA (recobranca)
  └─→ Titulo vencido/expirado
  └─→ Botao "Reemitir BolePix"
  └─→ Gera nova cobranca Inter com novo vencimento
```

### O que precisa mudar

**1. Faturamento: unificar os 3 botoes em um fluxo sequencial**
- Remover botao "Gerar Cobranca" (store mock) e "Emitir BolePix Inter" (isolado)
- Apos "Emitir Fatura" com sucesso, mostrar opcao: "Deseja emitir Boleto/PIX para os titulos desta fatura?"
- Se sim: para cada titulo gerado pela fatura, chamar `BackendInterAdapter.emitCharge()` e salvar em `cobrancas_inter`
- Isso requer que o faturamento gere titulos reais no Supabase (hoje usa Zustand store)

**2. Faturamento: persistir faturas e titulos no Supabase**
- A funcao `emitirFatura` do `faturamentoStore` precisa criar registros em `faturas` e `titulos` no Supabase
- Sem isso, nao ha titulo_id para vincular a cobranca Inter
- Usar `useSupabaseTitulos.createTitulo` apos confirmar fatura

**3. Contas a Receber: ja funciona — manter como esta**
- Fluxo correto: titulo → botao BolePix → modal → emite → salva cobranca_inter
- Webhook ja processa pagamento automaticamente

**4. Inadimplencia: ja tem botao — garantir que salva cobranca_inter**
- Verificar se o `handleEmitirBolePixInadimplencia` salva corretamente em `cobrancas_inter`

### Arquivos a alterar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/faturamento/FaturamentoCarrinho.tsx` | Remover botoes avulsos; apos emitir fatura, oferecer emissao Inter para titulos gerados |
| `src/stores/faturamentoStore.ts` | Adaptar `emitirFatura` para persistir no Supabase (faturas + titulos) |
| `src/pages/Inadimplencia.tsx` | Verificar/corrigir salvamento em cobrancas_inter no callback |

### Resumo da sequencia

1. **Contrato gera titulos** (ja funciona)
2. **Faturamento agrupa titulos em fatura** (precisa persistir no Supabase)
3. **Apos fatura, usuario escolhe emitir Boleto/PIX** (unificar botoes)
4. **Inter emite e salva cobranca_inter** (vincular titulo_id)
5. **Webhook detecta pagamento e baixa automaticamente** (ja implementado)

