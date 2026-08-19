/**
 * RELAY 54 — item 16.5. Trocar a loja no seletor não filtrava a lista de
 * Equipamentos: continuava mostrando itens de outras lojas, enquanto os
 * CONTADORES de status zeravam corretamente. Duas fontes na mesma tela, só
 * uma respeitando a loja ativa.
 *
 * Causa: a tela chamava `useSupabaseEquipamentos()` SEM argumento, então o
 * bloco de filtro por loja dentro do hook (que só roda `if (lojaId)`) era
 * pulado inteiro e a lista recebia tudo que a RLS devolveu. Já os KPIs
 * filtravam por conta própria no useMemo (`eq.loja_atual_id !== lojaAtual.id`).
 * Todos os outros consumidores do hook (Dashboard, AnalisePatrimonial,
 * NovoContratoV2, AgendaDisponibilidade) já passavam `lojaAtual?.id`.
 *
 * NÃO é falha de segurança: a RLS de equipamentos já restringe usuário comum
 * a `loja_atual_id IN (lojas do usuário)`; admin vê tudo por desenho. É bug de
 * UI não filtrar o que a RLS legitimamente entregou.
 *
 * Vermelho antes (hook chamado sem lojaId), verde depois.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const useSupabaseEquipamentosMock = vi.fn();
let lojaAtualFixture: { id: string; nome: string } | null = { id: 'loja-a-uuid', nome: 'Loja A' };

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: lojaAtualFixture, lojas: [lojaAtualFixture].filter(Boolean) }),
}));

vi.mock('@/hooks/useSupabaseEquipamentos', () => ({
  useSupabaseEquipamentos: (lojaId?: string, grupoId?: string, modeloId?: string) =>
    useSupabaseEquipamentosMock(lojaId, grupoId, modeloId),
}));

vi.mock('@/hooks/useSupabaseGrupos', () => ({
  useSupabaseGrupos: () => ({ grupos: [] }),
}));
vi.mock('@/hooks/useSupabaseModelos', () => ({
  useSupabaseModelos: () => ({ modelos: [] }),
}));
vi.mock('@/hooks/useEquipamentosOcupados', () => ({
  useEquipamentosOcupados: () => ({ data: new Set<string>() }),
}));
vi.mock('@/hooks/useKeyboardShortcut', () => ({
  useKeyboardShortcut: () => {},
}));
vi.mock('@/components/transferencias/HistoricoTransferenciasModal', () => ({
  HistoricoTransferenciasModal: () => null,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import EquipamentosLista from '../EquipamentosLista';

const equipamentoDaLojaA = {
  id: 'eq-a',
  tipo: 'SERIALIZADO',
  status_global: 'DISPONIVEL',
  loja_atual_id: 'loja-a-uuid',
  codigo_interno: 'EQ-A-0001',
  saldos_por_loja: {},
};

beforeEach(() => {
  useSupabaseEquipamentosMock.mockReset();
  useSupabaseEquipamentosMock.mockReturnValue({
    equipamentos: [equipamentoDaLojaA],
    isLoading: false,
  });
  lojaAtualFixture = { id: 'loja-a-uuid', nome: 'Loja A' };
});

describe('EquipamentosLista — lista respeita a loja ativa igual aos contadores', () => {
  it('passa a loja ativa ao hook, para o filtro por loja de fato rodar', () => {
    render(<EquipamentosLista />);

    expect(useSupabaseEquipamentosMock).toHaveBeenCalled();
    const [lojaId] = useSupabaseEquipamentosMock.mock.calls[0];
    expect(lojaId).toBe('loja-a-uuid');
  });

  it('não chama o hook sem lojaId quando existe loja ativa (o bug do 16.5)', () => {
    render(<EquipamentosLista />);

    const [lojaId] = useSupabaseEquipamentosMock.mock.calls[0];
    expect(lojaId).toBeDefined();
  });

  it('nunca inventa um id de fallback quando não há loja ativa', () => {
    lojaAtualFixture = null;
    useSupabaseEquipamentosMock.mockReturnValue({ equipamentos: [], isLoading: false });

    render(<EquipamentosLista />);

    const [lojaId] = useSupabaseEquipamentosMock.mock.calls[0];
    expect(lojaId).toBeUndefined();
    expect(lojaId).not.toBe('1');
  });

  it('lista e contador partem do mesmo conjunto: sem loja divergente na lista', () => {
    // O hook (mockado) é a única fonte da lista. Se a tela passar a loja
    // ativa, o hook real já devolve só a loja certa — a tela não pode
    // reintroduzir itens de outras lojas por fora.
    render(<EquipamentosLista />);

    expect(screen.getByText(/Equipamentos \(1\)/)).toBeInTheDocument();
  });

  it('conta SALDO com estoque na loja ativa mesmo com loja_atual_id de outra loja', () => {
    // O hook filtra SALDO por saldos_por_loja (tem estoque aqui?), não por
    // loja_atual_id. Se o KPI descartasse por loja_atual_id, o item apareceria
    // na lista e sumiria do contador — a mesma divergência do 16.5, invertida.
    useSupabaseEquipamentosMock.mockReturnValue({
      equipamentos: [
        {
          id: 'eq-saldo',
          tipo: 'SALDO',
          status_global: 'DISPONIVEL',
          loja_atual_id: 'loja-b-uuid',
          codigo_interno: 'EQ-B-0002',
          saldos_por_loja: { 'loja-a-uuid': { qtd: 7, qtdDisponivel: 7 } },
        },
      ],
      isLoading: false,
    });

    render(<EquipamentosLista />);

    // 1 item na lista...
    expect(screen.getByText(/Equipamentos \(1\)/)).toBeInTheDocument();

    // ...e 7 unidades no card KPI "Disponível". Precisa ancorar no card certo:
    // os demais KPIs também mostram números, e "Disponível" ainda aparece na
    // linha do item SALDO — um getByText solto casaria com qualquer um deles.
    const labelKpi = screen
      .getAllByText('Disponível')
      .find(el => el.className.includes('text-muted-foreground') && el.className.includes('text-xs'))!;
    expect(labelKpi).toBeDefined();
    const valorKpi = labelKpi.parentElement!.querySelector('.text-2xl')!;
    expect(valorKpi.textContent).toBe('7');
  });
});
