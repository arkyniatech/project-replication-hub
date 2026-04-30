## Revisão do arquivo `Avaliacao_e_teste_do_LocaHub_22042026-2.docx`

Cruzei cada observação do documento com o estado atual do código. Resumo:

### Já implementado (✅)
- RLS de equipamentos corrigido (pág. 6)
- Marcas + variações cadastráveis só pela franqueadora (pág. 4 e 5)
- Aba Patrimonial resiliente (pág. 3)
- GPS em Obras: colunas + captura no `SeletorObraModal` (pág. 16)
- Erro amigável quando WhatsApp da loja está desconectado (pág. 2 e 11)
- Forma de pagamento separada em Cartão Débito/Crédito (pág. 18)
- PDF do contrato com layout institucional (pág. 20–21)
- "Li e concordo" removido do wizard (pág. 17)
- Modal de transferência abre a partir do detalhe do equipamento (pág. 8)

### ❌ Pendente — o que ainda falta

**Bloco A — Cliente PF (a maior parte do que ficou pra trás)**
1. **Remover campo "Responsável"** do formulário PF — ainda aparece em `ClienteForm.tsx` (linhas 88, 328) e na UI da pág. 1.
2. **Data de Nascimento obrigatória (PF)** — não há validação; ainda é opcional.
3. **Bloquear submit sem WhatsApp verificado** — só existe o texto de aviso "obrigatório autenticar"; nada bloqueia o `onSubmit` se o WhatsApp principal não estiver verificado.
4. **Corrigir dropdown "Tipo de Contato" do 1º contato** que não abre (pág. 1) — precisa investigar o `Select` do primeiro card.
5. **Separar "Principal" por canal** (telefone principal, whatsapp principal, email principal) — hoje é um único radio que mistura os 3 (pág. 2).
6. **Condensar layout dos cards de contato** — muito espaço vazio entre cards (pág. 2).
7. **`dia_vencimento_padrao` no cadastro do cliente** + usar como default no Step 5 do contrato (pág. 3).
8. **`negociacao_pontual` no cadastro** + aplicar automático nas políticas comerciais do contrato (pág. 14).

**Bloco B — Contrato**
9. **Remover botão "Assinar Digitalmente"** do `ContratoHeader.tsx` (linhas 122–137) — pág. 11 diz que não faz sentido o usuário do sistema assinar.
10. **Auto-ocultar a barra de ferramentas do contrato** após inatividade do mouse (pág. 23).

**Outros**
11. **Toast "Loja ativa" aparecendo toda hora** (pág. 7) — em `AppShell.tsx` (linhas 60–69) o `useEffect` dispara em qualquer remontagem do shell. Precisa disparar **só uma vez por sessão** (ex.: ref + sessionStorage flag) ou só quando o usuário **trocar** de loja manualmente.
12. **Vincular obra criada no wizard ao `cliente_id`** (pág. 8 — pergunta do usuário) — confirmar e garantir que `obras.cliente_id` é populado quando a obra é criada via `SeletorObraModal` dentro do contrato.

---

### Plano de execução (uma rodada)

Ordem: **Item 11 (toast) → Bloco A (1–8) → Bloco B (9–10) → Item 12 (validação)**.

**Arquivos que serão tocados:**
- `src/components/layout/AppShell.tsx` — toast da loja só na 1ª seleção da sessão.
- `src/components/forms/ClienteForm.tsx` — remover Responsável; tornar DOB obrigatória (PF); 3 selects "principal" independentes (telefone/whatsapp/email); validação bloqueante de WhatsApp verificado; condensar grid (md:grid-cols-2, paddings menores); investigar/consertar Select do 1º contato (provavelmente value vazio); novos campos `dia_vencimento_padrao` e `negociacao_pontual` na aba Condições & Políticas.
- `src/pages/NovoContratoV2.tsx` (Step 5) — pré-preencher vencimento com `dia_vencimento_padrao` do cliente; aplicar `negociacao_pontual` ao montar política.
- `src/components/contratos/ContratoHeader.tsx` — remover botão "Assinar digitalmente"; envolver toolbar em wrapper com auto-hide (mousemove/scroll resetam timer de 3s; sempre visível em touch/mobile).
- `src/pages/ContratoDetalhes.tsx` — remover handler `handleAssinarDigitalmente` e prop relacionada se ficar órfã.
- `src/components/contratos/SeletorObraModal.tsx` — confirmar que ao criar obra grava `cliente_id` do contrato em curso (se faltar, adicionar).

**Migrations:** nenhuma nova (`dia_vencimento_padrao` e `negociacao_pontual` já existem em `clientes`; `obras.cliente_id` já existe).

**Riscos**
- A separação de "Principal" em 3 canais muda o shape persistido em `contatos[]` → manter compat lendo o legado (`principal: true` continua válido para o canal correspondente).
- Auto-hide da toolbar no viewport mobile (402px) deve permanecer **sempre visível** para evitar UX ruim em touch.
- Bloquear submit sem WhatsApp verificado pode travar cadastros legados → aplicar a validação só para clientes **novos** (sem `id`).

Aprova pra eu executar tudo de uma vez?