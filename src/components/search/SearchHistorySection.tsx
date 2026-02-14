import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Star, Trash2, GripVertical } from "lucide-react";
import { SearchHistoryItem, SearchFavorite } from "@/hooks/useSearchHistory";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SearchHistorySectionProps {
  recents: SearchHistoryItem[];
  favorites: SearchFavorite[];
  onRecentClick: (item: SearchHistoryItem) => void;
  onFavoriteClick: (item: SearchFavorite) => void;
  onClearRecents: () => void;
  onToggleFavorite: (item: SearchFavorite) => void;
}

export function SearchHistorySection({
  recents,
  favorites,
  onRecentClick,
  onFavoriteClick,
  onClearRecents,
  onToggleFavorite
}: SearchHistorySectionProps) {
  const formatTimestamp = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    return 'Agora';
  };

  return (
    <div className="p-4 space-y-4">
      {/* Favoritos */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-muted-foreground">Favoritos</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="group relative flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onFavoriteClick(favorite)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{favorite.titulo}</div>
                  <div className="text-xs text-muted-foreground truncate">{favorite.subtitulo}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(favorite);
                  }}
                >
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separador */}
      {favorites.length > 0 && recents.length > 0 && <Separator />}

      {/* Recentes */}
      {recents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Recentes</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar histórico</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja limpar todo o histórico de buscas recentes? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearRecents}>Limpar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="space-y-1">
            {recents.map((recent) => (
              <div
                key={`${recent.tipo}-${recent.valor}-${recent.ts}`}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onRecentClick(recent)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {recent.tipo === 'termo' ? `"${recent.valor}"` : recent.meta?.titulo || recent.valor}
                  </div>
                  {recent.meta?.subtitulo && (
                    <div className="text-xs text-muted-foreground truncate">{recent.meta.subtitulo}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {recent.tipo === 'termo' ? 'Busca' : recent.meta?.grupo || 'Item'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(recent.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem vazia */}
      {favorites.length === 0 && recents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma busca recente</p>
          <p className="text-xs">Comece a buscar por clientes, contratos ou equipamentos</p>
        </div>
      )}
    </div>
  );
}