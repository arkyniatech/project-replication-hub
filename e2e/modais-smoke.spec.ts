import { test, expect } from '@playwright/test';
import { loginAsAdmin, expectLoggedIn } from './helpers/login';
import {
  aguardarConteudoProtegido,
  ativarAba,
  abrirDialog,
  abrirAlertDialog,
  abrirMenuDaLinha,
  fecharOverlay,
} from './helpers/ui';

/**
 * Smoke de infraestrutura de teste (Relay 16).
 * Não valida regra de negócio — valida que modal/dropdown/alertdialog abrem
 * em UM clique. Serve de referência para as próximas seções do checklist.
 */

test.describe('Modais e overlays Radix abrem em 1 clique', () => {
  test('Dialog — "Nova Transferência"', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    await page.goto('/financeiro/transferencias');
    await aguardarConteudoProtegido(
      page,
      page.getByRole('heading', { name: /Módulo Financeiro/i }),
    );

    await ativarAba(page, /^Transfer/i);

    const dialog = await abrirDialog(
      page,
      page.getByRole('button', { name: /Nova Transfer/i }),
    );
    await expect(dialog.getByText(/Nova Transferência/i).first()).toBeVisible();

    await fecharOverlay(page, dialog);
  });

  test('DropdownMenu — ação por linha na tabela de Transferências', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    await page.goto('/financeiro/transferencias');
    await aguardarConteudoProtegido(
      page,
      page.getByRole('heading', { name: /Módulo Financeiro/i }),
    );
    await ativarAba(page, /^Transfer/i);

    // A tabela é preenchida pelo store após hidratação assíncrona. Ancorar no
    // trigger evita ler a tabela vazia e concluir "não há linhas" cedo demais.
    const triggers = page.locator('tbody tr button[aria-haspopup="menu"]');
    await expect(triggers.first()).toBeVisible();

    const linhaComMenu = page
      .locator('tbody tr')
      .filter({ has: page.locator('button[aria-haspopup="menu"]') })
      .first();

    const menu = await abrirMenuDaLinha(page, linhaComMenu);
    await expect(menu.getByRole('menuitem').first()).toBeVisible();

    await fecharOverlay(page, menu);
  });

  test('AlertDialog — confirmação de cancelar contagem', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    await page.goto('/compras/inventario');
    await aguardarConteudoProtegido(
      page,
      page.getByRole('heading', { name: /Contagens/i }),
    );

    // O trigger só é renderizado para contagens com status "aberta" e é um
    // botão só-ícone — ancoramos pelo title, que é o nome acessível.
    const trigger = page.getByRole('button', { name: /Cancelar contagem/i }).first();

    // Se não houver contagem aberta, criamos uma para que o caso seja
    // auto-suficiente (o AlertDialog é fechado por "Voltar" logo em seguida,
    // então a contagem criada permanece aberta e reutilizável).
    if ((await trigger.count()) === 0) {
      const novo = await abrirDialog(
        page,
        page.getByRole('button', { name: /Nova Contagem/i }),
      );
      await novo.getByRole('button', { name: /Abrir contagem/i }).click();

      // Abrir a contagem navega para a tela de detalhe dela; voltamos para a
      // listagem, que é onde o trigger do AlertDialog é renderizado.
      await expect(page.getByRole('heading', { name: /Contagem CNT-/i })).toBeVisible();
      await page.goto('/compras/inventario');
      await aguardarConteudoProtegido(
        page,
        page.getByRole('heading', { name: /Contagens/i }),
      );
      await expect(trigger).toBeVisible();
    }

    const alerta = await abrirAlertDialog(page, trigger);
    await expect(alerta.getByText(/Cancelar a contagem/i)).toBeVisible();

    // Fecha pelo "Voltar" — não confirma, para não mutar dados.
    await alerta.getByRole('button', { name: /^Voltar$/i }).click();
    await expect(alerta).toBeHidden();
  });

  test('Dialog — "Nova Contagem" (mesmo padrão, outra página)', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    await page.goto('/compras/inventario');
    await aguardarConteudoProtegido(
      page,
      page.getByRole('heading', { name: /Contagens/i }),
    );

    const dialog = await abrirDialog(
      page,
      page.getByRole('button', { name: /Nova Contagem/i }),
    );
    await expect(dialog).toBeVisible();

    await fecharOverlay(page, dialog);
  });
});
