/**
 * Utilitário para limpar dados de contratos do localStorage
 * Útil durante a migração para Supabase
 */

export function clearContractStorage() {
  const STORAGE_KEYS = [
    'erp-contratos',
    'erp-titulos',
    'erp-faturas',
    'erp-recebimentos',
  ];

  console.log('🧹 Limpando dados de contratos do localStorage...');
  
  STORAGE_KEYS.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const items = JSON.parse(data);
        console.log(`  - Removendo ${items.length} itens de ${key}`);
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`  ⚠️ Erro ao limpar ${key}:`, error);
      }
    }
  });

  console.log('✅ Limpeza concluída!');
}

// Executar automaticamente se chamado diretamente
if (typeof window !== 'undefined' && window.location.search.includes('clear-contracts')) {
  clearContractStorage();
  console.log('Para recarregar a página sem limpar novamente, remova "?clear-contracts" da URL');
}
