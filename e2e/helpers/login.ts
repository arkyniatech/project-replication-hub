import { Page, expect } from '@playwright/test';

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.getByPlaceholder('seu@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

export async function loginAsDemo(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Entrar como Demonstração/i }).click();
}

export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_EMAIL_ADMIN;
  const password = process.env.E2E_SENHA_ADMIN;
  if (!email || !password) {
    throw new Error('E2E_EMAIL_ADMIN / E2E_SENHA_ADMIN não configurados em .env.local');
  }
  await loginWithCredentials(page, email, password);
}

export async function loginAsVendedor(page: Page) {
  const email = process.env.E2E_EMAIL_VENDEDOR;
  const password = process.env.E2E_SENHA_VENDEDOR;
  if (!email || !password) {
    throw new Error('E2E_EMAIL_VENDEDOR / E2E_SENHA_VENDEDOR não configurados em .env.local');
  }
  await loginWithCredentials(page, email, password);
}

export async function loginAsGestor(page: Page) {
  const email = process.env.E2E_EMAIL_GESTOR;
  const password = process.env.E2E_SENHA_GESTOR;
  if (!email || !password) {
    throw new Error('E2E_EMAIL_GESTOR / E2E_SENHA_GESTOR não configurados em .env.local');
  }
  await loginWithCredentials(page, email, password);
}

export async function expectLoggedIn(page: Page) {
  await expect(page).not.toHaveURL(/\/auth/i, { timeout: 25_000 });
}

export async function logout(page: Page) {
  // "Sair" fica dentro do dropdown do avatar do usuário (TopBar), sem nome acessível no trigger.
  await page.locator('header button:has(.h-8.w-8)').click();
  await page.getByRole('menuitem', { name: /sair/i }).click();
}
