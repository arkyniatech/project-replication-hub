# Relay 10 — Varredura de Desvio de Schema

**Data:** 2026-08-15
**Tipo:** Sessão estática e read-only. Nada foi corrigido, nada foi rodado, nada foi commitado.
**Escopo:** 485 arquivos TS/TSX (`src/` + `supabase/functions`), cruzados contra as 120 tabelas reais do schema `public`.

## Por que esta sessão existe

Quatro vezes no mesmo dia o código se mostrou escrito contra um schema que não existe:
- `'SERIALIZADO'` onde a coluna guarda `'SERIE'`
- `'CONCLUIDO'` onde o enum tem `'ENCERRADO'`
- `razao_social` numa tabela que perdeu a coluna
- `public.caixa` — tabela inteira que nunca foi criada

Não são descuidos isolados — é assinatura de código gerado antes do banco existir e nunca reconciliado. Esta varredura mapeia a extensão do problema em quatro frentes: tabelas inexistentes, RPCs, colunas referenciadas e literais de status/tipo.

---

## ⚠️ Destaque — os três pares quase-homônimos: todos corretos

Pares de tabelas com nomes parecidos são a armadilha clássica de código gerado: usar a tabela errada não dá erro 404, só lê vazio e a tela parece "sem dados". Investigamos os três pares conhecidos do schema — nenhum está trocado.

**1. `recebimentos` × `compras_recebimentos`**
- `recebimentos` (7 usos) é financeiro: em `useSupabaseRecebimentos.ts:14-26` faz join `titulo:titulos(...) → cliente:clientes, contrato:contratos` e filtra por `titulo_id`. É baixa de título a receber. Correto.
- `compras_recebimentos` / `compras_recebimento_itens` têm **zero** `.from()` no projeto — só aparecem no `types.ts` gerado. O módulo de recebimento de compras existe na UI (`src/pages/compras/Recebimento.tsx`) mas não persiste nessas tabelas. Não é tabela trocada — é funcionalidade não conectada ao banco.

**2. `itens_contagem` × `almox_contagem_itens`**
- `itens_contagem` + `sessoes_contagem` + `divergencias_contagem` + `ajustes_contagem`: conferência de **equipamentos** (`useSupabaseConferencia.ts`, `contract-integrations.ts:117-126`).
- `almox_contagens` + `almox_contagem_itens`: contagem de **almoxarifado** (`useSupabaseContagens.ts:34-144`).
- Nenhum cruzamento entre os dois módulos.

**3. `transferencias` × `fin_transferencias`**
- `transferencias` + `transferencia_itens` + `transferencia_logs`: movimentação física de equipamento entre lojas (colunas `origem_loja_id`, `destino_loja_id`, `equipamento_id`).
- `fin_transferencias`: transferência de dinheiro entre contas, isolada em `financeiroStore.ts:194,255,299`.
- Nenhum cruzamento.

---

## 1. Tabelas inexistentes — 6 confirmadas

Cruzando 105 nomes distintos de `.from()` contra as 120 tabelas reais.

| Tabela | Ocorrências | Arquivo:linha | Módulo |
|---|---|---|---|
| `caixa` | 4 | `useSupabaseCaixa.ts:24,75,104,130` | Financeiro/Caixa |
| `movimentos_caixa` | 2 | `useSupabaseCaixa.ts:51,161` | Financeiro/Caixa |
| `budget_metas` | 4 | `useSupabaseBudgetMetas.ts:34,59,80,102` | Financeiro/Budget |
| `fechamentos_cp` | 3 | `useSupabaseFechamentoCP.ts:26,48,76` | Contas a Pagar |
| `pessoa_movimentos` | 4 | `useSupabasePessoaMovimentos.ts:27,42,59,77` | RH |
| `ncm_comuns` | 1 | `DadosFiscaisSection.tsx:43` | Equipamentos/Fiscal |

