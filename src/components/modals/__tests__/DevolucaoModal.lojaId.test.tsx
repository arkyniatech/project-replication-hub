/**
 * RELAY 54 — os `|| '1'` restantes, parte 2: DevolucaoModal (:306 e :358).
 *
 * Diferente do TransferenciasTab, aqui o id não vem da sessão e sim do próprio
 * contrato (`contrato.lojaId`). O `|| '1'` mascarava um contrato sem lojaId,
 * mandando o literal para o barramento de integração e para os alertas.
 *
 * As medições confirmam que nada foi corrompido — o uuid recusa a string antes
 * de gravar, então o fallback sempre FALHOU em vez de sujar o banco. A
 * correção é preventiva; o que muda para o usuário é parar de disparar um
 * evento com id invalido silenciosamente.
 *
 * Ordem: loja do contrato → loja ativa da sessão → nada. Nunca um literal.
 *
 * Vermelho antes (emite com '1'), verde depois (emite com a loja da sessão,
 * e não emite quando não há nenhuma das duas).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const integrationAlertsSpy = vi.fn();
let lojaAtualFixture: { id: string; nome: string } | null = { id: 'loja-sessao-uuid', nome: 'Loja A' };

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: lojaAtualFixture }),
}));
vi.mock('@/hooks/useCurrentUserName', () => ({
  useCurrentUserName: () => 'QA',
  getCurrentUserName: async () => 'QA',
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }) },
}));
vi.mock('@/hooks/useSupabaseContratos', () => ({
  useSupabaseContratos: () => ({ devolverContrato: { mutateAsync: vi.fn() } }),
}));
vi.mock('@/stores/contratosStore', () => ({
  useContratosStore: () => ({ syncFromStorage: vi.fn() }),
}));
vi.mock('../../contratos/IntegrationAlerts', () => ({
  IntegrationAlerts: (props: any) => {
    integrationAlertsSpy(props);
    return null;
  },
}));

import DevolucaoModal from '../DevolucaoModal';

const SEM_ITENS_SELECIONADOS: string[] = [];

const contratoBase: any = {
  id: 'c-14',
  numero: '14',
  cliente: { nomeRazao: 'Cliente QA' },
  dataInicio: '2025-07-11',
  dataFim: '2025-08-08',
  status: 'ATIVO',
  itens: [],
  valorTotal: 1000,
};

const renderCom = (contrato: any) =>
  render(
    <DevolucaoModal
      contrato={contrato}
      open
      onOpenChange={() => {}}
      tipo="TOTAL"
      itensSelecionados={SEM_ITENS_SELECIONADOS}
    />,
  );

beforeEach(() => {
  integrationAlertsSpy.mockReset();
  lojaAtualFixture = { id: 'loja-sessao-uuid', nome: 'Loja A' };
});

describe("DevolucaoModal — lojaId sem fallback '1'", () => {
  it('usa a loja do próprio contrato quando ela existe', () => {
    renderCom({ ...contratoBase, lojaId: 'loja-do-contrato-uuid' });

    expect(integrationAlertsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ lojaId: 'loja-do-contrato-uuid' }),
    );
  });

  it('cai para a loja ativa da sessão quando o contrato não traz lojaId', () => {
    renderCom({ ...contratoBase, lojaId: undefined });

    expect(integrationAlertsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ lojaId: 'loja-sessao-uuid' }),
    );
  });

  it("nunca passa o literal '1' como lojaId", () => {
    lojaAtualFixture = null;
    renderCom({ ...contratoBase, lojaId: undefined });

    const usouLiteral = integrationAlertsSpy.mock.calls.some(([p]) => p?.lojaId === '1');
    expect(usouLiteral).toBe(false);
  });
});
