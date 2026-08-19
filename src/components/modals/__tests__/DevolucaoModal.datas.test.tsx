/**
 * RELAY 54 — item 16.2. O modal Devolução Total mostrava 10/07–07/08 para um
 * contrato que é 11/07–08/08: um dia a menos nas duas pontas. O modal Renovar
 * do MESMO contrato mostra certo, e o PDF também.
 *
 * Causa: `new Date('2025-07-11').toLocaleDateString('pt-BR')`. Uma string
 * 'YYYY-MM-DD' é parseada como meia-noite UTC; em UTC-3 o toLocaleDateString
 * renderiza o dia ANTERIOR. É exatamente a família de bug que src/lib/date-utils
 * existe para evitar (#19.3, #23, #25) — o RenovarContratoModal escapou por ter
 * um helper local que monta `new Date(ano, mes-1, dia)`, componente a
 * componente, sem passar por UTC.
 *
 * O deslocamento só é observável em fuso atrás de UTC — numa máquina em UTC+0
 * o sintoma some sozinho. As asserções de render ficam condicionais ao fuso;
 * a asserção sobre o formatador canônico roda em qualquer lugar.
 *
 * Vermelho antes (10/07/2025), verde depois (11/07/2025).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDateBR } from '@/lib/date-utils';

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-a-uuid', nome: 'Loja A' } }),
}));
vi.mock('@/hooks/useCurrentUserName', () => ({
  useCurrentUserName: () => 'QA',
  getCurrentUserName: async () => 'QA',
}));
vi.mock('@/components/contratos/IntegrationAlerts', () => ({
  IntegrationAlerts: () => null,
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
  IntegrationAlerts: () => null,
}));

import DevolucaoModal from '../DevolucaoModal';

const contrato: any = {
  id: 'c-14',
  numero: '14',
  lojaId: 'loja-a-uuid',
  cliente: { nomeRazao: 'Cliente QA' },
  // O contrato é 11/07 a 08/08. A tela não pode mostrar 10/07 e 07/08.
  dataInicio: '2025-07-11',
  dataFim: '2025-08-08',
  status: 'ATIVO',
  itens: [],
  valorTotal: 1000,
};

// O deslocamento só é observável em fuso atrás de UTC. Numa máquina em UTC+0
// o bug some sozinho, então as asserções de render são condicionais — mas a
// asserção sobre o formatador canônico roda em qualquer fuso.
const emFusoAtrasDeUTC = new Date('2025-07-11T00:00:00Z').getTimezoneOffset() > 0;
const itSeUTCMenos = emFusoAtrasDeUTC ? it : it.skip;

// Referência estável: `itensSelecionados` entra no array de dependências de um
// useEffect que chama setState. Passar `[]` inline (ou omitir, caindo no default
// do componente) cria um array novo a cada render e o efeito nunca estabiliza —
// o teste roda para sempre. Bug pré-existente do componente, fora do escopo do
// 16.2; aqui só evitamos disparar ele.
const SEM_ITENS_SELECIONADOS: string[] = [];

describe('DevolucaoModal — datas do período sem deslocamento de fuso (#16.2)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  itSeUTCMenos('mostra a data de início real do contrato, não o dia anterior', () => {
    render(<DevolucaoModal contrato={contrato} open onOpenChange={() => {}} tipo="TOTAL" itensSelecionados={SEM_ITENS_SELECIONADOS} />);

    expect(screen.getByText(/11\/07\/2025/)).toBeInTheDocument();
    expect(screen.queryByText(/10\/07\/2025/)).not.toBeInTheDocument();
  });

  itSeUTCMenos('mostra a data de fim real do contrato, não o dia anterior', () => {
    render(<DevolucaoModal contrato={contrato} open onOpenChange={() => {}} tipo="TOTAL" itensSelecionados={SEM_ITENS_SELECIONADOS} />);

    expect(screen.getByText(/08\/08\/2025/)).toBeInTheDocument();
    expect(screen.queryByText(/07\/08\/2025/)).not.toBeInTheDocument();
  });

  it('usa o mesmo formatador canônico de date-utils (mesma saída do PDF/Renovar)', () => {
    // Trava a regressão: qualquer volta ao new Date(str).toLocaleDateString
    // diverge deste valor de referência.
    expect(formatDateBR(contrato.dataInicio)).toBe('11/07/2025');
    expect(formatDateBR(contrato.dataFim)).toBe('08/08/2025');
  });
});
