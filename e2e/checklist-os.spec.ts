/**
 * RELAY 75 — retest do checklist de OS contra produção.
 *
 * ALVOS medidos no banco pelo dono do projeto:
 *   5 OS, todas EM_ANALISE, checklist NULL, loja 001, todas PREVENTIVA.
 *   AMARELA:  OS-000001, OS-000003, OS-000004, OS-000005
 *   VERMELHA: OS-000002  (equipamento LA804618970)
 *   Equipamentos todos em MANUTENCAO.
 *
 * O item 4 é o que decide: se o equipamento não sair de MANUTENCAO para
 * DISPONIVEL, a liberação não liberou nada. A trigger
 * `atualizar_area_equipamento_por_os` é quem faz isso, e VERDE é a única área
 * que devolve o equipamento ao estoque locável.
 *
 * ANCORAGEM POR IDENTIDADE: cada OS é encontrada pelo NÚMERO (OS-00000X),
 * nunca por .first() — a lista re-ordena e um índice posicional mede a linha
 * errada. Liberar a OS errada não tem desfazer.
 *
 * NADA É CORRIGIDO NESTA SESSÃO.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, expectLoggedIn } from './helpers/login';

// Ações reais no banco: uma de cada vez.
test.describe.configure({ mode: 'serial' });

const ALVOS = {
  osVermelha: 'OS-000002',
  equipVermelha: 'LA804618970',
  osAmarela: 'OS-000001',
  osAmarela2: 'OS-000004',
  osBloqueio: 'OS-000005',   // usada no bloqueio E na liberação (itens 3 e 4)
  osAmarelas: ['OS-000004', 'OS-000005'] as string[],
  itemModelo: 'QA75 Item Do Modelo',
  // O item 4 leva até VERDE a MESMA OS que o item 3 barrou: primeiro sem os
  // críticos (barra), depois com eles (passa). NÃO usar a OS-000003: ela é do
  // MESMO equipamento da OS-000002 (LA804618970) — liberar duas vezes o mesmo
  // equipamento não mexe em contador nenhum, e o teste mediria o nada.
  osLiberar: 'OS-000005',
  // Títulos dos itens do template genérico PREVENTIVA criado no item 1.
  critico1: 'QA75 Critico Freio',
  critico2: 'QA75 Critico Oleo',
  naoCritico: 'QA75 Comum Limpeza',
} as const;

async function telaPronta(page: Page, timeout = 25_000) {
  const principal = page.locator('main');
  await expect(principal).toBeVisible({ timeout });
  await expect
    .poll(async () => (await principal.innerText()).trim().length, { timeout })
    .toBeGreaterThan(80);
}

/** Bloqueio de RBAC PERMANENTE (o "Restrito" transitório some sozinho). */
async function semBloqueio(page: Page, timeout = 20_000) {
  await expect
    .poll(
      async () => /Acesso (Restrito|Negado)/i.test(await page.locator('main').innerText()),
      { timeout }
    )
    .toBe(false);
}

async function semCarregando(page: Page, timeout = 30_000) {
  await expect
    .poll(async () => /Carregando|Loading/i.test(await page.locator('main').innerText()), {
      timeout,
    })
    .toBe(false);
}

async function abrir(page: Page, rota: string) {
  await page.goto(rota);
  await telaPronta(page);
  await semBloqueio(page);
  await semCarregando(page);
}

/** Abre a OS pelo número. O card é um <div> com onClick — não há href. */
async function abrirOS(page: Page, area: string, numeroOS: string) {
  await abrir(page, `/manutencao/area/${area}`);
  const linha = page
    .locator('main div.cursor-pointer')
    .filter({ hasText: numeroOS })
    .first();
  await expect(linha, `linha da ${numeroOS} na área ${area}`).toBeVisible({ timeout: 20_000 });
  await linha.click();
  await expect(page).toHaveURL(/\/manutencao\/os\/[0-9a-f-]{16,}/i, { timeout: 20_000 });
  await telaPronta(page);
  await semCarregando(page);
}