**Padrão:** o módulo Caixa é inteiro fantasma (`caixa` + `movimentos_caixa`, 6 chamadas, hook completo com abrir/fechar/movimentar). Mesma assinatura dos outros casos vistos hoje: hook inteiro escrito contra tabela que nunca existiu.

**Falso positivo descartado:** `equipamentos_depreciacao` (`AnalisePatrimonial.tsx:62`) **não** é tabela faltante — é VIEW, criada em `20260430000158_.sql:148` e alterada em `20260608182827_.sql:1`. Corretamente ausente da lista de tabelas — vale só confirmar que a view existe no banco.

**`.from()` dinâmico:** nenhum com template string. Dois pontos usam variável, mas ambos resolvem para mapas literais estáticos já validados:
- `frotaSync.ts:58,73,116,163` → `FROTA_TABELAS` (linhas 41-51): as 9 tabelas `frota_*` existem todas.
- `financeiroStore.ts:120-121` → `finWrite()`, 14 chamadas, sempre com literal: `contas_financeiras`, `fin_transferencias`, `fin_lancamentos`, `fin_conciliacoes`, `fin_extrato_linhas`, `fin_matches`. Todas existem.

---

## 2. RPCs — 23 nomes para conferir contra `pg_proc`

```
abrir_contagem_almox            fin_efetivar_transferencia
ajustar_saldo_estoque           fin_estornar_transferencia
atualizar_status_transferencia  gerar_codigo_fornecedor
cancelar_contagem_almox         gerar_notificacoes_rh
criar_cotacao_de_os             gerar_numero_os
criar_cotacao_de_requisicao     gerar_pedidos_de_cotacao
criar_cotacao_direta            gerar_provisao_snapshots
criar_transferencia             is_master                    (2x)
processar_contagem_almox        registrar_recebimento
rpc_aplicar_substituicao        rpc_criar_os_de_solicitacao
rpc_criar_solicitacao           rpc_mudar_status
rpc_registrar_laudo             simular_rescisao             (2x)
```

Nenhum `.rpc()` com nome dinâmico.

---

## 3. Tabela × colunas referenciadas

Mapa completo — 105 tabelas, extraído de `.select()`, `.eq/.in/.order/...` e payloads de insert/update.

### Financeiro
```
titulos              | cliente_id, cnpj, contrato_id, cpf, created_at, id, loja_id, nome,
                        numero, origem, pago, razao_social, saldo, status, subcategoria,
                        tipo, valor, vencimento
titulos_pagar        | ativo, codigo, created_at, descricao, id, loja_id, nome
parcelas_pagar       | codigo, doc_numero, fornecedor_id, id, loja_id, nome, numero,
                        status, vencimento
movimentos_pagar     | data_pagamento, parcela_id, status, titulo_id
contas_financeiras   | ativo, codigo, id, loja_id, nome, saldo_atual, tipo
aprovacoes_cp        | created_at, historico, id, nome, numero, status
fin_transferencias   | created_at, id, status
fin_lancamentos      | data, id
fin_conciliacoes     | created_at, id, status
fin_extrato_linhas   | conciliacao_id, data, doc, historico, id, pareado, saldo, tipo, valor
fin_matches          | conciliacao_id, criado_em, extrato_id, id, lancamento_id, modo
recebimentos         | cliente_id, data, id, loja_id, nome, numero, razao_social,
                        titulo_id, valor
faturas              | cliente_id, contrato_id, created_at, emissao, forma_preferida, id,
                        loja_id, nome, numero, observacoes, razao_social, tipo, total,
                        vencimento
cobrancas_inter      | codigo_solicitacao, created_at, history, id, loja_id, status,
                        titulo_id
inter_credentials    | ativo, loja_id
inter_webhook_events | id
categorias_n2        | ativo, codigo, id
centros_custo        | ativo, nome
```

