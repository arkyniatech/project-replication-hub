/**
 * Relay 68 — Portal do Motorista lendo dado real.
 *
 * Antes: `mockTarefas` hardcoded num useEffect (João Silva, Maria Santos), sem
 * nenhuma chamada Supabase, e `syncCheckin` com setTimeout que dizia
 * "Check-in enviado ao servidor" sem enviar nada.
 *
 * Estes testes cobrem o que a tela promete ao motorista:
 *  - só as tarefas DELE aparecem (filtro por motorista_id do usuário logado)
 *  - sem tarefa, o empty state aparece — hoje era inalcançável, o mock sempre
 *    populava a lista
 *  - o check-in grava de verdade
 *  - erro de gravação NÃO mostra sucesso: mentir para o motorista é pior que
 *    falhar visivelmente, porque ele vai embora achando que registrou
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

// Estado do "banco" para o mock do PostgREST.
let tarefasDoBanco: Array<Record<string, unknown>> = [];
let updatesRecebidos: Array<{ id: string; updates: Record<string, unknown> }> = [];
let updateDeveFalhar = false;

function builder(tabela: string) {
  const filtros: Array<(row: Record<string, unknown>) => boolean> = [];
  let modo: 'select' | 'update' = 'select';
  let payload: Record<string, unknown> = {};
  let single = false;

  const resultado = () => {
    if (tabela === 'user_profiles') {
      return { data: single ? { pessoa_id: 'pessoa-1' } : [{ pessoa_id: 'pessoa-1' }], error: null };
    }
    if (tabela === 'logistica_motoristas') {
      const linha = { id: 'motorista-1', nome: 'Teste Motorista', loja_id: 'loja-1', pessoa_id: 'pessoa-1', ativo: true };
      return { data: single ? linha : [linha], error: null };
    }
    if (tabela === 'logistica_tarefas') {
      if (modo === 'update') {
        if (updateDeveFalhar) {
          return { data: null, error: { message: 'permission denied for table logistica_tarefas' } };
        }
        const alvos = tarefasDoBanco.filter((row) => filtros.every((f) => f(row)));
        alvos.forEach((row) => {
          updatesRecebidos.push({ id: row.id as string, updates: { ...payload } });
          Object.assign(row, payload);
        });
        return { data: single ? alvos[0] ?? null : alvos, error: null };
      }
      const linhas = tarefasDoBanco.filter((row) => filtros.every((f) => f(row)));
      return { data: single ? linhas[0] ?? null : linhas, error: null };
    }
    return { data: single ? null : [], error: null };
  };

  const api: Record<string, unknown> = {
    select: () => api,
    update: (valores: Record<string, unknown>) => {
      modo = 'update';
      payload = valores;
      return api;
    },
    eq: (coluna: string, valor: unknown) => {
      filtros.push((row) => row[coluna] === valor);
      return api;
    },
    gte: () => api,
    lte: () => api,
    in: () => api,
    order: () => api,
    single: () => {
      single = true;
      return api;
    },
    maybeSingle: () => {
      single = true;
      return api;
    },
    then: (onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) =>
      Promise.resolve(resultado()).then(onOk, onErr),
  };
  return api;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => builder(tabela) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'auth-user-1' } }),
}));

import LogisticaMobile from '../LogisticaMobile';

const AMANHA = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const tarefaBase = (over: Record<string, unknown>) => ({
  loja_id: 'loja-1',
  tipo: 'ENTREGA',
  status: 'PROGRAMADO',
  prioridade: 'ALTA',
  previsto_iso: AMANHA,
  duracao_min: 30,
  endereco: 'Rua das Flores, 123',
  cliente_nome: 'Cliente Um',
  cliente_telefone: '(11) 99999-1111',
  motorista_id: 'motorista-1',
  created_at: AMANHA,
  updated_at: AMANHA,
  ...over,
});

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(LogisticaMobile))
  );
}

beforeEach(() => {
  toastSpy.mockClear();
  updatesRecebidos = [];
  updateDeveFalhar = false;
  tarefasDoBanco = [];

  // Geolocalização concedida: sem posição a tela não mostra os botões de ação.
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: unknown) => void) =>
        ok({ coords: { latitude: -22.4761, longitude: -46.6329 } }),
    },
  });
});

describe('LogisticaMobile — tarefas do motorista logado', () => {
  it('mostra apenas as tarefas atribuídas ao motorista do usuário logado', async () => {
    tarefasDoBanco = [
      tarefaBase({ id: 't-minha', cliente_nome: 'Cliente Do Motorista' }),
      tarefaBase({ id: 't-de-outro', cliente_nome: 'Cliente De Outro', motorista_id: 'motorista-2' }),
    ];

    montar();

    await waitFor(() => expect(screen.getByText('Cliente Do Motorista')).toBeInTheDocument());
    expect(screen.queryByText('Cliente De Outro')).not.toBeInTheDocument();
  });

  it('não renderiza os nomes do mock antigo', async () => {
    tarefasDoBanco = [tarefaBase({ id: 't-1' })];
    montar();

    await waitFor(() => expect(screen.getByText('Cliente Um')).toBeInTheDocument());
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
  });

  it('sem tarefa, mostra o empty state — que o mock tornava inalcançável', async () => {
    tarefasDoBanco = [];
    montar();

    await waitFor(() => expect(screen.getByText(/Nenhuma tarefa/i)).toBeInTheDocument());
  });
});

describe('LogisticaMobile — check-in grava de verdade', () => {
  it('"Cheguei" grava check_in_ts, coordenadas e status CONCLUIDO', async () => {
    tarefasDoBanco = [tarefaBase({ id: 't-1' })];
    montar();

    await waitFor(() => expect(screen.getByText('Cliente Um')).toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: /Cheguei/i }));

    await waitFor(() => expect(updatesRecebidos).toHaveLength(1));
    const { id, updates } = updatesRecebidos[0];
    expect(id).toBe('t-1');
    expect(updates.status).toBe('CONCLUIDO');
    expect(updates.check_in_ts).toBeTruthy();
    expect(updates.check_in_latitude).toBe(-22.4761);
    expect(updates.check_in_longitude).toBe(-46.6329);
  });

  it('"Falha" grava motivo_falha e não marca CONCLUIDO', async () => {
    tarefasDoBanco = [tarefaBase({ id: 't-1' })];
    montar();

    await waitFor(() => expect(screen.getByText('Cliente Um')).toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: /Falha/i }));

    await waitFor(() => expect(updatesRecebidos).toHaveLength(1));
    const { updates } = updatesRecebidos[0];
    expect(updates.motivo_falha).toBeTruthy();
    expect(updates.motivo_falha_tipo).toBeTruthy();
    expect(updates.status).not.toBe('CONCLUIDO');
  });

  it('erro de gravação NÃO mostra sucesso ao motorista', async () => {
    tarefasDoBanco = [tarefaBase({ id: 't-1' })];
    updateDeveFalhar = true;
    montar();

    await waitFor(() => expect(screen.getByText('Cliente Um')).toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: /Cheguei/i }));

    await waitFor(() => expect(toastSpy).toHaveBeenCalled());

    const chamadas = toastSpy.mock.calls.map(([arg]) => arg as { title?: string; variant?: string });
    // Nenhum toast pode afirmar que deu certo.
    expect(chamadas.some((c) => /realizado|enviado|sincronizado/i.test(c.title ?? ''))).toBe(false);
    expect(chamadas.some((c) => c.variant === 'destructive')).toBe(true);
  });
});
