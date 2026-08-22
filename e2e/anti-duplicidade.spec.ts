/**
 * RELAY 70 — retorno de UI da anti-duplicidade de nota fiscal.
 *
 * A migration 20260821170000 criou doc_tipo, doc_numero e chave_fiscal_44 em
 * titulos_pagar, mais dois índices únicos. O usuário já validou os índices
 * direto no banco. O que ESTES testes cobrem é a metade que o banco não cobre:
 * o que o operador vê quando a constraint dispara.
 *
 * O item 2 é o que decide se a entrega vale. Constraint que dispara com
 * "duplicate key value violates unique constraint ..." transfere o problema
 * para o usuário, não resolve.
 *
 * ANCORAGEM: cada execução gera um sufixo próprio (RUN) e todo título criado
 * carrega esse sufixo no número do documento. Nada de `.first()` numa lista que
 * re-renderiza — os títulos são localizados pelo número que este teste escreveu.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, expectLoggedIn } from './helpers/login';
import { aguardarConteudoProtegido, abrirDialog } from './helpers/ui';

/**
 * Sufixo único da execução. Só dígitos: `normalizeDocNumber` descarta o resto,
 * então letras aqui não sobreviveriam à comparação e dariam falso negativo.
 */
const RUN = String(Date.now()).slice(-9);

/** Chave fiscal de 44 dígitos. O guard do índice exige exatamente 44. */
const CHAVE_44 = ('7' + RUN).padEnd(44, '0').slice(0, 44);

async function irParaParcelas(page: Page) {
  await page.goto('/pagar/parcelas');
  await aguardarConteudoProtegido(
    page,
    page.getByRole('heading', { name: /Parcelas a Pagar/i })
  );
}

/**
 * Abre o drawer e preenche o formulário. Devolve o drawer.
 *
 * Fornecedor e categoria vêm do banco: pegamos o primeiro item REAL de cada
 * select (ignorando as opções desabilitadas "Carregando..." / "Nenhum ...").
 */
async function preencherTitulo(
  page: Page,
  dados: {
    valor: string;
    docNumero: string;
    chaveFiscal?: string;
    docTipo?: RegExp;
    fornecedorIndice?: number;
  }
) {
  const drawer = await abrirDialog(page, page.getByRole('button', { name: /Novo Título/i }));

  // Os selects são ancorados pelo TEXTO do trigger, não por id: os `Label
  // htmlFor="fornecedor"` / "categoria" / "docTipo" do drawer apontam para ids
  // que não existem — o SelectTrigger do shadcn não repassa id. Defeito de
  // acessibilidade pré-existente, fora do escopo deste relay; anotado no
  // relatório. O texto do placeholder é a identidade estável disponível.
  //
  // Fornecedor — o select só tem opção real depois que a query resolve.
  await drawer.getByText('Selecione o fornecedor').click();
  const opcoesFornecedor = page.getByRole('option').filter({ hasNotText: /Carregando|Nenhum/i });
  await expect(opcoesFornecedor.first()).toBeVisible({ timeout: 15_000 });
  await opcoesFornecedor.nth(dados.fornecedorIndice ?? 0).click();

  await drawer.getByText('Selecione a categoria').click();
  const opcoesCategoria = page.getByRole('option').filter({ hasNotText: /Carregando|Nenhuma/i });
  await expect(opcoesCategoria.first()).toBeVisible({ timeout: 15_000 });
  await opcoesCategoria.first().click();

  await drawer.locator('#valorTotal').fill(dados.valor);

  if (dados.docTipo) {
    // O trigger de tipo de documento já vem preenchido ("Nota Fiscal" por
    // padrão), então ancoramos no valor atual em vez de num placeholder.
    await drawer.getByRole('combobox').filter({ hasText: /Nota Fiscal|Boleto|Outro/i }).click();
    await page.getByRole('option', { name: dados.docTipo }).click();
  }

  await drawer.locator('#docNumero').fill(dados.docNumero);

  if (dados.chaveFiscal !== undefined) {
    await drawer.locator('#chaveFiscal44').fill(dados.chaveFiscal);
  }

  return drawer;
}

/** Salva como rascunho e espera o drawer sumir (sinal de que gravou). */
async function salvarEsperandoSucesso(page: Page, drawer: ReturnType<Page['getByRole']>) {
  await drawer.getByRole('button', { name: /Salvar Rascunho/i }).click();
  await expect(drawer).toBeHidden({ timeout: 20_000 });
}

