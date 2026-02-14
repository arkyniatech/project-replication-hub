import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { RhModuleProvider } from '../providers/RhModuleProvider';
import { RhTopBar } from '../components/RhTopBar';
import { RhBreadcrumbs } from '../components/RhBreadcrumbs';
import { DevToolbar } from '../components/DevToolbar';
import { RhModuleSidebar } from '../components/RhModuleSidebar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
export function RhModuleLayout() {
  const isDev = import.meta.env.DEV;

  return (
    <RhModuleProvider>
      <div className="flex-1 flex flex-col">
        {/* Dev Toolbar - apenas em desenvolvimento */}
        {isDev && <DevToolbar />}
        
        {/* Topbar do módulo com filtros visuais */}
        <RhTopBar />
        
        {/* Layout em duas colunas - aproveita todo o espaço disponível */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar do módulo */}
          <RhModuleSidebar />
          
          {/* Área de conteúdo */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Breadcrumbs */}
            <div className="px-6 py-3 border-b bg-muted/20">
              <RhBreadcrumbs />
            </div>
            
            {/* Conteúdo principal */}
            <main className="flex-1 p-4 overflow-auto">
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <LoadingSpinner />
                </div>
              }>
                <Outlet />
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </RhModuleProvider>
  );
}