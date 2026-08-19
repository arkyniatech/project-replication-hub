/**
 * RELAY 49 — seção 11. Veiculos.tsx:63 e VeiculoForm.tsx:128,172 usavam '1'
 * como único valor conhecido de loja ("Mock da loja ativa"). Medido no banco:
 * frota_veiculos.loja_id é uuid, NULLABLE. '1' não é uuid — toda gravação
 * batia 22P02 e nunca chegava ao servidor. É a mesma família do `|| '1'` já
 * corrigida duas vezes antes (nunca inventar id).
 *
 * addVeiculo também fazia set() local síncrono (sempre "sucesso" pro estado
 * otimista) e chamava frotaUpsert sem await — o componente mostrava toast de
 * sucesso sem saber se o servidor aceitou. Este teste trava que addVeiculo
 * agora devolve uma Promise que reflete o resultado real do Supabase, para
 * o componente decidir o toast.
 *
 * Vermelho antes (loja_id sempre '1', addVeiculo não devolvia nada
 * aguardável), verde depois.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsertMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useVeiculosStore } from '../veiculosStore';

function seedVazio() {
  useVeiculosStore.setState({
    veiculos: [],
    postos: [],
    oleos: [],
    oficinas: [],
    servicos: [],
    veiculo_configs: [],
    manutencoes: [],
    abastecimentos: [],
    trocas_oleo: [],
  } as any);
}

beforeEach(() => {
  fromMock.mockReset();
  upsertMock.mockReset();
  seedVazio();
});

const NOVO_VEICULO = {
  placa: 'QAT-1048',
  codigo_interno: 'VEHQA48',
  fabricante: 'Fiat',
  modelo: 'Strada QA',
  tipo: 'carro' as const,
  ano_fab: 2026,
  ano_mod: 2026,
  combustivel: 'Flex' as const,
  cap_tanque_l: 50,
  odometro_atual: 0,
  status: 'OPERANDO' as const,
  observacao: '',
};

describe('addVeiculo — loja_id real, nunca literal', () => {
  it('grava o uuid real da loja ativa quando fornecido', async () => {
    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    await useVeiculosStore.getState().addVeiculo({ ...NOVO_VEICULO, loja_id: 'loja-uuid-real' });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload.loja_id).toBe('loja-uuid-real');
  });

  it('grava NULL quando não há loja ativa — nunca inventa um id como "1"', async () => {
    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    await useVeiculosStore.getState().addVeiculo({ ...NOVO_VEICULO, loja_id: null });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload.loja_id).toBeNull();
    expect(payload.loja_id).not.toBe('1');
  });

  it('devolve uma Promise que rejeita/reporta erro quando o servidor recusa a escrita', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'invalid input syntax for type uuid: "1"' } });
    fromMock.mockReturnValue({ upsert: upsertMock });

    const resultado = await useVeiculosStore.getState().addVeiculo({ ...NOVO_VEICULO, loja_id: null });

    expect(resultado.ok).toBe(false);
  });

  it('devolve ok quando o servidor aceita a escrita', async () => {
    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    const resultado = await useVeiculosStore.getState().addVeiculo({ ...NOVO_VEICULO, loja_id: 'loja-uuid-real' });

    expect(resultado.ok).toBe(true);
  });

  it('aplica o estado otimista local independente do resultado do servidor', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'falhou' } });
    fromMock.mockReturnValue({ upsert: upsertMock });

    await useVeiculosStore.getState().addVeiculo({ ...NOVO_VEICULO, loja_id: null });

    expect(useVeiculosStore.getState().veiculos).toHaveLength(1);
    expect(useVeiculosStore.getState().veiculos[0].placa).toBe('QAT-1048');
  });
});
