

## Diagnóstico: 2 problemas encontrados

### Problema 1: Erro ao gerar PIX/Boleto
A Edge Function `inter-proxy` **nao tem nenhum log** — a chamada nunca chegou ao servidor. Possíveis causas:
- Credenciais do Banco Inter (certificado, client_id, client_secret) **nao estao configuradas** nos secrets do Supabase — so existem secrets de UAZAPI, ZAPSIGN, e Supabase
- Sem credenciais, a edge function retorna erro antes de chamar a API Inter

**Acao necessaria do usuario**: Configurar os secrets `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, e o certificado PFX do Banco Inter no painel do Supabase (Settings > Edge Functions > Secrets). Sem isso, nenhuma emissao de boleto/PIX funcionara.

---

### Problema 2: Faturamento nao mostra nada nos filtros

Encontrei **4 problemas combinados** que impedem o funcionamento:

1. **unidadeId padrao errado**: O store inicializa com `unidadeId: '1'` (hardcoded), mas a loja real e `cc51b7f2-79c5-4f46-adf5-86c891b1e01a`. Resultado: a query de contratos filtra pela loja `'1'` e nao encontra nada.

2. **Datas fora do periodo**: O contrato ativo tem `data_inicio: 2026-06-11` e `data_fim: 2026-07-09`. O filtro padrao usa o mes atual (Abril 2026). Como Junho-Julho nao intersecta com Abril, o contrato e filtrado fora.

3. **Preco unitario zerado**: O `contrato_itens` do contrato ativo tem `preco_unitario = 0`. Mesmo corrigindo filtros, o valor calculado sera R$0.

4. **Loop infinito (Maximum update depth)**: O `FaturamentoGrid` tem um bug no `useEffect` que causa re-renders infinitos — provavelmente o `faturas` no array de dependencias muda de referencia a cada render.

### Plano de correcao

**1. Corrigir unidadeId padrao no store** (`faturamentoStore.ts`)
- Em vez de `'1'`, usar string vazia e deixar o `FaturamentoFilters` definir a loja real no primeiro render

**2. Corrigir loop infinito no FaturamentoGrid** (`FaturamentoGrid.tsx`)
- Estabilizar dependencias do `useEffect` — usar `JSON.stringify(faturas)` ou memoizar a lista de `contratosFaturados`

**3. Sincronizar unidadeId real nos filtros** (`FaturamentoFilters.tsx`)
- No mount, se `filtros.unidadeId` nao corresponde a nenhuma loja real, setar automaticamente para `lojaAtual.id`

**4. Atualizar preco_unitario do contrato_itens** (migration SQL)
- `UPDATE contrato_itens SET preco_unitario = 100 WHERE contrato_id = '53882f9f-...'`

**5. Ajustar datas do contrato para incluir Abril** (migration SQL)
- `UPDATE contratos SET data_inicio = '2026-04-01', data_fim = '2026-04-30' WHERE id = '53882f9f-...'`
- Ou: o usuario pode simplesmente ajustar os filtros para Junho-Julho

### Sobre o PIX/Boleto
Nao ha correcao de codigo possivel sem as credenciais do Banco Inter. O usuario precisa:
1. Ter conta PJ no Banco Inter
2. Gerar certificado e credenciais de API no portal de desenvolvedores Inter
3. Adicionar `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, e `INTER_CERT_PFX_BASE64` nos secrets do Supabase

### Arquivos a alterar
| Arquivo | Alteracao |
|---------|-----------|
| `src/stores/faturamentoStore.ts` | Corrigir `unidadeId` padrao |
| `src/components/faturamento/FaturamentoGrid.tsx` | Corrigir loop infinito no useEffect |
| `src/components/faturamento/FaturamentoFilters.tsx` | Auto-sincronizar loja real no mount |
| Migration SQL | Atualizar `preco_unitario` e opcionalmente datas do contrato |