### Contratos
```
contratos            | ativo, cliente_id, cnpj, codigo_interno, controle, cpf, created_at,
                        data_fim, data_inicio, documentos, equipamento_id, id, loja_id,
                        modelo_id, nome, nome_comercial, numero, numero_serie, quantidade,
                        razao_social, status, timeline, tipo, valor_indenizacao,
                        valor_total, zapsign_doc_token
contrato_itens       | contrato_id, controle, equipamento_id, id, preco_total,
                        preco_unitario, quantidade, status, tipo
aditivos_contratuais | contrato_id, criado_em, descricao, id, justificativa, loja_id,
                        numero, status, tipo, valor
clientes             | ativo, cnpj, cpf, created_at, id, loja_id, nome, razao_social,
                        status_credito
obras                | ativo, cliente_id, created_at, id, loja_id, status
```

### Equipamentos
```
equipamentos          | ativo, codigo_interno, created_at, grupo_id, historico, id,
                         loja_atual_id, modelo_id, nome, nome_comercial, numero_serie,
                         saldos_por_loja, status_global, tipo
grupos_equipamentos   | ativo, id, nome
modelos_equipamentos  | ativo, grupo_id, id, nome_comercial
marcas_equipamentos   | ativo, id, nome
variacoes_equipamento | id, ordem
historico_precos      | data_iso, modelo_id
transferencias        | codigo, created_at, destino, destino_loja_id, id, origem,
                         origem_loja_id, status
transferencia_itens   | equipamento_id, id, modelo_id, nome, nome_comercial,
                         origem_loja_id, quantidade, status, tipo, transferencia_id
transferencia_logs    | created_at, transferencia_id
sessoes_contagem      | created_at, display_no, id, log, loja_id, status
itens_contagem        | codigo, grupo_nome, id, sessao_id
divergencias_contagem | codigo, delta, descricao, item_id, sessao_id, tipo
ajustes_contagem      | sessao_id
```

### Manutenção
```
ordens_servico            | area_atual, codigo_interno, created_at, equipamento_id, id,
                             loja_id, modelo_id, numero_serie, origem, prioridade, status,
                             timeline, tipo
solicitacao_manutencao    | cliente_id, contrato_id, created_at, id, loja_id, prioridade,
                             status, tipo
solicitacao_item          | solicitacao_id
solicitacao_anexo         | created_at, solicitacao_id
solicitacao_timeline      | solicitacao_id, ts
produtividade_manutencao  | auxiliar_id, data_iso, id, loja_id, mecanico_id
```

### Frota
Todas via `FROTA_TABELAS` (`frotaSync.ts:16-33`) — colunas montadas por spread de objeto, não extraíveis estaticamente por nome:
```
frota_veiculos        | criado_em, loja_id, created_by  (+ spread de Veiculo)
frota_veiculo_configs | desde_data  (+ spread)
frota_manutencoes     | dt_entrada, dt_saida, created_by  (+ spread)
frota_postos / frota_oleos / frota_oficinas / frota_servicos /
frota_abastecimentos / frota_trocas_oleo  | identity — spread puro, só remove created_by
```
⚠️ Comentário em `frotaSync.ts:4`: *"As tabelas frota_* ainda não estão em types.ts — casts via (supabase as any)"*. Sem tipagem, qualquer desvio de coluna aqui só falha em runtime.

### Logística
```
logistica_tarefas          | contrato_id, id, loja_id, motorista_id, observacoes,
                              previsto_iso, prioridade, status, tipo
logistica_motoristas       | ativo, id, loja_id, nome
logistica_veiculos         | ativo, id, loja_id, modelo
logistica_config           | loja_id
logistica_metricas_diarias | data_iso, loja_id, motorista_id
```