test.describe('Relay 70 — anti-duplicidade de nota fiscal', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);
  });

  test('1. lança título com NF nova e grava as três colunas próprias', async ({ page }) => {
    await irParaParcelas(page);

    // Capturamos o payload que sai para o PostgREST: é a prova direta de que o
    // documento não está mais espremido em `numero` como texto.
    const payloads: Record<string, unknown>[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/rest/v1/titulos_pagar') && req.method() === 'POST') {
        try {
          const corpo = JSON.parse(req.postData() || '{}');
          payloads.push(...(Array.isArray(corpo) ? corpo : [corpo]));
        } catch {
          /* corpo não-JSON não interessa aqui */
        }
      }
    });

    const drawer = await preencherTitulo(page, {
      valor: '1500.00',
      docNumero: `${RUN}`,
      chaveFiscal: CHAVE_44,
    });
    await salvarEsperandoSucesso(page, drawer);

    expect(payloads.length).toBeGreaterThan(0);
    const titulo = payloads[0];

    // O ponto do relay: colunas próprias, não texto concatenado.
    expect(titulo.doc_tipo).toBe('NF');
    expect(titulo.doc_numero).toBe(RUN);
    expect(titulo.chave_fiscal_44).toBe(CHAVE_44);
  });

  test('2. relançar a MESMA nota mostra mensagem clara, não erro cru do Postgres', async ({
    page,
  }) => {
    await irParaParcelas(page);

    const drawer = await preencherTitulo(page, {
      valor: '1500.00',
      docNumero: `${RUN}`,
      chaveFiscal: CHAVE_44,
    });
    await drawer.getByRole('button', { name: /Salvar Rascunho/i }).click();

    // A mensagem tem que nomear o problema em português de operador.
    const aviso = page.getByText(/já foi lançad/i).first();
    await expect(aviso).toBeVisible({ timeout: 20_000 });

    const textoVisivel = (await page.locator('body').innerText()).toLowerCase();

    // E NÃO pode vazar a mensagem crua do Postgres.
    expect(textoVisivel).not.toContain('duplicate key');
    expect(textoVisivel).not.toContain('violates unique constraint');
    expect(textoVisivel).not.toContain('23505');
    expect(textoVisivel).not.toContain('idx_titulos_pagar');
  });

  test('3. mesmo fornecedor e número, valor com 1 centavo de diferença, é bloqueado', async ({
    page,
  }) => {
    await irParaParcelas(page);

    // O caso que motivou tirar o valor da chave: o operador redigita e erra um
    // centavo. Com valor na chave isso viraria bypass.
    const drawer = await preencherTitulo(page, {
      valor: '1500.01',
      docNumero: `${RUN}`,
    });
    await drawer.getByRole('button', { name: /Salvar Rascunho/i }).click();

    await expect(page.getByText(/já foi lançad/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('4. o botão "Forçar Mesmo Assim" não existe mais', async ({ page }) => {
    await irParaParcelas(page);

    const drawer = await preencherTitulo(page, {
      valor: '1500.00',
      docNumero: `${RUN}`,
    });
    await drawer.getByRole('button', { name: /Salvar Rascunho/i }).click();

    // Espera o bloqueio acontecer — é exatamente o momento em que o botão
    // apareceria, se ainda existisse.
    await expect(page.getByText(/já foi lançad/i).first()).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole('button', { name: /Forçar/i })).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(/Forçar Mesmo Assim/i);
  });

  test('5. despesa SEM documento passa normalmente', async ({ page }) => {
    await irParaParcelas(page);

    // Reembolso, ajuste interno: não tem nota. Tem que continuar lançável, e
    // duas delas não podem colidir entre si (o WHERE parcial cobre a string
    // vazia; o payload manda NULL).
    const primeiro = await preencherTitulo(page, { valor: '250.00', docNumero: '' });
    await salvarEsperandoSucesso(page, primeiro);

    const segundo = await preencherTitulo(page, { valor: '380.00', docNumero: '' });
    await salvarEsperandoSucesso(page, segundo);

    // Nenhum aviso de duplicidade em nenhum dos dois.
    await expect(page.getByText(/já foi lançad/i)).toHaveCount(0);
  });
});