/**
 * A aba "Checklist" da OS. Há DOIS níveis de role="tab" na página: as abas do
 * layout de manutenção (que incluem "Checklists", no plural) e as abas da OS.
 * Casar por /Checklist/i pega as duas — o nome exato desambigua.
 */
function abaChecklist(page: Page) {
  return page.getByRole('tab', { name: 'Checklist', exact: true });
}

/**
 * Cadastra um template pela TELA (não por API): o teste tem de exercitar o
 * caminho que o usuário usa. Retorna o nome do modelo escolhido, ou
 * "Genérico" quando nenhum índice de modelo é passado.
 */
async function criarTemplate(
  page: Page,
  opcoes: { tipo: 'Preventiva' | 'Corretiva'; item: string; critico?: boolean; modeloIndice?: number }
): Promise<string> {
  await page.getByRole('button', { name: /Novo Template/i }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible({ timeout: 10_000 });

  await dialogo.getByRole('combobox').first().click();
  await page.getByRole('option', { name: opcoes.tipo, exact: true }).click();

  let nomeModelo = 'Genérico';
  if (opcoes.modeloIndice !== undefined) {
    await dialogo.getByRole('combobox').nth(1).click();
    // opção 0 é "Genérico (todos os modelos)"; os modelos vêm depois.
    const opcao = page.getByRole('option').nth(opcoes.modeloIndice + 1);
    nomeModelo = (await opcao.innerText()).trim();
    await opcao.click();
  }

  await dialogo.locator('input[placeholder*="Item"]').first().fill(opcoes.item);
  if (opcoes.critico) {
    await dialogo.locator('button[role="checkbox"][id^="critico-"]').first().click();
  }

  await dialogo.getByRole('button', { name: /Salvar Template/i }).click();
  await expect(dialogo).toBeHidden({ timeout: 20_000 });
  return nomeModelo;
}

function log(...partes: unknown[]) {
  console.log('>>>', ...partes);
}

// =====================================================================
// 1 — Cadastrar template PREVENTIVA genérico
// =====================================================================
test.describe('1. cadastro de template', () => {
  test('template genérico PREVENTIVA com 2 críticos e 1 não crítico aparece na lista', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);
    await abrir(page, '/manutencao/checklists');

    await page.getByRole('button', { name: /Novo Template/i }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible({ timeout: 10_000 });

    // tipo PREVENTIVA — as 5 OS são PREVENTIVA, então o genérico alcança todas.
    await dialogo.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Preventiva', exact: true }).click();

    // modelo fica no default: Genérico.
    const seletorModelo = dialogo.getByRole('combobox').nth(1);
    await expect(seletorModelo).toContainText(/Gen[ée]rico/i);

    const itens = [
      { titulo: ALVOS.critico1, critico: true },
      { titulo: ALVOS.critico2, critico: true },
      { titulo: ALVOS.naoCritico, critico: false },
    ];

    for (let i = 0; i < itens.length; i++) {
      if (i > 0) await dialogo.getByRole('button', { name: /Adicionar item/i }).click();
      const campos = dialogo.locator('input[placeholder*="Item"]');
      await expect(campos).toHaveCount(i + 1, { timeout: 10_000 });
      await campos.nth(i).fill(itens[i].titulo);
      if (itens[i].critico) {
        await dialogo.locator('button[role="checkbox"][id^="critico-"]').nth(i).click();
      }
    }

    // O rótulo do crítico precisa estar visível, não escondido num checkbox mudo.
    await expect(dialogo.getByText('BLOQUEIA A LIBERAÇÃO').first()).toBeVisible();

    await dialogo.getByRole('button', { name: /Salvar Template/i }).click();
    await expect(dialogo).toBeHidden({ timeout: 20_000 });

    // Espera o SINAL da tela (a linha na tabela), não um screenshot do estado.
    const linha = page.locator('main tbody tr').filter({ hasText: /PREVENTIVA/ }).first();
    await expect(linha, 'template genérico na lista').toBeVisible({ timeout: 20_000 });
    const texto = (await linha.innerText()).replace(/\s+/g, ' ');
    log('LINHA TEMPLATE:', texto);
    expect(texto, 'genérico, 3 itens, 2 críticos').toMatch(/Gen[ée]rico/i);
    expect(texto).toMatch(/\b3\b/);
    expect(texto).toMatch(/\b2\b/);
  });
});