### RH
```
pessoas                    | cargo, cpf, created_at, id, loja_id, nome, situacao
pessoa_vinculo             | cnpj, nome, pessoa_id, razao_social, salario, vigencia_fim,
                              vigencia_inicio
cargos                     | id, nome
holerites                  | competencia, pessoa_id, status, tipo
holerite_lotes             | competencia, created_at, id
ferias_periodos            | cargo, concessivo_fim, dias_saldo, nome, pessoa_id, status
ferias_agendamentos        | status
ausencias                  | data_inicio, dias, nome, tipo
ponto_lancamentos          | data, nome
banco_horas_movimentos     | created_at, nome, ocorrido_em, pessoa_id, saldo_apos
rh_documentos              | created_at, id, nome, status
rh_tipos_documento         | ativo, nome
rh_solicitacoes            | created_at, nome, pessoa_id, status
rh_aprovacoes              | (nenhuma literal extraível)
rh_notificacoes            | created_at, id, lida_em, severidade
rh_desligamentos           | created_at, custo_empregador, data_simulacao, id, nome
rh_admissoes               | created_at, id, nome
rh_vagas                   | created_at, id, nome
rh_candidatos              | created_at, id, titulo
rh_beneficios              | id, nome
rh_beneficio_vinculos      | created_at, id, nome, status, tipo, valor_mensal
rh_beneficio_elegibilidade | id, nome
rh_aso_exames              | data_exame, nome
rh_treinamentos            | data_realizacao, nome
provisao_snapshots         | competencia, nome, total_adquirido
rescisao_simulacoes        | id
rescisao_itens             | ordem, simulacao_id
```

### Compras / Almoxarifado
```
compras_requisicoes            | created_at, id, loja_id, status
compras_requisicao_itens       | id, requisicao_id
compras_cotacoes               | codigo, created_at, id, loja_id, nome, status
compras_cotacao_propostas      | (nenhuma literal extraível)
compras_cotacao_proposta_itens | (nenhuma literal extraível)
compras_pedidos                | codigo, created_at, loja_id, nome, numero, origem
almox_catalogo_itens           | descricao, id
almox_contagens                | created_at, id, loja_id
almox_contagem_itens           | id
almox_estoque                  | loja_id
almox_movimentos               | created_at, descricao, item_id, loja_id, sku
```

### Acessos / Infra
```
user_profiles          | cargo, cpf, created_at, id, loja_id, loja_padrao_id, nome,
                          pessoa_id
user_roles             | id, role, user_id
user_lojas_permitidas  | codigo, loja_id, nome, origem_grupo_id, user_id
user_grupos            | grupo_id, user_id
grupos_lojas           | id, nome
lojas                  | ativo, codigo, codigo_numerico, id, nome
avisos_sistema         | ativo, created_at, id, prioridade
config_avisos_header   | id
system_logs            | created_at
whatsapp_instances     | id, instance_token, loja_id, status
whatsapp_verifications | code, created_at, expires_at, id, phone, verified
fornecedores           | ativo, id, nome
```

### Tabelas inexistentes — colunas esperadas pelo código
```
caixa               | data_iso, id, loja_id, status, usuario_id
movimentos_caixa    | caixa_id, ts
budget_metas        | categoria_codigo, codigo, descricao, id, loja_id, periodo
fechamentos_cp      | id, loja_id, periodo
pessoa_movimentos   | data, id, pessoa_id
ncm_comuns          | ativo, descricao
```

---

## 4. Literais de status / tipo

### 4a. Já reportados anteriormente como errados — status atual

**`'SERIALIZADO'` em `contrato_itens.controle`** — a escrita está **correta**; o problema é só na leitura.
- Camada de tradução existe em `src/lib/controle-vocabulario.ts`, documentando que o banco usa `'SERIE'|'GRUPO'` (CHECK em `20260101043343_create_contratos.sql`).
- A escrita traduz corretamente: `NovoContratoV2.tsx:860-869` faz `SERIALIZADO → SERIE`.
- Mas a camada tem só **2 consumidores reais** (`contratos-agenda-mapper.ts:14`, `contratosStore.ts:52`). Outros pontos do código comparam valor cru do banco contra `'SERIALIZADO'` — nunca casa:

