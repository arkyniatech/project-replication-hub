import { useEffect } from 'react';

export function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Validar se event.key existe antes de usar
      if (!event.key) return;
      
      if (event.key.toLowerCase() === key.toLowerCase() && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Verificar se não estamos em um input/textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback]);
}