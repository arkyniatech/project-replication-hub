// Utility to clear localStorage for testing
export function clearAllStorage() {
  // Clear all ERP related localStorage - Dados migrados para Supabase
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (
      // Dados principais migrados
      key.startsWith('erp-') || 
      key.startsWith('config-') || 
      key.startsWith('v2-') ||
      
      // Configurações migradas
      key === 'config.organizacao' ||
      key === 'config.financeiro' ||
      key === 'config.seguranca' ||
      key === 'config.series' ||
      key === 'config.locacao' ||
      key === 'config.numeracao' ||
      
      // Entidades migradas
      key === 'transferencias-store' ||
      key === 'financeiro.cc' ||
      key === 'titulosPagar' ||
      key === 'logsAuditoria' ||
      key === 'equipamentos-store' ||
      key === 'contratos-store' ||
      key === 'disponibilidade-store' ||
      key === 'agenda-disponibilidade-store' ||
      key === 'faturamento-store' ||
      key === 'financeiro-store' ||
      key === 'politicas-store' ||
      key === 'taxa-deslocamento-store' ||
      key === 'timeline-store' ||
      key === 'bolepix-store' ||
      key === 'conferencia-store' ||
      key === 'relatorio-utilizacao-store' ||
      key === 'veiculos-store' ||
      key === 'veiculos-config-store'
    ) {
      localStorage.removeItem(key);
    }
  });
  console.log('✅ Storage cleared (dados migrados para Supabase). Refresh para recarregar.');
}

// Auto-execute if called directly
if (typeof window !== 'undefined') {
  (window as any).clearStorage = clearAllStorage;
}