| Arquivo:linha | Tabela | Campo | Literal |
|---|---|---|---|
| `contratos-v2-utils.ts:200` | contrato_itens | controle | `'SERIALIZADO'` |
| `NovoContratoV2.tsx:335` | contrato_itens | controle | `'SERIALIZADO'` |
| `NovoContratoV2.tsx:336` | contrato_itens | controle | `'SERIALIZADO'` |
| `useValidarDisponibilidadeReal.ts:5` | contrato_itens | controle | tipo `'SERIALIZADO'\|'GRUPO'` — mistura os dois vocabulários |
| `contratos-v2-utils.ts:168` | contrato_itens | controle | tipo `'SERIALIZADO'\|'GRUPO'` — mesma mistura |

**`'CONCLUIDO'` em `contratos.status`** — **não localizado.** Todos os 20 hits de `'CONCLUIDO'` no código são em `logistica_tarefas.status`, onde o valor **é válido** (enum `status_tarefa_logistica`). Todos os literais de `contratos.status` no código (`RASCUNHO`/`AGUARDANDO_ENTREGA`/`ATIVO`/`ENCERRADO`/`CANCELADO`) batem com o CHECK real. Se 'CONCLUIDO' falhou em contexto de contrato, o caminho provável é `ItinerarioDiario.tsx:233,271,381`, que traduz `CONCLUIDO ↔ CONCLUIDA` nos dois sentidos — vale investigar esse ponto de tradução.

### 4b. Literais gravados (`.insert` / `.update`) — 74 casos

