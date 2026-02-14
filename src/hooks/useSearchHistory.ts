import { useState, useEffect, useCallback } from 'react';

export interface SearchHistoryItem {
  id: string;
  tipo: 'termo' | 'item';
  valor: string;
  meta?: {
    grupo: string;
    id: string;
    titulo: string;
    subtitulo: string;
  };
  ts: number;
}

export interface SearchFavorite {
  id: string;
  tipo: 'acao' | 'item';
  titulo: string;
  subtitulo: string;
  grupo: string;
  meta: any;
  ts: number;
}

const MAX_RECENTS = 10;
const MAX_FAVORITES = 12;

export function useSearchHistory(userId: string = 'admin') {
  const [recents, setRecents] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<SearchFavorite[]>([]);

  const recentsKey = `searchRecent_${userId}`;
  const favoritesKey = `searchFav_${userId}`;

  // Carregar dados do localStorage
  useEffect(() => {
    try {
      const storedRecents = localStorage.getItem(recentsKey);
      if (storedRecents) {
        setRecents(JSON.parse(storedRecents));
      }

      const storedFavorites = localStorage.getItem(favoritesKey);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de busca:', error);
    }
  }, [recentsKey, favoritesKey]);

  // Adicionar termo ao histórico
  const addToRecents = useCallback((item: Omit<SearchHistoryItem, 'ts'>) => {
    setRecents(prev => {
      // Evitar duplicatas consecutivas
      const filtered = prev.filter(r => 
        !(r.tipo === item.tipo && r.valor === item.valor)
      );
      
      const newItem = { ...item, ts: Date.now() };
      const updated = [newItem, ...filtered].slice(0, MAX_RECENTS);
      
      localStorage.setItem(recentsKey, JSON.stringify(updated));
      return updated;
    });
  }, [recentsKey]);

  // Limpar recentes
  const clearRecents = useCallback(() => {
    setRecents([]);
    localStorage.removeItem(recentsKey);
  }, [recentsKey]);

  // Verificar se item está nos favoritos
  const isFavorite = useCallback((id: string) => {
    return favorites.some(fav => fav.id === id);
  }, [favorites]);

  // Toggle favorito
  const toggleFavorite = useCallback((item: Omit<SearchFavorite, 'ts'>) => {
    setFavorites(prev => {
      const existing = prev.find(fav => fav.id === item.id);
      
      let updated: SearchFavorite[];
      if (existing) {
        // Remover
        updated = prev.filter(fav => fav.id !== item.id);
      } else {
        // Adicionar
        if (prev.length >= MAX_FAVORITES) {
          updated = [...prev.slice(0, MAX_FAVORITES - 1), { ...item, ts: Date.now() }];
        } else {
          updated = [...prev, { ...item, ts: Date.now() }];
        }
      }
      
      localStorage.setItem(favoritesKey, JSON.stringify(updated));
      return updated;
    });
  }, [favoritesKey]);

  // Reordenar favoritos
  const reorderFavorites = useCallback((newOrder: SearchFavorite[]) => {
    setFavorites(newOrder);
    localStorage.setItem(favoritesKey, JSON.stringify(newOrder));
  }, [favoritesKey]);

  return {
    recents,
    favorites,
    addToRecents,
    clearRecents,
    isFavorite,
    toggleFavorite,
    reorderFavorites
  };
}