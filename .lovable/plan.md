## Plano: Correções da Avaliação LocaHub (23 itens)

São muitos itens (10 bugs + 13 melhorias). Vou organizar em **5 fases entregáveis**. Você aprova esse plano único e eu executo todas as fases em sequência.

---

### Fase 1 — Bugs críticos de backend (desbloqueiam testes)

1. **RLS de equipamentos** — política INSERT exige role `vendedor/gestor/admin`. Adicionar `master` e revisar (página 6 do feedback).
2. **Edge function `whatsapp-verify`** — investigar logs, validar variáveis `UAZAPI_URL/UAZAPI_TOKEN` e corrigir resposta de erro.
3. **Edge function `whatsapp-send` (envio do contrato)** — mesmo diagnóstico via logs e correção.
4. **Erro "Erro ao criar contrato" na etapa 7/7** — reproduzir via DB/logs e corrigir (provável RLS/payload em `contratos` ou `contrato_itens`).
5. **Cadastro de Obra falhando dentro do contrato** — investigar tabela `obras` e fluxo do `SeletorObraModal`.

### Fase 2 — Novos campos e cadastros base

6. **Campo "Marca"** em equipamentos: nova tabela `marcas_equipamentos` (RLS: só master/admin cria, todos veem). Adicionar `marca_id` em `equipamentos` e selector no formulário, ao lado de Grupo/Modelo.
7. **Variações cadastráveis** (Tensão, Combustível, Capacidade, Estado): nova tabela `variacoes_equipamento` com `tipo` enum, gerida pela franqueadora, alimentando os selects de Dados Técnicos.
8. **Coordenadas GPS em Obras**: adicionar colunas `latitude/longitude` (numeric) em `obras` + campo no formulário com botão "abrir no mapa".
9. **Data de vencimento padrão por cliente**: adicionar `dia_vencimento_padrao` (int 1-31) em `clientes`, exibir em "Condições & Políticas" e pré-preencher no contrato.
10. **Negociação pontual no cliente**: adicionar bloco "Negociação personalizada" (jsonb `negociacao_pontual` em `clientes`) — desconto %, prazo, observação — usado automaticamente nas políticas comerciais do contrato.

### Fase 3 — UX do cadastro de Cliente

11. Remover campo **Responsável** do formulário PF.
12. Tornar **Data de Nascimento obrigatória** (PF).
13. Reordenar contatos: **WhatsApp como primeiro/principal** por padrão.
14. Corrigir dropdown "Tipo de Contato" do primeiro contato (não abre).
15. Bloquear finalização do cadastro se WhatsApp não foi autenticado (validação obrigatória).
16. Reformular "Principal": separar em **Telefone Principal**, **WhatsApp Principal** e **Email Principal** (não tudo num único radio).
17. Condensar layout dos contatos (reduzir espaços vazios, agrupar em cards menores).

### Fase 4 — UX de Equipamentos, Contratos e Geral

18. **Aba Patrimonial em Equipamentos**: corrigir tela branca; mostrar listagem com Grupo, Descrição, Nº Patrimônio e Nº Série.
19. **Botão Transferir** no detalhe do equipamento: corrigir abertura do modal (atualmente não acontece nada).
20. **Aviso "loja ativa"**: exibir apenas no login, não a cada navegação. Usar `sessionStorage` para suprimir após primeira exibição.
21. **Forma de pagamento**: trocar "Cartão" por "Cartão de Débito" / "Cartão de Crédito" separadamente.
22. **Remover "Li e concordo"** durante elaboração do contrato (assinatura física basta).
23. **Remover "Assinar Digitalmente" do usuário do sistema** (só cliente assina).
24. **Confirmação de obra**: garantir que obra criada durante o contrato fique salva no cadastro do cliente (vincular `obras.cliente_id`).
25. **Barra de ferramentas auto-ocultar** quando não estiver em uso (na página de Contrato).

### Fase 5 — Layout PDF do Contrato

26. **Reformatar PDF do contrato** (`src/utils/contrato-pdf.ts`):
    - Cabeçalho com mais contraste (faixas de cor entre seções)
    - Seções claramente separadas: Dados Cliente / Equipamentos / Condições / Assinaturas
    - Tabela de itens com cabeçalho colorido e linhas zebradas
    - Espaçamento maior entre blocos
    - Rodapé com paginação

---

### Detalhes técnicos relevantes

**Migrations SQL necessárias:**
- `ALTER TABLE equipamentos ADD COLUMN marca_id uuid;` + nova tabela `marcas_equipamentos`
- Nova tabela `variacoes_equipamento (id, tipo, valor, ativo)` com RLS master/admin
- `ALTER TABLE obras ADD COLUMN latitude numeric, ADD COLUMN longitude numeric;`
- `ALTER TABLE clientes ADD COLUMN dia_vencimento_padrao int, ADD COLUMN negociacao_pontual jsonb DEFAULT '{}'::jsonb;`
- Atualizar policy INSERT de `equipamentos` para incluir `is_master(auth.uid())`

**Edge Functions a investigar/corrigir:**
- `whatsapp-verify` — logs via `supabase--edge_function_logs`
- `whatsapp-send` — idem
- (criar contrato é client-side via Supabase client — investigar payload)

**Arquivos client-side principais:**
- `src/components/forms/ClienteForm.tsx` (Fase 3)
- `src/pages/equipamentos/AnalisePatrimonial.tsx`, `EquipamentosLista.tsx` (Fase 4)
- `src/components/equipamentos/EquipamentoDetalhes.tsx` (botão transferir)
- `src/components/contratos/SeletorObraModal.tsx` (criar obra)
- `src/utils/contrato-pdf.ts` (Fase 5)
- Local do banner de "loja ativa" (provavelmente `AppInitializer.tsx` ou `RhTopBar`)

---

### Observações importantes

- **Volume**: 23 itens é bastante. A execução vai gerar várias migrations e tocar 15-20 arquivos. Provavelmente precisará de 2-3 ciclos de execução.
- **Bloqueios prováveis**: alguns bugs (whatsapp-verify, criar contrato) podem revelar configuração ausente de env vars ou exigir dados que só você tem.
- **Ordem importa**: Fase 1 primeiro porque sem ela você não consegue testar o resto.
- Se preferir, posso começar **só pela Fase 1** e depois você decide se segue. Mas se aprovar tudo, executo as 5 em sequência.

Aprova esse escopo completo? Se quiser remover/adiar algo, me diga antes de aprovar.