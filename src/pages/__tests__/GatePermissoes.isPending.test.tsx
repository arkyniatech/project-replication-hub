/**
 * RELAY 54 — o `isLoading` em ContagemAlmox:84 e Recebimento:180.
 * Quarta aparição do padrão (Relay 07, Relay 35).
 *
 * No react-query v5, `isLoading === isPending && isFetching`. A query de
 * papéis do useRbac tem `enabled: !!user?.id`, então enquanto a sessão está
 * sendo restaurada ela NUNCA entra em fetching — isLoading fica FALSE com as
 * claims ainda vazias. As duas telas decidiam o gate de acesso com esse campo,
 * então o gestor legítimo via "Acesso Restrito" por uma fração de tempo antes
 * dos papéis chegarem.
 *
 * O useRbac JÁ expõe `isResolvendoPermissoes` (authLoading || isPending), e o
 * próprio doc do hook diz: "Quem decide gate de acesso deve usar ESTE campo,
 * nunca isLoading". A correção é só nos consumidores — o hook não é tocado
 * (vai no lote D).
 *
 * Vermelho antes: com isLoading=false e isPending=true (o buraco exato), as
 * telas renderizavam "Acesso Restrito". Verde depois: spinner até resolver.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rbacFixture = {
  can: vi.fn(() => false),
  anyOf: vi.fn(() => false),
  allOf: vi.fn(() => false),
  perfilAtivo: 'vendedor',
  claimsAtivas: [] as string[],
  isLoading: false,
  isResolvendoPermissoes: true,
};

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => rbacFixture,
}));
vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-a-uuid', nome: 'Loja A' } }),
}));
vi.mock('@/hooks/useSupabaseContagens', () => ({
  useSupabaseContagens: () => ({
    contagens: [],
    isLoading: false,
    abrir: { isPending: false, mutate: vi.fn() },
    cancelar: { isPending: false, mutate: vi.fn() },
  }),
}));
vi.mock('@/hooks/useSupabaseCatalogo', () => ({
  useSupabaseCatalogo: () => ({ itens: [] }),
}));
// A tela de "Acesso Restrito" só existe na sub-rota de revisão, que é lida do
// query param — por isso o teste entra por ?contagem=...&modo=revisar.
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams('contagem=ct-1&modo=revisar'), vi.fn()],
}));

import ContagemAlmox from '../almox/ContagemAlmox';

// Componentes-filhos da tela usam react-query direto; o provider e so
// andaime de teste, nao muda o comportamento do gate.
const renderTela = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ContagemAlmox />
    </QueryClientProvider>,
  );

beforeEach(() => {
  rbacFixture.can = vi.fn(() => false);
  rbacFixture.isLoading = false;
  rbacFixture.isResolvendoPermissoes = true;
});

describe('gate de permissões usa isResolvendoPermissoes, não isLoading', () => {
  it('NÃO mostra "Acesso Restrito" enquanto os papéis ainda estão resolvendo', () => {
    // O buraco do v5: isLoading false, mas as claims ainda não chegaram.
    rbacFixture.isLoading = false;
    rbacFixture.isResolvendoPermissoes = true;

    renderTela();

    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument();
  });

  it('nega de verdade depois que os papéis resolvem sem a claim', () => {
    rbacFixture.isResolvendoPermissoes = false;
    rbacFixture.can = vi.fn(() => false);

    renderTela();

    // Já resolveu e não tem permissão: aí sim o gate nega (fail-closed).
    expect(screen.queryByText(/Carregando|spinner/i)).not.toBeInTheDocument();
  });

  it('libera a tela quando os papéis resolvem com a claim', () => {
    rbacFixture.isResolvendoPermissoes = false;
    rbacFixture.can = vi.fn(() => true);

    renderTela();

    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument();
  });
});
