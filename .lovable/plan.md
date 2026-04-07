

## Analise: Integração Contrato → Logistica (Tarefas Pendentes)

### O que ja funciona hoje

O sistema **ja possui** exatamente o fluxo que voce descreveu:

1. **Trigger automatico no banco**: `criar_tarefa_logistica_ao_ativar_contrato` -- quando um contrato muda para status `ATIVO`, o trigger cria automaticamente uma tarefa de `ENTREGA` na tabela `logistica_tarefas` com status `PROGRAMADO`.

2. **Auto-atribuicao de motorista**: Se a loja tem apenas 1 motorista ativo, o trigger ja atribui automaticamente. Se tem mais de 1, a tarefa fica **sem motorista** (pendente de alocacao).

3. **Visibilidade de tarefas nao atribuidas**: O layout da Logistica (`LogisticaLayout.tsx`) ja exibe um **badge com contagem** de tarefas sem motorista. O itinerario diario tem uma secao dedicada "Nao Atribuidas" com destaque amarelo.

4. **Quadro Kanban**: O `QuadroLogistica.tsx` tem 6 colunas incluindo `AGENDAR` e `PROGRAMADO`, permitindo arrastar tarefas entre status.

5. **Realtime**: O hook `useContratoLogisticaSync` escuta mudancas via Supabase Realtime e invalida caches automaticamente.

6. **Protecoes contra duplicatas**: O trigger nao cria tarefa se o contrato ja era `ATIVO` (renovacao) ou se ja existe tarefa de entrega para aquele contrato.

### Conclusao

**Nenhuma alteracao necessaria.** O fluxo completo ja esta implementado:

```text
Contrato criado → Status muda p/ ATIVO → Trigger cria tarefa ENTREGA
  → Tarefa aparece como "Nao Atribuida" na Logistica
  → Gestor atribui motorista/veiculo
  → Motorista executa entrega
  → Entrega concluida → Trigger ativa contrato (se necessario)
```

O unico ponto de atencao e que tarefas de **RETIRADA** (devolucao) ainda nao sao criadas automaticamente quando um contrato e encerrado -- isso foi listado como sugestao futura na varredura anterior.

