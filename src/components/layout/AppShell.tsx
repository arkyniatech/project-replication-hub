import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { NavRail } from "@/components/layout/NavRail";
import { NavOverlayPanel } from "@/components/layout/NavOverlayPanel";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ShortcutsHelp } from "@/components/search/ShortcutsHelp";
import { SelecaoLojaModal } from "@/components/multiunidade/SelecaoLojaModal";
import { useNavRail } from "@/hooks/useNavRail";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalLojaOpen, setModalLojaOpen] = useState(false);
  
  const railRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  
  const {
    isExpanded,
    isPinned,
    expandPanel,
    togglePin,
    onMouseEnterRail,
    onMouseLeavePanel,
  } = useNavRail({ railRef, panelRef });

  const { 
    needsLojaSelection, 
    loading, 
    lojaAtual,
    lojasPermitidas,
    selecionarLoja 
  } = useMultiunidade();

  const { isShortcutsDisabled, toggleShortcuts } = useGlobalShortcuts({
    onOpenSearch: () => setSearchOpen(true),
    onOpenHelp: () => setHelpOpen(true),
    onOpenCaixaDrawer: () => {
      // Nota: este atalho global funciona melhor no contexto do Dashboard
    }
  });

  // Controlar abertura do modal de seleção de loja
  useEffect(() => {
    setModalLojaOpen(needsLojaSelection);
  }, [needsLojaSelection]);

  // Seleção automática para usuários com apenas uma loja
  useEffect(() => {
    if (lojasPermitidas.length === 1 && !lojaAtual && !loading) {
      selecionarLoja(lojasPermitidas[0].id, false);
    }
  }, [lojasPermitidas, lojaAtual, loading, selecionarLoja]);

  // Mostrar toast quando loja for selecionada
  useEffect(() => {
    if (lojaAtual) {
      toast({
        title: "Loja ativa",
        description: `Acessando: ${lojaAtual.nome} (${lojaAtual.codigo})`,
        duration: 2000
      });
    }
  }, [lojaAtual?.id]);

  // Aguardar carregamento das lojas
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Navigation Rail - Always visible */}
      <NavRail
        ref={railRef}
        isExpanded={isExpanded}
        isPinned={isPinned}
        onMouseEnter={onMouseEnterRail}
        onToggleExpand={expandPanel}
        onTogglePin={togglePin}
      />

      {/* Overlay Panel - Appears over content */}
      <NavOverlayPanel
        ref={panelRef}
        isExpanded={isExpanded}
        isPinned={isPinned}
        onMouseLeave={onMouseLeavePanel}
        onTogglePin={togglePin}
      />

      {/* Main Content Area - Adjusts when sidebar is pinned */}
      <div 
        className="flex flex-col transition-all duration-300 ease-in-out" 
        style={{ 
          marginLeft: isPinned ? '344px' : '64px', 
          width: isPinned ? 'calc(100% - 344px)' : 'calc(100% - 64px)' 
        }}
      >
        <TopBar 
          onOpenSearch={() => setSearchOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
        <main className="flex-1 px-6 pt-3 pb-6">
          <Outlet />
        </main>
      </div>

      {/* Modals & Overlays */}
      <GlobalSearch 
        open={searchOpen} 
        onOpenChange={setSearchOpen} 
      />
      
      <ShortcutsHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
        isShortcutsDisabled={isShortcutsDisabled}
        onToggleShortcuts={toggleShortcuts}
      />

      <SelecaoLojaModal
        open={modalLojaOpen}
        onOpenChange={setModalLojaOpen}
      />
    </div>
  );
}