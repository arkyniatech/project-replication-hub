/**
 * Relay 60 — gestão de categorias de contas a pagar.
 *
 * O drawer de novo título consome a query de ATIVAS (`categorias-n2`), que os
 * 4 consumidores existentes dependem filtrando ativo=true. A tela de gestão
 * precisa de uma segunda query (`categorias-n2-todas`) que inclui inativas
 * para poder reativar. Criar/inativar/reativar precisa invalidar as DUAS —
 * senão o drawer não vê a categoria recém-criada (ou segue vendo a inativada).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Tabela em memória: o mock reproduz só a superfície de PostgREST que o hook
// usa (select/eq/order/insert/update encadeados e "thenables").
let tabela: Array<{
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}> = [];

let proximoId = 1;

function builder() {
  const filtros: Array<(row: any) => boolean> = [];
  let modo: 'select' | 'insert' | 'update' = 'select';
  let payload: any = null;
  let single = false;

  const resultado = () => {
    if (modo === 'insert') {
      const nova = {
        id: `cat-${proximoId++}`,
        created_at: '2026-08-21T00:00:00Z',
        updated_at: '2026-08-21T00:00:00Z',
        ativo: true,
        ...payload,
      };
      tabela.push(nova);
      return { data: single ? nova : [nova], error: null };
    }
    if (modo === 'update') {
      const alvos = tabela.filter((row) => filtros.every((f) => f(row)));
      alvos.forEach((row) => Object.assign(row, payload));
      return { data: single ? alvos[0] ?? null : alvos, error: null };
    }
    const linhas = tabela.filter((row) => filtros.every((f) => f(row)));
    return { data: single ? linhas[0] ?? null : linhas, error: null };
  };

  const api: any = {
    select: () => api,
    insert: (valores: any) => {
      modo = 'insert';
      payload = valores;
      return api;
    },
    update: (valores: any) => {
      modo = 'update';
      payload = valores;
      return api;
    },
    eq: (coluna: string, valor: any) => {
      filtros.push((row) => row[coluna] === valor);
      return api;
    },
    order: () => api,
    single: () => {
      single = true;
      return api;
    },
    then: (onOk: any, onErr: any) => Promise.resolve(resultado()).then(onOk, onErr),
  };
  return api;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => builder() },
}));

import { useSupabaseCategoriasN2 } from '@/hooks/useSupabaseCategoriasN2';

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useSupabaseCategoriasN2(), { wrapper });
}

beforeEach(() => {
  tabela = [
    {
      id: 'cat-existente',
      nome: 'Aluguel de imóvel',
      tipo: 'DESPESA',
      ativo: true,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
  ];
  proximoId = 1;
});

describe('useSupabaseCategoriasN2 — gestão (Relay 60)', () => {
  it('criar categoria aparece na lista do drawer de novo título', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.createCategoria.mutateAsync({
      nome: 'Manutenção de frota',
      tipo: 'DESPESA',
      ativo: true,
    });

    // `categorias` é a query de ativas que o NovoTituloDrawer consome.
    await waitFor(() =>
      expect(result.current.categorias.map((c) => c.nome)).toContain('Manutenção de frota')
    );
    // E a tela de gestão também vê.
    await waitFor(() =>
      expect(result.current.categoriasTodas.map((c) => c.nome)).toContain('Manutenção de frota')
    );
  });

  it('inativar some da lista do drawer e continua na tela de gestão', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categorias.map((c) => c.id)).toContain('cat-existente');

    await result.current.inativarCategoria.mutateAsync('cat-existente');

    await waitFor(() =>
      expect(result.current.categorias.map((c) => c.id)).not.toContain('cat-existente')
    );
    await waitFor(() => {
      const naGestao = result.current.categoriasTodas.find((c) => c.id === 'cat-existente');
      expect(naGestao).toBeDefined();
      expect(naGestao?.ativo).toBe(false);
    });
  });

  it('reativar volta para as duas listas', async () => {
    tabela[0].ativo = false;
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoadingTodas).toBe(false));
    expect(result.current.categorias.map((c) => c.id)).not.toContain('cat-existente');
    expect(result.current.categoriasTodas.map((c) => c.id)).toContain('cat-existente');

    await result.current.updateCategoria.mutateAsync({ id: 'cat-existente', ativo: true });

    await waitFor(() =>
      expect(result.current.categorias.map((c) => c.id)).toContain('cat-existente')
    );
    await waitFor(() => {
      const naGestao = result.current.categoriasTodas.find((c) => c.id === 'cat-existente');
      expect(naGestao?.ativo).toBe(true);
    });
  });
});
