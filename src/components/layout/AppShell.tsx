import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { NavRail } from "@/components/layout/NavRail";
import { NavOverlayPanel } from "@/components/layout/NavOverlayPanel";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ShortcutsHelp } from "@/components/search/ShortcutsHelp";
import { SelecaoLojaModal } from "@/components/multiunidade/SelecaoLojaModal";
import { MobileNav } from "@/components/layout/MobileNav";
import { useNavRail } from "@/hooks/useNavRail";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { enableDemoMode, disableDemoMode, isDemoEmail } from "@/lib/demoMode";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalLojaOpen, setModalLojaOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const isDemo = isDemoEmail(user?.email);

  useEffect(() => {
    if (isDemo) enableDemoMode();
    else disableDemoMode();
  }, [isDemo]);
  
  const railRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const isMdUp = !useIsMobile();
  
  const {
    isExpanded,
    isPinned,
    expandPanel,
    collapsePanel,
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

  // Mostrar toast quando loja for trocada (não em toda remontagem do shell)
  const lastNotifiedLojaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lojaAtual) return;
    const sessionKey = 'locahub:loja-toast-shown';
    const shownThisSession = sessionStorage.getItem(sessionKey);
    // Só mostra se: (a) primeira vez na sessão, OU (b) usuário trocou de loja durante a sessão
    if (shownThisSession === lojaAtual.id) return;
    if (lastNotifiedLojaRef.current === lojaAtual.id) return;
    lastNotifiedLojaRef.current = lojaAtual.id;
    sessionStorage.setItem(sessionKey, lojaAtual.id);
    toast({
      title: "Loja ativa",
      description: `Acessando: ${lojaAtual.nome} (${lojaAtual.codigo})`,
      duration: 2000
    });
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
        onMouseLeave={onMouseLeavePanel}
        onToggleExpand={togglePin}
        onTogglePin={togglePin}
      />


      {/* Overlay Panel - Appears over content */}
      <NavOverlayPanel
        ref={panelRef}
        isExpanded={isExpanded}
        isPinned={isPinned}
        onMouseLeave={onMouseLeavePanel}
        onTogglePin={togglePin}
        onCollapse={collapsePanel}
      />

      {/* Main Content Area - Adjusts when sidebar is pinned.
          #16.3: o marginLeft/width era incondicional (sempre 64px/344px),
          somado à rail "fixed" sem breakpoint — em telas pequenas isso
          forçava scroll horizontal em todo o app, inclusive nas duas telas
          desenhadas para celular (Portal do Motorista, Portal RH). Abaixo
          de md a rail não ocupa espaço (vira Sheet via MobileNav), então o
          conteúdo não deve reservar margem para ela. */}
      <div
        className="flex flex-col w-full md:w-auto transition-all duration-300 ease-in-out"
        style={{
          marginLeft: isMdUp ? (isPinned ? '344px' : '64px') : undefined,
          width: isMdUp ? (isPinned ? 'calc(100% - 344px)' : 'calc(100% - 64px)') : undefined
        }}
      >
        {isDemo && <DemoBanner />}
        <TopBar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 px-4 md:px-6 pt-3 pb-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

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