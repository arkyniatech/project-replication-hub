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

export function findCCPathWithCode(ccId: string): string {
  const centrosCusto = getCentrosCusto();
  const cc = centrosCusto.find(item => item.id === ccId);
  
  if (!cc) return 'Sem CC';
  
  const parent = centrosCusto.find(item => item.id === cc.parentId);
  return parent ? `${parent.codigo} › ${cc.codigo}` : cc.codigo;
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

export function ensureNotInUse(ccId: string): boolean {
  // Mock - em produção verificaria nas parcelas/movimentos
  // Por enquanto, apenas verifica se não tem filhos
  const centrosCusto = getCentrosCusto();
  const hasChildren = centrosCusto.some(cc => cc.parentId === ccId);
  
  if (hasChildren) {
    return false;
  }
  
  // Verificar uso em parcelas (mock)
  try {
    const titulos = localStorage.getItem('contas-pagar.titulos');
    const parcelas = localStorage.getItem('contas-pagar.parcelas');
    const movimentos = localStorage.getItem('contas-pagar.movimentos');
    
    if (titulos) {
      const titulosData = JSON.parse(titulos);
      if (titulosData.some((t: any) => t.ccId === ccId)) {
        return false;
      }
    }
    
    if (parcelas) {
      const parcelasData = JSON.parse(parcelas);
      if (parcelasData.some((p: any) => p.ccId === ccId)) {
        return false;
      }
    }
    
    if (movimentos) {
      const movimentosData = JSON.parse(movimentos);
      if (movimentosData.some((m: any) => m.ccId === ccId)) {
        return false;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar uso do CC:', error);
  }
  
  return true;
}

export function mapRealByN2AndCC(
  periodo: string, 
  lojas: string[], 
  contas?: string[], 
  ccIds?: string[]
): Record<string, Record<string, number>> {
  // Mock - em produção faria a consulta real nos movimentos
  const mockData: Record<string, Record<string, number>> = {
    'A5.01': {
      'cc1': 15000,
      'cc2': 13500,
      'sem_cc': 0
    },
    'A5.02': {
      'cc1': 12000,
      'cc2': 11400,
      'sem_cc': 0
    },
    'A5.03': {
      'cc1': 18000,
      'cc2': 13200,
      'sem_cc': 0
    },
    'A5.04': {
      'cc1': 9500,
      'cc2': 9400,
      'sem_cc': 0
    },
    'A5.05': {
      'cc1': 11000,
      'cc2': 12430,
      'sem_cc': 0
    }
  };
  
  // Filtrar por CC se especificado
  if (ccIds && ccIds.length > 0) {
    const filtered: Record<string, Record<string, number>> = {};
    Object.keys(mockData).forEach(categoria => {
      filtered[categoria] = {};
      ccIds.forEach(ccId => {
        if (mockData[categoria][ccId]) {
          filtered[categoria][ccId] = mockData[categoria][ccId];
        }
      });
    });
    return filtered;
  }
  
  return mockData;
}