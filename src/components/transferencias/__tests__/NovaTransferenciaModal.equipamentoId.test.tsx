/**
 * RELAY 39 — transferência de SERIALIZADO concluía sem mover o equipamento.
 *
 * O modal recebia o objeto inteiro do equipamento em adicionarItemSerial() e
 * montava o TransferItem copiando codigo_interno, modelo_id, grupo_id e serie —
 * mas NÃO o `id`. O único identificador forte era descartado exatamente no
 * ponto onde bastava preservá-lo, então a RPC recebia o item sem
 * equipamento_id, não conseguia endereçar a linha de `equipamentos`, e o ativo
 * ficava na loja de origem mesmo com a transferência RECEBIDA (item 9.8).
 *
 * Vermelho antes (payload SERIAL sem equipamento_id), verde depois (o id do
 * equipamento chega à RPC).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// #9.5: o placeholder virou constante compartilhada. Consumir a constante em vez
// de repetir o texto evita que este teste quebre de novo se ele mudar.
import { PLACEHOLDER_BUSCA_EQUIPAMENTO } from '@/lib/equipamentos-utils';

const criarTransferenciaMutateAsync = vi.fn().mockResolvedValue({ id: 't-1', numero: 1 });

const LOJA_ORIGEM = 'loja-origem';
const LOJA_DESTINO = 'loja-destino';
const EQUIP_ID = '11111111-1111-4111-8111-111111111111';

const EQUIPAMENTO_SERIAL = {
  id: EQUIP_ID,
  codigo_interno: 'RO-QA-SEC9',
  numero_serie: 'SN-QA-0001',
  status_global: 'DISPONIVEL',
  tipo: 'SERIALIZADO',
  loja_atual_id: LOJA_ORIGEM,
  modelo_id: 'modelo-1',
  grupo_id: 'grupo-1',
};

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: LOJA_ORIGEM, nome: 'Loja QA Origem' } }),
}));

vi.mock('@/hooks/useSupabaseTransferencias', () => ({
  useSupabaseTransferencias: () => ({
    criarTransferencia: { mutateAsync: criarTransferenciaMutateAsync },
  }),
}));

vi.mock('@/modules/rh/hooks/useSupabaseLojas', () => ({
  useSupabaseLojas: () => ({
    lojas: [
      { id: LOJA_ORIGEM, nome: 'Loja QA Origem', ativo: true },
      { id: LOJA_DESTINO, nome: 'Loja QA Destino', ativo: true },
    ],
  }),
}));

vi.mock('@/hooks/useSupabaseEquipamentos', () => ({
  useSupabaseEquipamentos: () => ({ equipamentos: [EQUIPAMENTO_SERIAL], isLoading: false }),
}));

vi.mock('@/hooks/useSupabaseGrupos', () => ({
  useSupabaseGrupos: () => ({ grupos: [{ id: 'grupo-1', nome: 'Grupo QA' }], isLoading: false }),
}));

vi.mock('@/hooks/useSupabaseModelos', () => ({
  useSupabaseModelos: () => ({
    modelos: [{ id: 'modelo-1', nome_comercial: 'Betoneira 400L', grupo_id: 'grupo-1' }],
    isLoading: false,
  }),
}));

import { NovaTransferenciaModal } from '../NovaTransferenciaModal';

beforeEach(() => {
  criarTransferenciaMutateAsync.mockClear();
});

/** Busca o serializado, adiciona à lista e escolhe a loja destino. */
async function montarTransferenciaSerial() {
  render(<NovaTransferenciaModal open={true} onOpenChange={() => {}} />);

  fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER_BUSCA_EQUIPAMENTO), {
    target: { value: 'RO-QA-SEC9' },
  });

  // O resultado da busca é um Card clicável; o código interno vem num Badge
  // dentro dele, então o clique tem que subir até o Card.
  const badge = await screen.findByText('RO-QA-SEC9');
  fireEvent.click(badge);

  // Select de destino (Radix): abre pelo combobox e escolhe a opção.
  const combos = screen.getAllByRole('combobox');
  fireEvent.click(combos[0]);
  fireEvent.click(await screen.findByRole('option', { name: /loja qa destino/i }));
}

describe('NovaTransferenciaModal — item SERIAL carrega equipamento_id', () => {
  it('manda o id do equipamento no payload do item serializado', async () => {
    await montarTransferenciaSerial();

    fireEvent.click(await screen.findByRole('button', { name: /criar transfer/i }));

    await waitFor(() => expect(criarTransferenciaMutateAsync).toHaveBeenCalledTimes(1));

    const { itens } = criarTransferenciaMutateAsync.mock.calls[0][0];
    const serial = itens.find((i: any) => i.tipo === 'SERIAL');

    expect(serial).toBeDefined();
    // O ponto do bug: sem isto a RPC não move o ativo.
    expect(serial.equipamento_id).toBe(EQUIP_ID);
    // E o codigo_interno continua indo junto (fallback da RPC p/ bundle antigo).
    expect(serial.codigo_interno).toBe('RO-QA-SEC9');
  });
});
