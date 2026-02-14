import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface UseGlobalShortcutsProps {
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onOpenRenovarModal?: () => void;
  onOpenReceberModal?: () => void;
  onOpenFaturaModal?: () => void;
  onOpenDespesaModal?: () => void;
  onOpenCaixaDrawer?: () => void;
}

export function useGlobalShortcuts({ 
  onOpenSearch, 
  onOpenHelp,
  onOpenRenovarModal,
  onOpenReceberModal,
  onOpenFaturaModal,
  onOpenDespesaModal,
  onOpenCaixaDrawer
}: UseGlobalShortcutsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    return (
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.contentEditable === 'true'
    );
  }, []);

  const isShortcutsDisabled = useCallback(() => {
    return localStorage.getItem('shortcutsDisabled') === 'true';
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Sempre permitir Ctrl+/ para abrir busca
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        onOpenSearch();
        return;
      }

      // Alternativamente Ctrl+K para abrir busca
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        onOpenSearch();
        return;
      }

      // Se estiver em input ou atalhos desabilitados, não processar outros atalhos
      if (isInputFocused() || isShortcutsDisabled()) {
        return;
      }

      // Atalhos de teclas simples desabilitados por solicitação do usuário
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toast, onOpenSearch, onOpenHelp, onOpenRenovarModal, onOpenReceberModal, onOpenFaturaModal, onOpenDespesaModal, onOpenCaixaDrawer, isInputFocused, isShortcutsDisabled]);

  const toggleShortcuts = useCallback(() => {
    const currentState = isShortcutsDisabled();
    localStorage.setItem('shortcutsDisabled', (!currentState).toString());
    toast({
      title: !currentState ? "Atalhos Desabilitados" : "Atalhos Habilitados",
      description: !currentState 
        ? "Atalhos globais foram desabilitados"
        : "Atalhos globais foram habilitados"
    });
  }, [isShortcutsDisabled, toast]);

  return {
    isShortcutsDisabled: isShortcutsDisabled(),
    toggleShortcuts
  };
}