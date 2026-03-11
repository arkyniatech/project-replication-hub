import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface UseNavRailReturn {
  isExpanded: boolean;
  isPinned: boolean;
  lastInteractionAt: number;
  expandPanel: () => void;
  collapsePanel: () => void;
  togglePin: () => void;
  onMouseEnterRail: () => void;
  onMouseLeavePanel: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

interface UseNavRailProps {
  railRef?: React.RefObject<HTMLElement>;
  panelRef?: React.RefObject<HTMLElement>;
}

const INACTIVITY_TIMEOUT = 1500; // 1.5 segundos
const MOUSE_LEAVE_DELAY = 300; // 300ms

// Detectar preferência por animações reduzidas
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Duração das animações baseada na preferência do usuário
export const getAnimationDuration = () => {
  return prefersReducedMotion() ? 100 : 200;
};

export function useNavRail({ railRef, panelRef }: UseNavRailProps = {}): UseNavRailReturn {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    return localStorage.getItem('nav_pinned') === 'true';
  });
  const [lastInteractionAt, setLastInteractionAt] = useState(Date.now());
  
  const inactivityTimer = useRef<NodeJS.Timeout>();
  const mouseLeaveTimer = useRef<NodeJS.Timeout>();

  // Persistir estado do pin
  useEffect(() => {
    localStorage.setItem('nav_pinned', isPinned.toString());
  }, [isPinned]);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = undefined;
    }
  }, []);

  const clearMouseLeaveTimer = useCallback(() => {
    if (mouseLeaveTimer.current) {
      clearTimeout(mouseLeaveTimer.current);
      mouseLeaveTimer.current = undefined;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (!isPinned) {
      inactivityTimer.current = setTimeout(() => {
        setIsExpanded(false);
      }, INACTIVITY_TIMEOUT);
    }
  }, [isPinned, clearInactivityTimer]);

  const expandPanel = useCallback(() => {
    setIsExpanded(true);
    setIsPinned(true);
    localStorage.setItem('nav_pinned', 'true');
    setLastInteractionAt(Date.now());
    clearMouseLeaveTimer();
  }, [clearMouseLeaveTimer]);

  const collapsePanel = useCallback(() => {
    setIsExpanded(false);
    setIsPinned(false);
    localStorage.setItem('nav_pinned', 'false');
    clearInactivityTimer();
    clearMouseLeaveTimer();
  }, [clearInactivityTimer, clearMouseLeaveTimer]);

  const togglePin = useCallback(() => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      expandPanel();
    } else {
      startInactivityTimer();
    }
  }, [isPinned, expandPanel, startInactivityTimer]);

  const onMouseEnterRail = useCallback(() => {
    expandPanel();
  }, [expandPanel]);

  const onMouseLeavePanel = useCallback(() => {
    clearMouseLeaveTimer();
    if (!isPinned) {
      mouseLeaveTimer.current = setTimeout(() => {
        collapsePanel();
      }, MOUSE_LEAVE_DELAY);
    }
  }, [isPinned, collapsePanel, clearMouseLeaveTimer]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isExpanded) {
      collapsePanel();
    }
  }, [isExpanded, collapsePanel]);

  // Gerenciar eventos globais para inatividade
  useEffect(() => {
    const handleGlobalInteraction = (e: Event) => {
      const target = e.target as Element;
      const isInsideNav = railRef.current?.contains(target) || panelRef.current?.contains(target);
      
      if (isInsideNav) {
        // Mouse dentro do menu - cancelar timer de inatividade
        clearInactivityTimer();
        clearMouseLeaveTimer();
      } else {
        // Mouse fora do menu - iniciar timer de inatividade
        setLastInteractionAt(Date.now());
        startInactivityTimer();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      onKeyDown(e);
      // Para teclado, sempre cancelar timers se estiver expandido
      if (isExpanded) {
        clearInactivityTimer();
        clearMouseLeaveTimer();
      }
    };

    document.addEventListener('mousemove', handleGlobalInteraction);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleGlobalInteraction);

    return () => {
      document.removeEventListener('mousemove', handleGlobalInteraction);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleGlobalInteraction);
      clearInactivityTimer();
      clearMouseLeaveTimer();
    };
  }, [onKeyDown, startInactivityTimer, clearInactivityTimer, clearMouseLeaveTimer, isExpanded]);

  // Event listeners específicos para o painel
  useEffect(() => {
    const panelElement = panelRef?.current;
    
    if (!panelElement) return;

    const handlePanelMouseEnter = () => {
      clearInactivityTimer();
      clearMouseLeaveTimer();
    };

    const handlePanelMouseMove = () => {
      clearInactivityTimer();
      clearMouseLeaveTimer();
    };

    panelElement.addEventListener('mouseenter', handlePanelMouseEnter);
    panelElement.addEventListener('mousemove', handlePanelMouseMove);

    return () => {
      panelElement.removeEventListener('mouseenter', handlePanelMouseEnter);
      panelElement.removeEventListener('mousemove', handlePanelMouseMove);
    };
  }, [panelRef, clearInactivityTimer, clearMouseLeaveTimer]);

  // Aplicar classe CSS dinâmica baseada na preferência de animação
  useEffect(() => {
    const updateAnimationPreference = () => {
      const root = document.documentElement;
      if (prefersReducedMotion()) {
        root.style.setProperty('--nav-transition-duration', '100ms');
      } else {
        root.style.setProperty('--nav-transition-duration', '200ms');
      }
    };

    // Aplicar na inicialização
    updateAnimationPreference();

    // Escutar mudanças na preferência
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', updateAnimationPreference);

    return () => {
      mediaQuery.removeEventListener('change', updateAnimationPreference);
    };
  }, []);

  return {
    isExpanded,
    isPinned,
    lastInteractionAt,
    expandPanel,
    collapsePanel,
    togglePin,
    onMouseEnterRail,
    onMouseLeavePanel,
    onKeyDown,
  };
}