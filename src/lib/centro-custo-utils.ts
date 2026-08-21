import type { CentroCusto } from '@/types';

// Utilitários para Centros de Custo

export function getCentrosCusto(): CentroCusto[] {
  try {
    const stored = localStorage.getItem('financeiro.cc');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao carregar centros de custo:', error);
    return [];
  }
}

export function findCCPath(ccId: string): string {
  const centrosCusto = getCentrosCusto();
  const cc = centrosCusto.find(item => item.id === ccId);
  
  if (!cc) return 'Sem CC';
  
  const parent = centrosCusto.find(item => item.id === cc.parentId);
  return parent ? `${parent.nome} › ${cc.nome}` : cc.nome;
}

export function getCCForSelect(): Array<{ id: string; label: string; unidadeId?: string; ativo: boolean }> {
  const centrosCusto = getCentrosCusto();
  
  return centrosCusto.map(cc => ({
    id: cc.id,
    label: findCCPath(cc.id),
    unidadeId: cc.unidadeId,
    ativo: cc.ativo
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function getCCPadraoParaCategoria(categoriaCodigo: string): string | undefined {
  try {
    const config = localStorage.getItem('config.financeiro');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.ccPadraoPorCategoria?.[categoriaCodigo];
    }
  } catch (error) {
    console.error('Erro ao buscar CC padrão:', error);
  }
  return undefined;
}

/**
 * mapRealByN2AndCC foi removida no relay 66. Era um mock inline (`// Mock -
 * em produção faria a consulta real nos movimentos`) cujos valores foram
 * fabricados para bater com o outro mock do DRE: 15000 + 13500 = 28500 =
 * A5.01.real de expensesData. Não lia de tabela nenhuma. A agregação real do
 * DRE vive em src/lib/dre-agregacao.ts, sem dimensão de centro de custo —
 * nenhum lançamento financeiro tem cc_id no modelo atual.
 */