| Arquivo:linha | Tabela | Campo | Literal |
|---|---|---|---|
| `CobrancaUnicaModal.tsx:168` | faturas | tipo | `'COBRANCA_UNICA'` |
| `CobrancaUnicaModal.tsx:195` | titulos | status | `'EM_ABERTO'` |
| `CobrancaUnicaModal.tsx:196` | titulos | origem | `'COBRANCA_UNICA'` |
| `CobrancaUnicaModal.tsx:206` | titulos | status | `'CANCELADO'` |
| `LogisticaContratoDialogs.tsx:77` | logistica_tarefas | status | `'CANCELADO'` |
| `LogisticaContratoDialogs.tsx:218` | logistica_tarefas | status | `'PROGRAMADO'` |
| `FaturamentoCarrinho.tsx:119` | faturas | tipo | `'LOCACAO'` |
| `FaturamentoCarrinho.tsx:158` | titulos | status | `'PENDENTE'` ⚠️ |
| `FaturamentoCarrinho.tsx:159` | titulos | origem | `'FATURA'` |
| `FaturamentoCarrinho.tsx:162` | titulos | tipo | `'EMISSAO'` |
| `DevolucaoModal.tsx:255` | titulos | origem | `'CONTRATO'` |
| `DevolucaoModal.tsx:267` | titulos | tipo | `'criacao'` ⚠️ minúsculo |
| `RenovarContratoModal.tsx:514` | aditivos_contratuais | tipo | `'RENOVACAO'` |
| `RenovarContratoModal.tsx:519` | aditivos_contratuais | status | `'ATIVO'` |
| `RenovarContratoModal.tsx:543` | aditivos_contratuais | tipo | `'CONTRATO_RENOVADO'` ⚠️ |
| `SubstituicaoModal.tsx:152` | equipamentos | status_global | `'MANUTENCAO'` |
| `SubstituicaoModal.tsx:177` | contratos | tipo | `'SUBSTITUICAO_REALIZADA'` ⚠️ grava em `timeline`? |
| `SubstituicaoModal.tsx:199-201` | logistica_tarefas | tipo/status/prioridade | `'ENTREGA'` / `'AGENDAR'` / `'ALTA'` |
| `useSupabaseAditivos.ts:103` | aditivos_contratuais | status | `'CANCELADO'` |
| `useSupabaseAprovacoesCP.ts:73` | aprovacoes_cp | status | `'APROVADO'` |
| `useSupabaseAprovacoesCP.ts:117` | aprovacoes_cp | status | `'REPROVADO'` |
| `useSupabaseCaixa.ts:132` | caixa | status | `'FECHADO'` — tabela inexistente |
| `useSupabaseConferencia.ts:321` | sessoes_contagem | status | `'ABERTA'` ⚠️ |
| `useSupabaseConferencia.ts:538` | sessoes_contagem | status | `'EM_REVISAO'` |
| `useSupabaseConferencia.ts:682` | sessoes_contagem | status | `'AJUSTADA'` |
| `useSupabaseConferencia.ts:714` | sessoes_contagem | status | `'FECHADA'` |
| `useSupabaseContratos.ts:270` | contratos | status | `'CANCELADO'` ✅ |
| `useSupabaseContratos.ts:284` | equipamentos | status_global | `'DISPONIVEL'` |
| `useSupabaseContratos.ts:293` | logistica_tarefas | status | `'CANCELADO'` |
| `useSupabaseContratos.ts:349` | contratos | status | `'ATIVO'` ✅ |
| `useSupabaseContratos.ts:364` | contrato_itens | status | `'LOCADO'` ✅ |
| `useSupabaseContratos.ts:400` | contrato_itens | tipo | `'TOTAL'` |
| `useSupabaseContratos.ts:439` | equipamentos | status_global | `'MANUTENCAO'` |
| `useSupabaseContratos.ts:491` | contrato_itens | status | `'DEVOLVIDO'` ✅ |
| `useSupabaseContratos.ts:584-585` | titulos | status/origem | `'EM_ABERTO'` / `'CONTRATO'` |
| `useSupabaseContratos.ts:682` | contrato_itens | status | `'LOCADO'` ✅ |
| `useSupabaseContratos.ts:691` | equipamentos | status_global | `'LOCADO'` |
| `useSupabaseContratos.ts:700` | logistica_tarefas | status | `'CANCELADO'` |
| `useSupabaseContratos.ts:709` | titulos | status | `'CANCELADO'` |
| `useSupabaseContratos.ts:722` | titulos | tipo | `'DEVOLUCAO_CANCELADA'` ⚠️ |
| `useSupabaseContratos.ts:734` | contratos | status | `'ATIVO'` ✅ |
| `useSupabaseContratos.ts:901` | titulos | status | `'CANCELADO'` |
| `useSupabaseContratos.ts:914` | titulos | tipo | `'RENOVACAO_CANCELADA'` ⚠️ |
| `useSupabaseContratos.ts:946` | aditivos_contratuais | status | `'CANCELADO'` |
| `useSupabaseLogisticaTarefas.ts:135` | contratos | status | `'ATIVO'` ✅ |
| `useSupabaseOrdensServico.ts:342` | ordens_servico | area_atual | `'VERDE'` ✅ |
| `useSupabaseOrdensServico.ts:343` | ordens_servico | status | `'CONCLUIDA'` ✅ |
| `useSupabaseParcelasPagar.ts:117` | parcelas_pagar | status | `'SUSPENSA'` ⚠️ |
| `abrir-os-manutencao.ts:49-52` | ordens_servico | tipo/origem/prioridade/area_atual | `'PREVENTIVA'`/`'POS_LOCACAO'`/`'MEDIA'`/`'AMARELA'` ✅ |
| `useSupabaseCotacoes.ts:132` | compras_cotacoes | status | `'para_aprovacao'` ⚠️ minúsculo |
| `useSupabaseCotacoes.ts:142` | compras_cotacoes | status | `'aprovado'` ⚠️ minúsculo |
| `useSupabaseRequisicoes.ts:57` | compras_requisicoes | status | `'rascunho'` ⚠️ minúsculo |
| `useSupabaseRequisicoes.ts:104` | compras_requisicoes | status | `'solicitado'` ⚠️ minúsculo |
| `useSupabaseBeneficios.ts:135` | rh_beneficio_vinculos | status | `'encerrado'` ⚠️ minúsculo |
| `useSupabaseDocumentos.ts:63` | rh_documentos | status | `'enviado'` ⚠️ minúsculo |
| `useSupabaseDocumentos.ts:72` | rh_documentos | status | `'validado'` ⚠️ minúsculo |
| `useSupabaseFeriasPeriodos.ts:51` | ferias_agendamentos | status | `'solicitado'` ⚠️ minúsculo |
| `useSupabasePessoas.ts:69` | pessoas | situacao | `'inativo'` ✅ (enum `situacao_pessoa`) |
| `useSupabaseSolicitacoes.ts:37` | rh_solicitacoes | status | `'pendente'` ⚠️ minúsculo |
| `NovoContratoV2.tsx:921` | equipamentos | status_global | `'LOCADO'` |
| `inter-webhook/index.ts:106,128` | cobrancas_inter | status | `'PAID'` ⚠️ inglês |
| `setup-demo-user/index.ts:60,105` | pessoas | situacao | `'ativo'` ✅ |
| `setup-demo-user/index.ts:156` | user_roles | role | `'master'` ✅ |
| `whatsapp-instance/index.ts:111` | whatsapp_instances | status | `'desconectado'` |
| `whatsapp-instance/index.ts:176` | whatsapp_instances | status | `'qr_pendente'` |