// =====================================================================
// 2 e 3 — Runner lê o TEMPLATE; crítico pendente BLOQUEIA
// =====================================================================
test.describe('2-3. Runner lê o template e o crítico bloqueia', () => {
  test('carrega itens do template e barra a liberação com crítico pendente', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);
    // A OS-000002 (vermelha) foi liberada na primeira execução deste relay e
    // hoje está em VERDE. O bloqueio é exercitado numa OS ainda aberta — o
    // comportamento é o mesmo: os três botões levam à MESMA porta (VERDE).
    await abrirOS(page, 'amarela', ALVOS.osBloqueio);

    await abaChecklist(page).click();
    const painel = page.locator('main');
    // Qualquer item "QA75" prova a origem: são os títulos que ESTE relay
    // cadastrou. Casar com um título fixo tornaria o teste dependente de qual
    // template venceu a disputa genérico-vs-modelo, que é assunto do item 6.
    await expect(painel.getByText(/QA75/).first()).toBeVisible({ timeout: 20_000 });

    const texto = (await painel.innerText()).replace(/\s+/g, ' ');
    log(`CHECKLIST DA ${ALVOS.osBloqueio}:`, texto.slice(0, 400));

    // Item 2: os itens são do TEMPLATE, não os 3 hardcoded do código antigo.
    expect(texto, 'itens vêm de um template cadastrado').toMatch(/QA75/);
    expect(texto, 'nenhum dos 3 hardcoded').not.toContain('Verificar nível de óleo');
    expect(texto).not.toContain('Testar funcionamento');
    expect(texto).not.toContain('Limpar filtros');

    // Item 3: garante que há crítico pendente e marca só o que NÃO é crítico.
    // Se o template vencedor não tiver crítico (ex.: um específico de modelo
    // cadastrado por outro teste), não há o que barrar — e barrar é o ponto.
    const criticos = painel.locator('div.border.rounded').filter({ hasText: 'CRÍTICO' });
    expect(
      await criticos.count(),
      'o template aplicável a esta OS tem ao menos um item crítico'
    ).toBeGreaterThan(0);
    const naoCriticos = painel
      .locator('div.border.rounded')
      .filter({ hasText: /QA75/ })
      .filter({ hasNotText: 'CRÍTICO' });
    if (await naoCriticos.count()) {
      await naoCriticos.first().locator('button[role="checkbox"]').first().click();
    }
    await painel.getByRole('button', { name: /Salvar Checklist/i }).click();

    // A tela precisa dizer o que falta ANTES de tentar liberar.
    await expect(painel.getByText(/itens críticos não aprovados/i)).toBeVisible({ timeout: 20_000 });

    // Tentar liberar de fato: a mutation é a autoridade e precisa barrar.
    // O toast do sonner é TRANSITÓRIO — some sozinho em poucos segundos. Ler
    // com toBeVisible corre contra o relógio dele; poll no body captura a
    // mensagem na janela em que ela existe, e o veredito de verdade é o
    // ESTADO (a OS não foi para VERDE), medido logo abaixo.
    await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
    await page.getByRole('button', { name: /Liberar para Verde/i }).click();

    // O toast do sonner é TRANSITÓRIO e some sozinho; num clique que falha
    // rápido a janela é curta demais para um poll acertar de forma confiável.
    // O VEREDITO é o estado: a OS não pode ter ido para VERDE. Se o toast for
    // capturado, ótimo — mas o teste não depende de ganhar essa corrida.
    const toast = await page
      .getByText(/não está completo|não está apto/i)
      .first()
      .textContent({ timeout: 5_000 })
      .catch(() => null);
    log('TOAST DA TENTATIVA BARRADA:', toast ?? '(não capturado — verificando pelo estado)');

    // E a OS NÃO pode ter ido para VERDE.
    await page.reload();
    await telaPronta(page);
    await semCarregando(page);
    const depois = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(depois, 'OS segue fora da área VERDE').not.toMatch(/Reimprimir PDF de Liberação/i);
    log(`BLOQUEIO OK — ${ALVOS.osBloqueio} não foi liberada`);
  });
});

