

## Analise: Renovações (1.1, 1.2) e Tarefas de Entrega

### Situação Atual

O trigger `criar_tarefa_logistica_ao_ativar_contrato` tem uma proteção que **já evita** criar tarefa duplicada na maioria dos casos de renovação:

```sql
-- Se o contrato JÁ estava ATIVO, não cria nova tarefa
IF TG_OP = 'UPDATE' AND OLD.status = 'ATIVO' THEN
  RETURN NEW;
END IF;
```

Como a renovação (1.1, 1.2) atualiza um contrato que já está com `status = 'ATIVO'`, o trigger não dispara. Portanto, **nenhuma entrega duplicada é criada**.

### Caso de Borda

Se um contrato passar por um status intermediário (ex: ATIVO → ENCERRADO → reativado), o trigger **criaria** uma nova tarefa de entrega. Isso pode ou não ser desejado.

### Melhoria Proposta

Adicionar uma verificação extra no trigger para ignorar contratos que **já possuem uma tarefa de entrega concluída**, indicando que o equipamento já foi entregue:

```sql
-- Se já existe tarefa de entrega (concluída ou não), não criar outra
IF EXISTS (
  SELECT 1 FROM public.logistica_tarefas 
  WHERE contrato_id = NEW.id AND tipo = 'ENTREGA'
) THEN
  RETURN NEW;
END IF;
```

Essa verificação **já existe** no trigger atual. Portanto, o sistema está protegido.

### Conclusão

**Nenhuma alteração é necessária.** O trigger já possui duas proteções:
1. Ignora UPDATE quando `OLD.status` já era `ATIVO` (caso da renovação)
2. Ignora se já existe tarefa de entrega para o contrato (fallback)

Renovações 1.1, 1.2 não geram novas entregas.

