import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { EmitirBolePixModal } from '@/components/bolepix/EmitirBolePixModal';

// RELAY 43 / item 7.4. Antes desta correção o modal usava MockInterAdapter e
// respondia "BolePix solicitado" sem nunca falar com o Inter nem checar
// inter_credentials: o operador acreditava que o cliente tinha sido cobrado.
// Agora o gateway é sempre o BackendInterAdapter, que chama o inter-proxy; sem
// credencial cadastrada o proxy devolve 404 e a mensagem tem que CHEGAR ao
// usuário — é ela que faz a mudança valer.

const emitCharge = vi.fn();
const setLojaId = vi.fn();
const toast = vi.fn();

vi.mock('@/stores/bolePixStore', () => ({
  useBolePixStore: () => ({
    gateway: { emitCharge, setLojaId },
    generateIdempotencyKey: () => 'idem-teste',
    setGatewayLoja: setLojaId,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

let lojaAtual: { id: string; nome: string } | null = { id: 'loja-001', nome: 'Águas de Lindóia' };
vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual }),
}));

const titulo = {
  id: 'titulo-1',
  numero: 'TIT-001-000014',
  clienteNome: 'QA Fix Uuid',
  clienteDoc: '11144477735',
  clienteEmail: 'qa@teste.com',
  valor: 150,
  vencimento: '2026-09-01',
};

function renderModal() {
  return render(
    <EmitirBolePixModal open onClose={vi.fn()} titulo={titulo} onSuccess={vi.fn()} />
  );
}

async function submit() {
  fireEvent.click(screen.getByRole('button', { name: /emitir/i }));
}

describe('EmitirBolePixModal — credencial Inter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lojaAtual = { id: 'loja-001', nome: 'Águas de Lindóia' };
  });

  it('aponta o gateway para a loja ativa antes de emitir', () => {
    renderModal();
    // Sem isso o inter-proxy responde 400 "action e loja_id são obrigatórios",
    // que apontaria para o lugar errado em vez de dizer que falta credencial.
    expect(setLojaId).toHaveBeenCalledWith('loja-001');
  });

  it('mostra a mensagem real do proxy quando não há credencial cadastrada', async () => {
    emitCharge.mockRejectedValueOnce(
      new Error('Credenciais Inter não configuradas para esta loja')
    );

    renderModal();
    await submit();

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao emitir',
          description: 'Credenciais Inter não configuradas para esta loja',
          variant: 'destructive',
        })
      );
    });
  });

  it('não anuncia sucesso quando a emissão falha', async () => {
    emitCharge.mockRejectedValueOnce(
      new Error('Credenciais Inter não configuradas para esta loja')
    );

    renderModal();
    await submit();

    await waitFor(() => expect(toast).toHaveBeenCalled());

    const anunciouSucesso = toast.mock.calls.some(
      ([arg]) => typeof arg?.title === 'string' && /solicitad|sucesso/i.test(arg.title)
    );
    expect(anunciouSucesso).toBe(false);
  });

  it('bloqueia a emissão quando não há unidade ativa', async () => {
    lojaAtual = null;

    renderModal();
    await submit();

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Selecione uma unidade' })
      );
    });
    expect(emitCharge).not.toHaveBeenCalled();
  });
});
