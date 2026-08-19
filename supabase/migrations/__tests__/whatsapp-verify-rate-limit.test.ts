/**
 * RELAY 55 — LOTE C, migration 2 + Edge Function whatsapp-verify.
 *
 * Três grupos:
 *  1. o texto da migration, onde vivem as decisões de segurança;
 *  2. generateCode(), que é lógica pura e dá para exercitar de verdade;
 *  3. o texto da Edge Function, para travar o fix do loja_id — a regressão
 *     mais fácil de reintroduzir sem perceber.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION = readFileSync(
  join(__dirname, '..', '20260819130000_whatsapp_verify_rate_limit.sql'),
  'utf8'
);
const EXEC = MIGRATION.replace(/--[^\n]*/g, '');

const EDGE_RAW = readFileSync(
  join(__dirname, '..', '..', 'functions', 'whatsapp-verify', 'index.ts'),
  'utf8'
);

/**
 * Código executável, sem comentários. Necessário porque os comentários citam
 * o código ANTIGO literalmente para explicar o que mudou — sem isto as
 * asserções de "não contém mais X" casariam com a própria explicação de X.
 */
const EDGE = EDGE_RAW
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('migration 2 — rate limit (#whatsapp-verify)', () => {
  it('cria a tabela de tentativas separada, não uma coluna em whatsapp_verifications', () => {
    expect(EXEC).toMatch(/CREATE TABLE IF NOT EXISTS public\.whatsapp_verification_attempts/);
    // contador por código seria contornado por reenvio — não pode existir
    expect(EXEC).not.toMatch(/ADD COLUMN IF NOT EXISTS attempts/);
  });

  it('não apaga nem invalida as verificações existentes', () => {
    expect(EXEC).not.toMatch(/DELETE FROM public\.whatsapp_verifications/);
    expect(EXEC).not.toMatch(/TRUNCATE/);
    expect(EXEC).not.toMatch(/DROP TABLE/);
    // a coluna nova entra nullable: as 7 linhas existentes ficam com NULL
    expect(EXEC).toMatch(/ADD COLUMN IF NOT EXISTS consumed_at timestamptz;/);
    expect(EXEC).not.toMatch(/ADD COLUMN IF NOT EXISTS consumed_at[^;]*NOT NULL/);
  });

  it('não reusa `verified` como flag de bloqueio (a coluna já tem 2 sentidos)', () => {
    expect(EXEC).toMatch(/consumed_at/);
  });

  it('checa a janela ANTES de consultar o código — senão o 429 vira oráculo', () => {
    const posJanela = EXEC.indexOf("'rate_limited'");
    const posCodigo = EXEC.indexOf('UPDATE public.whatsapp_verifications');
    expect(posJanela).toBeGreaterThan(-1);
    expect(posCodigo).toBeGreaterThan(-1);
    expect(posJanela).toBeLessThan(posCodigo);
  });

  it('registra a tentativa antes de qualquer decisão', () => {
    const posInsert = EXEC.indexOf('INSERT INTO public.whatsapp_verification_attempts');
    expect(posInsert).toBeGreaterThan(-1);
    expect(posInsert).toBeLessThan(EXEC.indexOf("'rate_limited'"));
  });

  it('consome o código atomicamente (UPDATE ... RETURNING), sem SELECT-depois-UPDATE', () => {
    expect(EXEC).toMatch(/UPDATE public\.whatsapp_verifications[\s\S]*RETURNING v\.id INTO v_id/);
    // as condições de validade são revalidadas no WHERE do próprio UPDATE,
    // sob o lock de linha — não só dentro da subconsulta
    expect(EXEC).toMatch(/AND v\.verified = false\s*\n\s*AND v\.expires_at >= now\(\)/);
  });

  it('limita a 5 tentativas em 15 minutos', () => {
    expect(EXEC).toMatch(/p_max_attempts int DEFAULT 5/);
    expect(EXEC).toMatch(/p_window\s+interval DEFAULT interval '15 minutes'/);
  });

  it('fecha a RPC para authenticated/anon MAS devolve o grant ao service_role', () => {
    expect(EXEC).toMatch(/SECURITY DEFINER/);
    expect(EXEC).toMatch(/SET search_path = public, pg_temp/);
    expect(EXEC).toMatch(
      /REVOKE ALL ON FUNCTION public\.whatsapp_verify_consume[\s\S]*FROM PUBLIC, anon, authenticated;/
    );
    // REVOKE ... FROM PUBLIC tira também o acesso implícito do service_role.
    // Sem este GRANT a Edge Function — única chamadora — quebra 100% com
    // "permission denied for function". Armadilha já documentada no repo em
    // 20260815200000_fin_transferencia_escopo_loja.
    expect(EXEC).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.whatsapp_verify_consume[\s\S]*TO service_role;/
    );
    // mas nunca para os papéis do browser
    expect(EXEC).not.toMatch(/GRANT EXECUTE[^;]*whatsapp_verify_consume[^;]*TO (authenticated|anon)/);
  });

  it('conta apenas tentativas malsucedidas — sucesso não pune o usuário legítimo', () => {
    expect(EXEC).toMatch(/AND succeeded = false\s*\n\s*AND attempted_at > now\(\) - p_window/);
  });

  it('marca a própria tentativa pela PK, não por max(attempted_at)', () => {
    expect(EXEC).toMatch(/RETURNING id INTO v_attempt_id/);
    expect(EXEC).toMatch(/SET succeeded = true\s*\n\s*WHERE id = v_attempt_id/);
    expect(EXEC).not.toMatch(/max\(attempted_at\)/);
  });

  it('não usa SKIP LOCKED (faria retry concorrente parecer código errado)', () => {
    expect(EXEC).not.toMatch(/SKIP LOCKED/);
  });

  it('o agendamento do cron é idempotente', () => {
    expect(EXEC).toMatch(/cron\.unschedule\('whatsapp-verification-attempts-cleanup'\)/);
  });

  it('revoga a tabela nova de authenticated/anon, como whatsapp_verifications', () => {
    expect(EXEC).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(EXEC).toMatch(/REVOKE ALL ON public\.whatsapp_verification_attempts FROM authenticated, anon;/);
  });

  it('tem limpeza periódica — senão a tabela cresce sem teto', () => {
    expect(EXEC).toMatch(/whatsapp_verification_attempts_cleanup/);
    expect(EXEC).toMatch(/DELETE FROM public\.whatsapp_verification_attempts/);
  });
});