### 4c. Literais em filtros (`.eq/.in/.neq/.not`) — 35 casos

| Arquivo:linha | Tabela | Campo | Literal |
|---|---|---|---|
| `RenovarContratoModal.tsx:494` | aditivos_contratuais | tipo | `'RENOVACAO'` |
| `SubstituicaoModal.tsx:86` | equipamentos | status_global | `'DISPONIVEL'` |
| `useDisponibilidadeRT.ts:100` | transferencia_itens | tipo | `'SERIAL'` ⚠️ nem SERIE nem SERIALIZADO — 3º vocabulário |
| `useDisponibilidadeRT.ts:108` | transferencias | status | `['CRIADA','EM_TRANSITO']` |
| `useDisponibilidadeRT.ts:182` | transferencia_itens | tipo | `'SALDO'` |
| `useDisponibilidadeRT.ts:193` | transferencias | status | `['CRIADA','EM_TRANSITO']` |
| `useSupabaseAditivos.ts:19` | aditivos_contratuais | status | `'ATIVO'` |
| `useSupabaseAditivos.ts:133` | aditivos_contratuais | tipo | `'RENOVACAO'` |
| `useSupabaseCaixa.ts:28` | caixa | status | `'ABERTO'` — tabela inexistente |
| `useSupabaseContratos.ts:295` | logistica_tarefas | status | `['AGENDAR','PROGRAMADO']` ✅ |
| `useSupabaseContratos.ts:507` | contrato_itens | status | `.not('status','in',...)` |
| `useSupabaseContratos.ts:564` | titulos | status | `['EM_ABERTO','PARCIAL']` |
| `useSupabaseContratos.ts:693` | equipamentos | status_global | `'MANUTENCAO'` |
| `useSupabaseContratos.ts:702-703` | logistica_tarefas | tipo/status | `'RETIRADA'` / `['AGENDAR','PROGRAMADO','REAGENDADO']` ✅ |
| `useSupabaseContratos.ts:715` | titulos | status | `'EM_ABERTO'` |
| `useSupabaseContratos.ts:837-838` | aditivos_contratuais | tipo/status | `'RENOVACAO'` / `'ATIVO'` |
| `useSupabaseContratos.ts:887` | titulos | subcategoria | `'Renovação'` ⚠️ **acentuado e capitalizado** — único do tipo |
| `useSupabaseContratos.ts:888` | titulos | status | `'CANCELADO'` |
| `LogisticaLayout.tsx:44` | logistica_tarefas | status | `['PROGRAMADO','AGENDAR']` ✅ |
| `abrir-os-manutencao.ts:30` | ordens_servico | area_atual | `['AMARELA','VERMELHA','AZUL']` ✅ |
| `CriarUsuarioModal.tsx:65` | user_roles | role | `'master'` ✅ |
| `ContratoDetalhes.tsx:679-680` | logistica_tarefas | tipo/status | `'ENTREGA'` / `'CONCLUIDO'` ✅ |
| `NovoContratoV2.tsx:564` | transferencia_itens | tipo | `'SALDO'` |
| `contract-integrations.ts:86` | transferencias | status | `'EM_TRANSITO'` |
| `contract-integrations.ts:120` | sessoes_contagem | status | `['EM_CONTAGEM','EM_REVISAO','AJUSTADA']` ⚠️ |
| `create-user/index.ts:58` | user_roles | role | `['master','admin','rh']` ✅ |
| `delete-user/index.ts:39` | user_roles | role | `['master','admin']` ✅ |
| `inter-proxy/index.ts:86` | user_roles | role | `"admin"` ✅ |
| `setup-demo-user/index.ts:153` | user_roles | role | `'master'` ✅ |
| `update-user-password/index.ts:38` | user_roles | role | `['master','admin','rh']` ✅ |
| `whatsapp-send/index.ts:86` | whatsapp_instances | status | `'conectado'` |
| `whatsapp-verify/index.ts:68` | whatsapp_instances | status | `'conectado'` |

