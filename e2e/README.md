# Testes E2E — padrão para modais e overlays

Leia isto antes de escrever teste de Contratos, Manutenção, Frota, Logística ou RH.
Essas seções são movidas a modal e drawer, e existe um padrão obrigatório.

## TL;DR

```ts
import { aguardarConteudoProtegido, ativarAba, abrirDialog } from './helpers/ui';

await page.goto('/rota/protegida');

// 1. ancore no conteúdo protegido (NUNCA clique antes disso)
await aguardarConteudoProtegido(page, page.getByRole('heading', { name: /Título da Página/i }));

// 2. se o elemento vive numa aba, ative a aba
await ativarAba(page, /^Nome da Aba/i);

// 3. abra o overlay — um clique só
const dialog = await abrirDialog(page, page.getByRole('button', { name: /Novo Item/i }));
```

## Por que — as duas causas reais

O sintoma era "precisa de 2-3 cliques" ou "o modal nunca abre". Não era animação,
não era `pointer-events`, não era Portal. Foram duas causas medidas:

### 1. RBAC assíncrono renderiza "Acesso Restrito" antes de resolver

`guardRoute()` (em `src/hooks/useRbac.ts`) renderiza a tela de bloqueio sempre que
`anyOf()` é falso — inclusive **enquanto as permissões ainda estão carregando**.
Não há estado de loading.

Timeline medida em produção, usuário ADMIN, `/financeiro/transferencias`:

| Tempo         | Estado do DOM                                  |
| ------------- | ---------------------------------------------- |
| 0 – 2000 ms   | vazio (chunk lazy carregando), 0 tabs          |
| 2250 – 2750 ms| **"Acesso Restrito"** — 5 tabs, falso negativo  |
| 3000 ms       | conteúdo real — 8 tabs, "Módulo Financeiro"     |

Quem clicasse antes de ~3s interagia com uma árvore que nem continha o botão.
Isso também explica a intermitência: o teste às vezes chegava depois dos 3s e passava.

**Consequência prática:** ver "Acesso Restrito" num teste **não** prova falta de
permissão. Só prova que você olhou cedo demais. Para afirmar bloqueio real,
ancore primeiro e só então verifique.

### 2. Radix Tabs desmonta o conteúdo da aba inativa

`TabsContent` sem `forceMount` não existe no DOM quando a aba não está ativa.
Nenhuma espera resolve isso — o elemento não está escondido, está ausente.

Em `/financeiro/transferencias` há **duas camadas** de Tabs aninhadas:

- `ContasPagarLayout` → aba "Extratos & Transferências" (externa)
- `FinanceiroTransferencias` → `defaultValue="saldos"` (interna)

O botão "Nova Transferência" mora na aba interna **"Transferências"**, que não é
a default. Por isso ele nunca aparecia sem ativar a aba.

## Helpers disponíveis (`e2e/helpers/ui.ts`)

| Helper                        | Uso                                                        |
| ----------------------------- | ---------------------------------------------------------- |
| `aguardarConteudoProtegido()` | Ancora após o RBAC resolver. **Sempre o primeiro passo.**   |
| `ativarAba()`                 | Ativa aba Radix e confirma `data-state="active"`.           |
| `abrirDialog()`               | Abre Dialog, devolve `role="dialog"` visível.               |
| `abrirAlertDialog()`          | Abre AlertDialog, devolve `role="alertdialog"`.             |
| `abrirMenuDaLinha()`          | Abre DropdownMenu de linha, devolve `role="menu"`.          |
| `fecharOverlay()`             | Esc + espera sumir de fato.                                 |

## Config global (`playwright.config.ts`)

`reducedMotion: 'reduce'` corta as animações de entrada/saída do Radix no nível do
browser. Não era a causa raiz, mas elimina a janela em que um overlay saindo ainda
intercepta ponteiro. Não é preciso repetir isso em cada teste.

## Locators — o que funciona nesta app

- **Dialog / AlertDialog**: `getByRole('dialog')` / `getByRole('alertdialog')`.
  São roles diferentes; AlertDialog **não** casa com `getByRole('dialog')`.
- **Trigger de DropdownMenu**: os triggers do shadcn são botões só-ícone, sem nome
  acessível. Ancore em `button[aria-haspopup="menu"]`, que o Radix sempre aplica.
- **Botões só-ícone**: têm `title` — e `title` vira nome acessível.
  Ex.: `getByRole('button', { name: /Cancelar contagem/i })`.
- **Tabelas hidratadas por store**: espere o conteúdo aparecer
  (`await expect(triggers.first()).toBeVisible()`) antes de contar linhas. Contar
  cedo devolve 0 e leva à conclusão errada de "não há dados".

## Nunca faça

- **`waitForLoadState('networkidle')`** — inalcançável nesta app. Há long-poll do
  Supabase (`/auth/v1/user`) e, em máquina com Kaspersky, um `longpooling` injetado
  pelo antivírus. Sempre estoura o timeout. Ancore em elemento, não em rede.
- **Retry de clique** (clicar 2-3 vezes até abrir) — mascara o problema real e
  produz teste que passa por sorte. Se um clique não abre, é bug ou âncora errada.
- **`waitForTimeout()` como espera principal** — use os helpers.

## Precondição de dados

Alguns triggers só existem sob certo estado:

- O AlertDialog de cancelar contagem só é renderizado para contagem com
  `status === 'aberta'`. O teste cria uma se não houver.
- Criar contagem **navega para a tela de detalhe** dela. Para voltar à listagem,
  faça `goto('/compras/inventario')` de novo.

## Rodar

```bash
npx playwright test e2e/modais-smoke.spec.ts                 # 4 casos
npx playwright test e2e/modais-smoke.spec.ts --repeat-each=10 # burn-in
```

`e2e/modais-smoke.spec.ts` é a referência viva do padrão: 40/40 em 10 execuções.
