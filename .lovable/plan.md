

## Criar Tarefa de RETIRADA Automatica ao Encerrar Contrato

### Contexto

Hoje, quando um contrato e encerrado (devolucao total via `DevolucaoModal`), o status muda para `ENCERRADO` no banco. Porem, nenhuma tarefa de logistica e criada para a retirada dos equipamentos. O motorista precisa ser alocado para ir buscar os equipamentos no cliente.

### O que sera feito

**1. Migration SQL — Novo trigger `criar_tarefa_retirada_ao_encerrar_contrato`**

Trigger no banco que dispara quando `contratos.status` muda para `ENCERRADO`:
- Cria uma tarefa do tipo `RETIRADA` na `logistica_tarefas` com status `AGENDAR` (pendente de alocacao)
- Preenche cliente, endereco (da obra ou do contrato), telefone
- **Nao atribui motorista automaticamente** — fica pendente para alocacao manual
- Protecao contra duplicatas: nao cria se ja existe RETIRADA para o contrato
- Prioridade `ALTA` (retirada precisa acontecer rapido)

```sql
CREATE OR REPLACE FUNCTION public.criar_tarefa_retirada_ao_encerrar_contrato()
RETURNS trigger AS $$
-- Similar ao trigger de ENTREGA, mas:
-- tipo = 'RETIRADA', status = 'AGENDAR', motorista_id = NULL
-- Apenas dispara quando status muda para 'ENCERRADO'
$$;

CREATE TRIGGER trg_retirada_ao_encerrar
  AFTER UPDATE ON contratos
  FOR EACH ROW
  WHEN (NEW.status = 'ENCERRADO' AND OLD.status <> 'ENCERRADO')
  EXECUTE FUNCTION criar_tarefa_retirada_ao_encerrar_contrato();
```

**2. Nenhuma alteracao no frontend necessaria**

O fluxo ja existente cobre tudo:
- A tarefa aparece automaticamente na secao "Nao Atribuidas" do itinerario (badge amarelo)
- O gestor usa o modal `AtribuirTarefaModal` para alocar motorista e veiculo
- Apenas motoristas **ativos** (`ativo = true`) aparecem no select — isso ja e filtrado pelo hook `useSupabaseLogisticaMotoristas` (linha `eq("ativo", true)`)
- O Kanban (`QuadroLogistica`) exibe a coluna `AGENDAR` onde a tarefa vai aparecer

### Fluxo completo apos implementacao

```text
Devolucao total confirmada
  → Contrato muda p/ ENCERRADO
  → Trigger cria tarefa RETIRADA (status AGENDAR, sem motorista)
  → Tarefa aparece em "Nao Atribuidas" na Logistica
  → Gestor atribui motorista ativo + veiculo
  → Motorista executa retirada
  → Equipamentos voltam p/ area Amarela (manutencao)
```

### Escopo

- 1 migration SQL (trigger + function)
- 0 alteracoes no frontend

