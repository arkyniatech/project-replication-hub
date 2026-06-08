## Correções dos 5 chamados do cliente

Vou tratar cada chamado de forma isolada, sem mexer em escopo não pedido.

### #1 — Menu lateral não expande no hover

**Sintoma:** o `NavRail` (menu lateral recolhido) está "quebrado" — não expande quando o mouse passa por cima.

**Investigação:** `src/components/layout/NavRail.tsx`, `NavOverlayPanel.tsx`, `useNavRail.ts`, `AppShell.tsx`. Provavelmente o handler `onMouseEnter`/`onMouseLeave` está perdendo o estado ou o `NavOverlayPanel` não está sendo montado, ou um `z-index` está cobrindo.

**Correção:** restaurar a expansão por hover (com pequeno delay anti-flicker), garantir que o painel overlay fique acima do conteúdo e fechar ao sair com `onMouseLeave`. Persistência em localStorage mantida.

### #2 — Combo de Cargos piscando em RH/Pessoas

**Sintoma:** Listagem de cargos no formulário de Pessoa pisca e itens do final ficam difíceis de clicar ao rolar.

**Investigação:** `src/modules/rh/components/PessoaForm.tsx` (campo "cargo"). Sintoma típico de `Select` do shadcn dentro de `Dialog`/`Sheet` com `modal` ou `pointer-events` conflitando, ou um `Combobox` (`Command`) com lista grande sem `max-height` + `overflow`.

**Correção:** dar `max-height` + `overflow-y-auto` ao `CommandList`/`SelectContent`, remover re-renders desnecessários (estabilizar a lista de cargos com `useMemo`), e garantir `position="popper"` + `sideOffset` para não competir com o Dialog.

### #3 — Cadastro de Marca de Equipamento

**Sintoma:** ao cadastrar equipamento, pede uma Marca, mas não há tela para cadastrá-la. A tabela `marcas_equipamentos` já existe no banco.

**Correção:** adicionar uma seção **"Marcas"** dentro de `src/pages/equipamentos/CatalogoGruposModelos.tsx` (mesmo padrão dos grupos/modelos): listagem + botão "Nova Marca" + modal de criação/edição/exclusão. Hook novo `useSupabaseMarcas` (CRUD simples em `marcas_equipamentos`). Sem alterar a etapa de marca em `NovoEquipamento.tsx`, apenas garantir que o seletor já existente consulte a lista atualizada.

### #4 — Desabilitar verificação de telefone no cadastro de cliente

**Sintoma:** no cadastro de cliente o sistema envia código WhatsApp para confirmar o telefone — cliente quer desativar temporariamente.

**Investigação:** preciso localizar o ponto exato (provavelmente em `src/components/clientes/*` ou em um `ClienteForm`/modal — vou procurar `whatsapp-verify`/"código"/"verificação").

**Correção:** adicionar uma flag `VITE_CLIENTE_PHONE_VERIFICATION` (default `false`) e curto-circuitar o fluxo: o telefone é gravado direto como "não verificado", sem disparar `whatsapp-verify`, sem modal de código. Nenhuma migração no banco — o campo de verificação existente permanece, só não é exigido.

### #5 — Compras/Requisições

**Sintoma:** no formulário de Requisição (`src/pages/compras/Requisicoes.tsx`):
1. SKU obrigatório → remover obrigatoriedade;
2. Campo "Descrição" pequeno → trocar `<Input>` por `<Textarea>` com altura maior e largura cheia;
3. Numeração não sequencial → corrigir geração para usar `useNumeracao`/sequência persistida (mesmo padrão dos contratos).

**Correção:** ajustar validação (zod) tirando `.min(1)` do `sku`, aumentar a coluna do campo descrição, e trocar a geração de número pela sequência `REQ` persistida em `sequencias`/`useNumeracao`. Compras é módulo local (legacy), então a numeração pode ficar em store local com `nextval` consistente entre sessões via Supabase `sequencias`.

### Ordem de execução

Vou abrir em sequência, cada chamado em sua leva de edições, sem misturar arquivos. Confirmo cada um antes de seguir caso a investigação mostre algo fora do esperado (por exemplo, ponto exato da verificação WhatsApp em #4).

### Fora de escopo

- Não vou redesenhar telas;
- Não vou mexer em RLS, autenticação ou outras integrações além do `whatsapp-verify` para o chamado #4;
- Sem alterações no edge function `create-user` (já corrigido na rodada anterior).
