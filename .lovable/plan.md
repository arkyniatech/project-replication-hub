## Plano de Correções — Rodada 3 (tickets #12 a #28)

Vou dividir em 3 blocos por urgência, exatamente como você marcou. Confirme se posso seguir nesta ordem que eu já entrego tudo na sequência.

### Bloco URGENTE (corrigir primeiro)

**#12 + #19 + #23 + #25 — PDF e datas do contrato**
- PDF passa a usar o endereço de entrega da etapa de logística (não o do cadastro do cliente).
- Adicionar linha **"Frete"** na tabela de equipamentos + linha **"Valor Total"** somando equipamentos + frete (hoje sai zerado).
- Corrigir bug de timezone que está jogando vencimento 1 dia pra trás (22/06 → 21/06; 24/06 → 23/06; 06/07 → 05/07). Causa: `new Date('YYYY-MM-DD')` em UTC. Vou padronizar via parser local em `contrato-pdf.ts`, `ContasReceber` e demais telas.
- Adicionar **Termos do contrato + Nota promissória** ao final do PDF (vou usar o texto-padrão genérico baseado no modelo enviado; se quiser texto específico da loja, me envia que eu colo).
- #12.3 / código do produto: o PDF passa a usar `formatCodigoExibicao` (BE-069 etc), espelhando a lista.

**#16 — Contas a receber não recebe contratos novos**
- Investigar: na rodada anterior o insert em `titulos` foi adicionado, mas provavelmente falhando silenciosamente (RLS ou erro engolido). Vou logar erro, exibir toast e garantir que `loja_id`/`cliente_id`/`vencimento` estão corretos.

**#17 — Modal de Renovação sem botão**
- A modal está sem footer/scroll em telas menores. Vou ajustar layout (DialogFooter sticky + scroll interno) e garantir o botão "Confirmar Renovação".

**#18 + #21 — Baixa de pagamento sem botão / erro**
- Mesmo problema de footer cortado em telas <1080p. Ajustar modal `BaixaPagamento` com footer sticky.
- Investigar erro de insert em `recebimentos` ao confirmar baixa (provavelmente coluna obrigatória faltando).

**#24 — "Cliente retira na loja" dá erro ao confirmar**
- Bug no `handleSubmit` do wizard quando `logistica.tipo === 'RETIRA_LOJA'`: campos de endereço/data ficam null mas o insert exige. Vou tornar opcionais nesse caminho.

**#26 — Equipamentos alugados aparecem como disponíveis + busca quebrada**
- Atualizar `EquipamentosLista` para filtrar `status_global !== 'LOCADO'` no card "disponíveis".
- Corrigir busca: hoje filtra só por `numero_serie` exato; passar a buscar por nome do modelo + código formatado (BE-069).

**#20 — Cadastro de veículo/motorista volta pra tela inicial**
- O botão "+ Novo" na atribuição da tarefa de logística está navegando pra `/logistica` em vez de abrir modal. Vou trocar por modal inline mantendo o contexto da tarefa.

**#22 — Replicar endereço do cliente no contrato**
- Adicionar botão **"Usar endereço do cliente"** na etapa de logística do wizard, que copia CEP/rua/número/bairro/cidade/UF do cliente selecionado.

### Bloco ALTA

**#13 — Equipamentos locados ainda aparecem na seleção do contrato**
- Filtrar no passo de seleção do wizard: serializados com `status_global = 'LOCADO'` não devem aparecer. Já existe a atualização de status (rodada 2), mas o filtro de seleção não respeita.

**#27 — Erro ao atualizar cadastro de equipamento**
- Investigar e corrigir (provavelmente update tentando alterar coluna gerada/imutável ou RLS). Preciso do log do console — se você puder reproduzir, manda print do erro; senão eu adiciono logs e descubro na próxima rodada.

### Bloco BAIXA

**#28 — Botão "Todas as opções" no checklist do cadastro de equipamento**
- Adicionar botão "Selecionar todos" no checklist de variações/acessórios do `EquipamentoForm`.

---

### O que eu preciso de você antes de começar

1. **Termos do contrato + nota promissória (#19.2):** posso usar um texto genérico padrão de locação de equipamentos, ou você prefere mandar o texto exato que a loja usa? (Recomendo mandar o seu, mas se quiser destravar agora eu uso um padrão e a gente troca depois.)
2. **#27:** se conseguir reproduzir, manda o print do erro do console (F12 → Console). Sem isso, eu corrijo às cegas com logs.

### Ordem de execução proposta

Rodada A (urgente): #12, #16, #17, #18, #19, #21, #22, #23, #24, #25, #26, #20  
Rodada B (alta): #13, #27  
Rodada C (baixa): #28

Posso seguir? Se sim, respondo "vai" e eu mando a Rodada A inteira de uma vez.