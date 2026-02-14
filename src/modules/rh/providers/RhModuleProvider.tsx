import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { RhScopeContext, RhFilters } from '../types';
import { useAcessosStore } from '../store/acessosStore';
import { useRhStore } from '../store/rhStore';
import { seedRhContent } from '../utils/seedRhContent';
import { seedRhMissing8 } from '../utils/seedRhMissing8';

interface RhModuleContextType {
  scope: RhScopeContext;
  filters: RhFilters;
  updateScope: (scope: Partial<RhScopeContext>) => void;
  updateFilters: (filters: Partial<RhFilters>) => void;
  isLoading: boolean;
  devProfile: string;
  setDevProfile: (profile: string) => void;
}

const RhModuleContext = createContext<RhModuleContextType | undefined>(undefined);

interface RhModuleProviderProps {
  children: ReactNode;
}

export function RhModuleProvider({ children }: RhModuleProviderProps) {
  const { loadFromStorage: loadAcessos } = useAcessosStore();
  const rhStore = useRhStore();
  
  const [scope, setScope] = useState<RhScopeContext>({
    unidadeAtiva: undefined,
    ccAtivo: undefined,
    periodo: {
      inicio: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      fim: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
    }
  });

  const [filters, setFilters] = useState<RhFilters>({});
  const [isLoading] = useState(false);
  const [devProfile, setDevProfile] = useState('admin');

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    // Load RH data
    rhStore.loadFromStorage();
    
    // Load access data
    loadAcessos();
    
    // If no RH data, seed it with comprehensive content
    if (rhStore.pessoas.length === 0) {
      const seedData = seedRhContent();
      const missingData = seedRhMissing8();
      Object.entries({...seedData, ...missingData}).forEach(([key, value]) => {
        (rhStore as any)[key] = value;
      });
      rhStore.saveToStorage();
    }
  }, [loadAcessos]);

  const updateScope = (newScope: Partial<RhScopeContext>) => {
    setScope(prev => ({ ...prev, ...newScope }));
  };

  const updateFilters = (newFilters: Partial<RhFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <RhModuleContext.Provider
      value={{
        scope,
        filters,
        updateScope,
        updateFilters,
        isLoading,
        devProfile,
        setDevProfile
      }}
    >
      {children}
    </RhModuleContext.Provider>
  );
}

export function useRhModule() {
  const context = useContext(RhModuleContext);
  if (context === undefined) {
    throw new Error('useRhModule must be used within a RhModuleProvider');
  }
  return context;
}