import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsVendedor, loginAsGestor, expectLoggedIn } from './helpers/login';

/**
 * Regressão do flash de "Acesso Restrito" (Relay 16 -> 17).
 *
 * guardRoute() decidia o gate com anyOf(), que responde false para TODOS os
 * claims enquanto os papéis ainda carregam. Resultado medido em produção com
 * usuário ADMIN em /financeiro/transferencias:
 *
 *   0 - 2000ms   vazio (chunk lazy)
 *   2250 - 2750ms "Acesso Restrito"  <- falso negativo
 *   3000ms       conteúdo real
 *
 * Estes testes amostram o DOM desde o primeiro frame do reload. Duas metades,
 * e a segunda importa tanto quanto a primeira:
 *   a) AUTORIZADO nunca pode ver a tela de bloqueio (nem por um frame).
 *   b) NÃO AUTORIZADO tem de continuar vendo — corrigir flash não é liberar.
 */

const TEXTO_BLOQUEIO = /Acesso Restrito|Acesso Negado/;

/**
 * Instala um MutationObserver ANTES de qualquer script da app rodar e coleta
 * todas as ocorrências do texto de bloqueio, com timestamp.
 *
 * Por que não fazer polling do lado do Playwright: cada round-trip custa
 * dezenas de ms e a janela do flash é curta. O observer roda dentro da página
 * e não perde frame. Amostragem adicional a cada 20ms cobre o caso de o texto
 * entrar e sair entre duas mutações observadas.
 */
async function instalarSensorDeFlash(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __flashes: number[];
      __amostras: number;
      __ultimaAmostra: number;
    };
    w.__flashes = [];
    w.__amostras = 0;
    w.__ultimaAmostra = 0;
    const t0 = performance.now();

    const checar = () => {
      const agora = Math.round(performance.now() - t0);
      w.__amostras++;
      w.__ultimaAmostra = agora;
      // textContent, não innerText: innerText depende de layout e devolve ''
      // para conteúdo ainda não renderizado — ponto cego justamente na janela
      // de carga que queremos medir.
      const texto = document.body?.textContent ?? '';
      if (/Acesso Restrito|Acesso Negado/.test(texto)) {
        w.__flashes.push(agora);
      }
    };

    const iniciar = () => {
      new MutationObserver(checar).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      setInterval(checar, 20);
      checar();
    };

    if (document.body) iniciar();
    else document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  });
}

async function lerSensor(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as {
      __flashes: number[];
      __amostras: number;
      __ultimaAmostra: number;
    };
    return {
      flashes: w.__flashes ?? [],
      amostras: w.__amostras ?? 0,
      ultimaAmostra: w.__ultimaAmostra ?? 0,
    };
  });
}

/**
 * Reload da rota com o sensor ativo, ancorando no conteúdo autorizado.
 * Retorna as ocorrências de bloqueio vistas durante toda a janela de carga.
 */
async function medirFlash(page: Page, rota: string, ancora: RegExp) {
  await instalarSensorDeFlash(page);
  await page.goto(rota);
  await expect(
    page.getByRole('heading', { name: ancora }).first(),
  ).toBeVisible({ timeout: 25_000 });
  // Continua amostrando depois da âncora: um refetch dos papéis (invalidação de
  // cache) poderia reintroduzir o bloqueio já com a página montada. Parar de
  // medir na âncora deixaria essa regressão invisível.
  await page.waitForTimeout(1500);
  return lerSensor(page);
}

/**
 * A janela do flash medida em produção foi 2250-2750ms. Um teste que só amostra
 * os primeiros milissegundos passaria sem nunca ter olhado onde o bug mora —
 * por isso exigimos cobertura comprovada além dela.
 */
const FIM_DA_JANELA_DE_RISCO_MS = 3000;

function conferirCobertura(amostras: number, ultimaAmostra: number) {
  expect(amostras, 'sensor não coletou amostras — resultado não prova nada').toBeGreaterThan(20);
  expect(
    ultimaAmostra,
    `sensor parou em ${ultimaAmostra}ms, antes do fim da janela de risco`,
  ).toBeGreaterThan(FIM_DA_JANELA_DE_RISCO_MS);
}

test.describe('RBAC — flash de bloqueio em rotas com guardRoute()', () => {
  test('admin não vê "Acesso Restrito" em /financeiro/transferencias', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    const { flashes, amostras, ultimaAmostra } = await medirFlash(
      page,
      '/financeiro/transferencias',
      /Módulo Financeiro/i,
    );

    conferirCobertura(amostras, ultimaAmostra);
    expect(flashes, `bloqueio visto nos ms: ${flashes.join(', ')}`).toEqual([]);
  });

  test('admin não vê "Acesso Restrito" em /admin/users', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    const { flashes, amostras, ultimaAmostra } = await medirFlash(
      page,
      '/admin/users',
      /Gestão de Usuários/i,
    );

    conferirCobertura(amostras, ultimaAmostra);
    expect(flashes, `bloqueio visto nos ms: ${flashes.join(', ')}`).toEqual([]);
  });

  test('vendedor continua bloqueado em /admin/users (rh:users)', async ({ page }) => {
    await loginAsVendedor(page);
    await expectLoggedIn(page);

    await page.goto('/admin/users');

    // O bloqueio é o estado FINAL e estável — não um frame transitório.
    await expect(page.getByText(TEXTO_BLOQUEIO).first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /Gestão de Usuários/i })).toHaveCount(0);
  });

  test('vendedor continua bloqueado em /configuracoes', async ({ page }) => {
    await loginAsVendedor(page);
    await expectLoggedIn(page);

    await page.goto('/configuracoes');

    await expect(page.getByText(TEXTO_BLOQUEIO).first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('tab', { name: /Organização/i })).toHaveCount(0);
  });

  // Depende de gestor NÃO ter config:usuarios, settings:templates nem
  // settings:sequencias (ver ROLE_TO_CLAIMS em src/hooks/useRbac.ts). Se algum
  // desses claims for concedido ao gestor, este teste falha — e a falha é sobre
  // a matriz de claims, não sobre o flash.
  test('gestor continua bloqueado em /configuracoes', async ({ page }) => {
    await loginAsGestor(page);
    await expectLoggedIn(page);

    await page.goto('/configuracoes');

    await expect(page.getByText(TEXTO_BLOQUEIO).first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('tab', { name: /Organização/i })).toHaveCount(0);
  });
});