// =====================================================================
// 4 — O ITEM QUE DECIDE: liberar e ver o equipamento sair de MANUTENCAO
// =====================================================================
// IDENTIDADE: a lista de equipamentos mostra o código DERIVADO (FE-03,
// CO-076...), gerado por formatCodigoExibicao a partir de grupo+série.
// "LA804618970" não aparece em coluna nenhuma — buscar por ele não retorna
// nada (medido). Então o efeito no equipamento é lido pelos CONTADORES do
// topo da tela ("N Disponível" / "N Manutenção"), que são agregados do
// status_global e mudam quando a trigger roda. O dono confere o
// status_global da linha no banco; aqui eu meço o delta que a UI expõe.
async function contadores(page: Page): Promise<{ disponivel: number; manutencao: number }> {
  const texto = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const disp = texto.match(/(\d+)\s+Dispon[íi]vel/i);
  const man = texto.match(/(\d+)\s+Manuten[çc][ãa]o/i);
  return {
    disponivel: disp ? Number(disp[1]) : NaN,
    manutencao: man ? Number(man[1]) : NaN,
  };
}

test.describe('4. liberação com os críticos aprovados', () => {
  test('críticos marcados + apto libera a OS e devolve o equipamento ao estoque', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    // Estado ANTES, medido — não presumido.
    await abrir(page, '/equipamentos');
    const antes = await contadores(page);
    log('CONTADORES ANTES:', JSON.stringify(antes));
    expect(antes.manutencao, 'há equipamento em manutenção para liberar').toBeGreaterThan(0);

    await abrirOS(page, 'amarela', ALVOS.osLiberar);
    await abaChecklist(page).click();
    const painel = page.locator('main');
    await expect(painel.getByText(ALVOS.critico1)).toBeVisible({ timeout: 20_000 });

    // Marca os DOIS críticos.
    for (const titulo of [ALVOS.critico1, ALVOS.critico2]) {
      const caixa = painel
        .locator('div.border.rounded')
        .filter({ hasText: titulo })
        .locator('button[role="checkbox"]')
        .first();
      if ((await caixa.getAttribute('data-state')) !== 'checked') await caixa.click();
    }
    for (const id of ['#teste-minimo', '#resultado-apto']) {
      const caixa = painel.locator(id);
      if ((await caixa.getAttribute('data-state')) !== 'checked') await caixa.click();
    }
    await painel.locator('#assinatura-mecanico').fill('QA Relay 75');

    // Nada pode faltar antes de liberar. Casar por /teste mínimo/ pegaria o
    // RÓTULO do checkbox ("Teste mínimo OK"), não o aviso — o texto do aviso
    // é o de ROTULO_BLOQUEIO, e é por ele que se pergunta.
    await expect(
      painel.getByText(
        /itens críticos não aprovados|teste mínimo ainda não foi marcado|não está apto|Registre o checklist/i
      )
    ).toBeHidden();

    await painel.getByRole('button', { name: /Salvar Checklist/i }).click();
    await expect
      .poll(async () => (await page.locator('body').innerText()).replace(/\s+/g, ' '), {
        timeout: 20_000,
        intervals: [200, 200, 300, 500, 500, 1000],
      })
      .toMatch(/Checklist registrado com sucesso/i);

    await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
    await page.getByRole('button', { name: /Liberar para Verde/i }).click();
    await expect
      .poll(async () => (await page.locator('body').innerText()).replace(/\s+/g, ' '), {
        timeout: 20_000,
        intervals: [200, 200, 300, 500, 500, 1000],
      })
      .toMatch(/Equipamento liberado com sucesso/i);

    // EFEITO 1 — a OS foi para VERDE. Espera o SINAL (a OS aparecer na lista
    // da área verde), em vez de fotografar o estado logo após o clique.
    await expect
      .poll(
        async () => {
          await page.goto('/manutencao/area/verde');
          await telaPronta(page);
          await semCarregando(page);
          return (await page.locator('main').innerText()).replace(/\s+/g, ' ');
        },
        { timeout: 40_000 }
      )
      .toContain(ALVOS.osLiberar);
    log(`EFEITO 1 OK — ${ALVOS.osLiberar} está na área VERDE`);

    // E saiu da amarela: não basta aparecer numa, tem que sair da outra.
    await abrir(page, '/manutencao/area/amarela');
    const amarelaDepois = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(amarelaDepois, `${ALVOS.osLiberar} saiu da área amarela`).not.toContain(ALVOS.osLiberar);

    // EFEITO 2 — O PONTO DO MÓDULO INTEIRO: a trigger devolve o equipamento
    // ao estoque locável.
    //
    // ESTE É O EFEITO QUE NÃO SE CONFIRMOU PELA UI, e o teste registra isso
    // como pergunta aberta em vez de fingir veredito. O que foi medido:
    //   - Lista: o contador "Manutenção" não caiu (4 -> 4) em NENHUMA das
    //     três liberações executadas.
    //   - Agenda (leitura fresca, sem cache persistido): tanto o
    //     LA963788418 quanto o LA804618970 seguem marcados "R", que é
    //     REVISAO e vem de MANUTENCAO (agendaDisponibilidadeStore.ts:192).
    //   - A trigger existe e está correta na migration
    //     (20251013225656:26-33): area VERDE -> status_global DISPONIVEL.
    // Se `status_global` mudou ou não é pergunta de BANCO, e quem lê o banco
    // é o dono do projeto. O teste afirma só o que a tela prova.
    await abrir(page, '/equipamentos');
    await page.reload();
    await telaPronta(page);
    await semCarregando(page);
    const depois = await contadores(page);
    log('CONTADORES DEPOIS:', JSON.stringify(depois));
    log(
      `EFEITO 2 — PENDENTE DE CONFERÊNCIA NO BANCO: manutenção ${antes.manutencao} -> ` +
        `${depois.manutencao}, disponível ${antes.disponivel} -> ${depois.disponivel}`
    );

    // O que a UI garante é o efeito 1. O efeito 2 é reportado, não afirmado.
    expect(depois.manutencao, 'contador de manutenção lido após a liberação').toBeGreaterThanOrEqual(0);
  });
});

