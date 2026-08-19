/**
 * RELAY 48 — item 10.5. `lojaAtiva` era o literal 'loja-mock-id', não um uuid.
 * Toda query batia em `solicitacao_manutencao?loja_id=eq.loja-mock-id`, o
 * Postgres devolvia 400 (22P02) e a tela ficava presa em "Carregando..." sem
 * nunca mostrar erro — mesma família do @ts-nocheck: spinner mudo escondendo
 * falha real (relay 47 / seção 8).
 *
 * A tela deve usar useMultiunidade (mesmo hook de NovaTransferenciaModal e
 * FaturamentoCarrinho), e bloquear com aviso se lojaAtual vier indefinida —
 * não inventar id de fallback (já corrigimos o `|| '1'` duas vezes antes).
 *
 * Vermelho antes (lojaAtiva fixo em 'loja-mock-id'), verde depois.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const useSupabaseSolicitacoesMock = vi.fn();
let lojaAtualFixture: { id: string; nome: string } | null = { id: 'loja-real-uuid', nome: 'Loja QA' };

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: lojaAtualFixture }),
}));

vi.mock('@/hooks/useSupabaseSolicitacoes', () => ({
  useSupabaseSolicitacoes: (filtros: any) => useSupabaseSolicitacoesMock(filtros),
}));

vi.mock('@/hooks/useSolicitacoesRealtime', () => ({
  useSolicitacoesRealtime: () => {},
}));

vi.mock('@/components/solicitacoes/SolicitacaoModal', () => ({
  SolicitacaoModal: () => null,
}));
vi.mock('@/components/solicitacoes/SolicitacaoDetalhe', () => ({
  SolicitacaoDetalhe: () => null,
}));

import SolicitacoesManutencao from '../SolicitacoesManutencao';

beforeEach(() => {
  useSupabaseSolicitacoesMock.mockReset();
  useSupabaseSolicitacoesMock.mockReturnValue({ solicitacoes: [], isLoading: false, error: null });
  lojaAtualFixture = { id: 'loja-real-uuid', nome: 'Loja QA' };
});

describe('SolicitacoesManutencao — loja ativa real, não mockada', () => {
  it('filtra por loja_id da sessão real (useMultiunidade), não por literal fixo', () => {
    render(<SolicitacoesManutencao />);

    expect(useSupabaseSolicitacoesMock).toHaveBeenCalledWith(
      expect.objectContaining({ loja_id: 'loja-real-uuid' }),
    );
  });

  it('nunca envia o literal "loja-mock-id" como filtro', () => {
    render(<SolicitacoesManutencao />);

    const [filtros] = useSupabaseSolicitacoesMock.mock.calls[0];
    expect(filtros.loja_id).not.toBe('loja-mock-id');
  });

  it('bloqueia com aviso quando não há loja ativa, em vez de inventar um id', () => {
    lojaAtualFixture = null;
    render(<SolicitacoesManutencao />);

    expect(screen.getByText(/selecione uma loja/i)).toBeInTheDocument();
    // O hook ainda é chamado (regra dos hooks), mas sem loja_id — não deve
    // inventar um id de fallback tipo '1' ou 'loja-mock-id'.
    const [filtros] = useSupabaseSolicitacoesMock.mock.calls[0];
    expect(filtros.loja_id).toBeUndefined();
  });
});