---

## Prioridades para conferência no banco

Itens marcados ✅ já foram pré-validados contra CHECK constraints/enums encontrados nas migrations — não precisam reconferência. Foco nos ⚠️:

1. **`sessoes_contagem.status`** — o código grava `ABERTA`, `EM_REVISAO`, `AJUSTADA`, `FECHADA`, mas `contract-integrations.ts:120` filtra por `EM_CONTAGEM`. Esse valor não é gravado em lugar nenhum encontrado. Cheiro de valor morto — a integração provavelmente nunca casa.
2. **`transferencia_itens.tipo = 'SERIAL'`** (`useDisponibilidadeRT.ts:100`) — terceiro vocabulário para o mesmo conceito, ao lado de `SERIE` (banco) e `SERIALIZADO` (tela). Existe migration `20260809120000_fix_check_tipo_transferencia_itens.sql` mexendo exatamente nesse CHECK — vale ver qual valor sobreviveu.
3. **`titulos.subcategoria = 'Renovação'`** (`useSupabaseContratos.ts:887`) — único literal acentuado + capitalizado do projeto inteiro. Se a coluna guarda `RENOVACAO`, nunca casa.
4. **`cobrancas_inter.status = 'PAID'`** — único em inglês.
5. **Caixa (case) inconsistente entre módulos** — Compras e RH gravam minúsculo (`rascunho`, `enviado`, `pendente`); todo o resto do sistema grava MAIÚSCULO. Se os CHECKs desses módulos forem maiúsculos, todo insert de Compras/RH falha.
6. **`titulos.status = 'PENDENTE'`** (`FaturamentoCarrinho.tsx:158`) — todo o resto do código usa `EM_ABERTO`/`PARCIAL`/`CANCELADO`/`QUITADO` para `titulos.status`. Este é o único `PENDENTE`.
7. **`parcelas_pagar.status = 'SUSPENSA'`** — sem outro literal do mesmo campo no código para comparar.

---

## O que NÃO foi feito nesta sessão

- Nada foi corrigido (nem o `caixa`, nem literais, nem colunas).
- A aplicação não foi executada, nem Playwright.
- Nenhum PR foi aberto.
- Nenhuma coluna foi validada contra o banco real — apenas contra migrations locais, que documentam intenção, não necessariamente o estado atual do banco.
- Nenhuma migration foi escrita.
- Git tocado apenas para confirmar branch `main` limpa.
