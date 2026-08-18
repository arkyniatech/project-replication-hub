import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { BackendInterAdapter } from '@/services/bolepix/BackendInterAdapter';

// RELAY 44 / tarefa 1.3. supabase.functions.invoke DESCARTA o corpo da resposta
// quando o status não é 2xx: devolve só "Edge Function returned a non-2xx status
// code". Com isso, a mensagem que o inter-proxy escreve — "Credenciais Inter não
// configuradas para esta loja" — nunca chegava ao operador, que via um genérico
// inútil. Foi exatamente o que aconteceu no reteste do 7.4(d).
// O corpo real vive em error.context, que é a Response do fetch.

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

/** Reproduz o que o supabase-js entrega num não-2xx: erro genérico + Response. */
function erroHttp(status: number, body: unknown) {
  const resposta = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return new FunctionsHttpError(resposta);
}

const payload = {
  valor: 150,
  vencimento: '2026-09-01',
  sacado: { nome: 'QA Fix Uuid', cpfCnpj: '11144477735', email: 'qa@teste.com' },
  idempotencyKey: 'idem-teste',
  seuNumero: 'TIT-001-000014',
};

describe('BackendInterAdapter — mensagem de erro do inter-proxy', () => {
  // mockReset, não clearAllMocks: clear zera as chamadas mas NÃO descarta os
  // mockResolvedValueOnce que sobraram na fila, e uma sobra vaza para o teste
  // seguinte fazendo-o falhar por motivo errado.
  beforeEach(() => invoke.mockReset());

  it('propaga a mensagem de credencial ausente (404) em vez do genérico', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp(404, { error: 'Credenciais Inter não configuradas para esta loja' }),
    });

    const adapter = new BackendInterAdapter('loja-001');
    await expect(adapter.emitCharge(payload as never)).rejects.toThrow(
      'Credenciais Inter não configuradas para esta loja'
    );
  });

  it('não vaza o "non-2xx status code" quando há corpo legível', async () => {
    // Cada invoke consome um mock; as duas asserções abaixo fazem uma chamada
    // cada, então o mesmo erro precisa ser enfileirado duas vezes.
    invoke
      .mockResolvedValueOnce({ data: null, error: erroHttp(403, { error: 'Sem acesso a esta loja' }) })
      .mockResolvedValueOnce({ data: null, error: erroHttp(403, { error: 'Sem acesso a esta loja' }) });

    const adapter = new BackendInterAdapter('loja-999');
    await expect(adapter.emitCharge(payload as never)).rejects.toThrow(/Sem acesso a esta loja/);
    // O genérico não pode sobrar grudado na mensagem específica.
    await expect(adapter.emitCharge(payload as never)).rejects.not.toThrow(/non-2xx/);
  });

  it('propaga a mensagem do gate de master/admin (403) ao salvar credencial', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp(403, { error: 'Apenas master/admin pode alterar credenciais bancárias' }),
    });

    const adapter = new BackendInterAdapter('loja-001');
    await expect(adapter.getCharge('cod-1')).rejects.toThrow(
      'Apenas master/admin pode alterar credenciais bancárias'
    );
  });

  it('cai no genérico quando o corpo não é JSON legível', async () => {
    const resposta = new Response('<html>502 Bad Gateway</html>', { status: 502 });
    invoke.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(resposta) });

    const adapter = new BackendInterAdapter('loja-001');
    // Sem corpo utilizável não há o que propagar: o genérico é o comportamento
    // correto aqui, e o teste existe para garantir que a leitura do body não
    // engole o erro nem estoura com "not valid JSON".
    await expect(adapter.getCharge('cod-1')).rejects.toThrow(/Erro na Edge Function/);
  });

  it('mantém a propagação do erro em corpo 2xx com campo error', async () => {
    invoke.mockResolvedValueOnce({ data: { error: 'Ação desconhecida: foo' }, error: null });

    const adapter = new BackendInterAdapter('loja-001');
    await expect(adapter.getCharge('cod-1')).rejects.toThrow('Ação desconhecida: foo');
  });
});
