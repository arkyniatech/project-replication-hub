/**
 * Utility to clear and re-initialize equipment data
 */
import { seedEquipamentosData } from './equipamentos-seed';

export function clearAndReseedEquipments() {
  console.log('🗑️ Limpando dados de equipamentos...');
  
  // Clear the equipamentos store from localStorage
  localStorage.removeItem('equipamentos-store');
  
  // Force a page reload to ensure clean state, or re-seed immediately
  console.log('🔄 Re-inicializando dados de equipamentos...');
  seedEquipamentosData();
  
  console.log('✅ Dados de equipamentos limpos e re-inicializados');
}

// For debugging - add to window in development
if (process.env.NODE_ENV === 'development') {
  (window as any).clearEquipmentData = clearAndReseedEquipments;
  (window as any).reseedEquipments = seedEquipamentosData;
}