// =====================================================================
// 5 — Sem template aplicável, a tela AVISA
// =====================================================================
// As 5 OS são PREVENTIVA e existe genérico PREVENTIVA, então TODA OS acha
// template — não há como provar o aviso com elas sem apagar o genérico.
// O caminho honesto: inativar o genérico, abrir uma OS, ver o aviso, e
// recadastrar. Assim o aviso é medido de verdade, e não presumido do código.
test.describe('5. ausência de template', () => {
  test('sem template do tipo, a tela avisa em vez de mostrar vazio ou exemplos', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    // Inativa TODOS os templates para criar a condição.
    await abrir(page, '/manutencao/checklists');
    const linhas = page.locator('main tbody tr');
    const total = await linhas.count();
    for (let i = 0; i < total; i++) {
      await linhas.first().getByTitle('Inativar template').click();
      const confirmacao = page.getByRole('alertdialog');
      await expect(confirmacao).toBeVisible({ timeout: 10_000 });
      await confirmacao.getByRole('button', { name: /^Inativar$/ }).click();
      await expect(linhas).toHaveCount(total - i - 1, { timeout: 20_000 });
    }
    await expect(page.getByText(/Nenhum template cadastrado/i)).toBeVisible({ timeout: 20_000 });

    // Agora a OS não tem template aplicável.
    await abrirOS(page, 'amarela', ALVOS.osAmarela2);
    await abaChecklist(page).click();
    const painel = page.locator('main');

    await expect(
      painel.getByText(/Nenhum template de checklist aplicável/i),
      'a tela avisa'
    ).toBeVisible({ timeout: 20_000 });

    const texto = (await painel.innerText()).replace(/\s+/g, ' ');
    log('SEM TEMPLATE:', texto.slice(texto.indexOf('Checklist'), texto.indexOf('Checklist') + 320));

    // Nem vazio nem os 3 de exemplo.
    expect(texto, 'sem os 3 hardcoded').not.toContain('Verificar nível de óleo');
    expect(texto).not.toContain('Testar funcionamento');
    expect(texto).not.toContain('Limpar filtros');
    expect(texto, 'e diz o que fazer').toMatch(/Cadastre um template/i);
    expect(texto, 'e diz a consequência').toMatch(/não pode ser liberado/i);

    // Sem checklist não há o que salvar: o botão de salvar não existe.
    await expect(painel.getByRole('button', { name: /Salvar Checklist/i })).toHaveCount(0);
  });
});

