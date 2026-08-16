import { Page, Locator, expect } from '@playwright/test';

/**
 * Helpers de UI para componentes shadcn/Radix (Dialog, AlertDialog, DropdownMenu,
 * Select, Popover, Sheet).
 *
 * Contexto: o problema de "modal não abre" NÃO era animação nem Portal.
 * Eram duas causas reais, medidas no Relay 16:
 *
 *  1) RBAC assíncrono: guardRoute() renderiza "Acesso Restrito" enquanto as
 *     permissões ainda estão carregando, e só depois re-renderiza o conteúdo.
 *     Timeline medida em produção: 0-2000ms vazio -> 2250-2750ms "Acesso
 *     Restrito" -> 3000ms conteúdo real. Quem clicasse antes dos ~3s
 *     encontrava uma árvore de DOM que nem continha o botão.
 *
 *  2) Radix Tabs desmonta TabsContent inativo. Um botão dentro de uma aba que
 *     não está ativa simplesmente não existe no DOM — não é questão de espera.
 *
 * A regra que resolve os dois: ancorar em conteúdo protegido estável ANTES de
 * interagir, e ativar a aba dona do elemento. Sem retry de clique.
 */

/**
 * Espera a página protegida terminar de resolver o RBAC.
 *
 * Passe um locator âncora que só existe quando o conteúdo autorizado
 * renderizou (tipicamente o <h1> da página). Enquanto o RBAC não resolve, a
 * app pode exibir "Acesso Restrito" transitoriamente — este helper distingue
 * o estado transitório do bloqueio real.
 */
export async function aguardarConteudoProtegido(
  page: Page,
  ancora: Locator,
  timeout = 20_000,
) {
  await expect(ancora).toBeVisible({ timeout });
}

/**
 * Ativa uma aba (Radix Tabs) e espera ela ficar realmente ativa.
 *
 * Necessário porque TabsContent inativo é desmontado: sem isso, o conteúdo da
 * aba não existe no DOM e nenhum wait resolve.
 */
export async function ativarAba(page: Page, nome: RegExp | string) {
  const aba = page.getByRole('tab', { name: nome });
  await expect(aba).toBeVisible();
  await aba.click();
  await expect(aba).toHaveAttribute('data-state', 'active');
  return aba;
}

/**
 * Abre um Dialog a partir do seu trigger e devolve o dialog já visível.
 * Um clique só — se falhar, é bug de verdade e deve falhar o teste.
 */
export async function abrirDialog(page: Page, trigger: Locator) {
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Abre um AlertDialog (confirmação destrutiva) e devolve o alertdialog visível.
 * Radix expõe AlertDialog com role="alertdialog", não "dialog".
 */
export async function abrirAlertDialog(page: Page, trigger: Locator) {
  await expect(trigger).toBeVisible();
  await trigger.click();
  const alerta = page.getByRole('alertdialog');
  await expect(alerta).toBeVisible();
  return alerta;
}

/**
 * Abre o DropdownMenu de uma linha de tabela e devolve o menu visível.
 * O trigger do shadcn não tem nome acessível, então ancoramos em
 * aria-haspopup="menu", que o Radix sempre aplica.
 */
export async function abrirMenuDaLinha(page: Page, linha: Locator) {
  const trigger = linha.locator('button[aria-haspopup="menu"]');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

/** Fecha qualquer overlay Radix aberto e espera ele sumir de fato. */
export async function fecharOverlay(page: Page, overlay: Locator) {
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
}