describe('whatsapp-verify — fix de autorização do loja_id', () => {
  it('não trata mais a ausência de loja_id como permissão', () => {
    // a forma antiga: `if (!callerIsMasterAdmin && loja_id)`
    expect(EDGE).not.toMatch(/if \(!callerIsMasterAdmin && loja_id\)/);
    expect(EDGE).toMatch(/if \(!callerIsMasterAdmin\) \{/);
  });

  it('exige loja_id antes de ramificar em send/verify', () => {
    const posGuard = EDGE.indexOf("error: 'loja_id obrigatório'");
    const posAction = EDGE.indexOf("if (action === 'send')");
    expect(posGuard).toBeGreaterThan(-1);
    expect(posGuard).toBeLessThan(posAction);
  });

  it('o verify usa a RPC atômica, não SELECT seguido de UPDATE', () => {
    expect(EDGE).toMatch(/supabase\.rpc\(\s*'whatsapp_verify_consume'/);
    // Escopado ao ramo verify: o send segue usando `verified` para invalidar o
    // código anterior na rotação, e isso é legítimo.
    const verifyBranch = EDGE.slice(EDGE.indexOf("action === 'verify'"));
    expect(verifyBranch).not.toMatch(/from\('whatsapp_verifications'\)/);
    expect(verifyBranch).not.toMatch(/\.eq\('verified', false\)/);
  });

  it('devolve 429 distinto no rate limit e mantém o 400 indistinguível', () => {
    expect(EDGE).toMatch(/status: 429/);
    expect(EDGE).toMatch(/'Retry-After'/);
    // uma única mensagem para todos os casos de falha de código
    expect(EDGE.match(/Código inválido ou expirado/g)).toHaveLength(1);
  });

  it('gera o código com CSPRNG, não Math.random', () => {
    expect(EDGE).not.toMatch(/Math\.random\(\)/);
    expect(EDGE).toMatch(/crypto\.getRandomValues/);
  });
});

describe('generateCode()', () => {
  /**
   * A função REAL da Edge Function, extraída do próprio arquivo em vez de
   * reimplementada aqui. Importar direto não dá — o módulo é Deno (`jsr:` e
   * `Deno.serve` no topo) e não resolve sob vitest. Extrair o texto garante
   * que o teste acompanha a implementação: se ela mudar, isto muda junto.
   */
  const fonte = EDGE_RAW.match(
    /export function generateCode\(\): string \{[\s\S]*?\n\}/
  )?.[0];

  it('a função foi encontrada no arquivo (o teste testa o código real)', () => {
    expect(fonte).toBeDefined();
  });

  // new Function() é JS puro: as anotações de tipo precisam sair.
  const js = fonte!
    .replace('export function generateCode(): string', 'function generateCode()')
    .replace(/let n: number;/, 'let n;');
  const generateCode = new Function(`${js}; return generateCode;`)() as () => string;

  it('sempre devolve 6 dígitos', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('usa o espaço inteiro, inclusive zeros à esquerda', () => {
    // a fórmula antiga (100000 + random*900000) nunca produzia isto.
    // Em 20k amostras, P(nenhum começar com 0) ≈ 0.9^20000, indistinguível de 0.
    const amostras = Array.from({ length: 20000 }, generateCode);
    expect(amostras.some((c) => c.startsWith('0'))).toBe(true);
  });

  it('cobre a faixa toda, não só 100000-999999', () => {
    const amostras = Array.from({ length: 20000 }, (_, i) => Number(generateCode()));
    expect(Math.min(...amostras)).toBeLessThan(100000);
    expect(Math.max(...amostras)).toBeGreaterThan(100000);
  });
});