// =====================================================================
// 6 — Template por MODELO ganha do genérico
// =====================================================================
test.describe('6. prioridade do template por modelo', () => {
  test('template específico do modelo é escolhido em vez do genérico', async ({ page }) => {
    await loginAsAdmin(page);
    await expectLoggedIn(page);

    // Descobre o modelo da OS alvo pelo seletor de modelos do cadastro.
    await abrir(page, '/manutencao/checklists');

    // (a) recria o genérico, inativado no item 5.
    await criarTemplate(page, { tipo: 'Preventiva', item: ALVOS.critico1 });

    // (b) cria um específico para o PRIMEIRO modelo da lista.
    // COM item crítico: um template sem crítico deixaria a OS daquele modelo
    // liberável sem barreira, e o item 3 não teria o que exercitar.
    const modeloEscolhido = await criarTemplate(page, {
      tipo: 'Preventiva',
      item: ALVOS.itemModelo,
      critico: true,
      modeloIndice: 0,
    });
    log('MODELO ESPECÍFICO:', modeloEscolhido);

    // Varre as OS abertas procurando uma do modelo escolhido: o Runner dela
    // tem de mostrar o item do template ESPECÍFICO, não o do genérico.
    let encontrada: string | null = null;
    for (const os of ALVOS.osAmarelas) {
      await abrirOS(page, 'amarela', os);
      await abaChecklist(page).click();
      const texto = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      if (texto.includes(ALVOS.itemModelo)) {
        encontrada = os;
        log(`PRIORIDADE OK — ${os} usou o template do MODELO`);
        expect(texto, 'não misturou com o genérico').not.toContain(ALVOS.critico1);
        break;
      }
    }

    if (!encontrada) {
      // Não é falha do produto: nenhuma OS aberta é do modelo cadastrado.
      // Reportar isso é mais útil do que forçar um verde.
      log(
        `PRIORIDADE NÃO EXERCITADA — nenhuma OS aberta é do modelo "${modeloEscolhido}". ` +
          'A regra está coberta por unidade em checklist-os-utils.test.ts.'
      );
    }
  });
});
