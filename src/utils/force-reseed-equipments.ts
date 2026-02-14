/**
 * Force equipment re-seeding for debugging
 */
import { seedEquipamentosData } from './equipamentos-seed';

export function forceReseedEquipments() {
  console.log('🔄 Forçando re-seed de equipamentos...');
  
  // Clear storage
  localStorage.removeItem('equipamentos-storage');
  
  // Re-seed
  seedEquipamentosData();
  
  console.log('✅ Re-seed forçado concluído');
  
  // Reload page to see changes
  window.location.reload();
}

// Add to global for easy access in console
if (typeof window !== 'undefined') {
  (window as any).forceReseedEquipments = forceReseedEquipments;
}