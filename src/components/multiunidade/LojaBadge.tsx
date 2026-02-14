import { useState } from 'react';
import { Building2, ChevronDown, Check, AlertCircle, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMultiunidade } from '@/hooks/useMultiunidade';

interface Loja {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

export function LojaBadge() {
  const { lojaAtual, lojasPermitidas, trocarLoja, loading } = useMultiunidade();
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lojaParaTrocar, setLojaParaTrocar] = useState<Loja | null>(null);

  // Não renderizar enquanto está carregando
  if (loading) return null;
  
  // Se não há loja atual mas há lojas permitidas, mostrar a primeira
  const lojaDisplay = lojaAtual || lojasPermitidas[0];
  
  if (!lojaDisplay) return null;

  const lojasFiltradas = lojasPermitidas
    .filter(loja => loja.id !== lojaDisplay?.id)
    .filter(loja => 
      loja.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loja.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleTrocarLoja = (loja: Loja) => {
    setLojaParaTrocar(loja);
    setShowConfirm(true);
  };

  const confirmarTrocaLoja = () => {
    if (lojaParaTrocar) {
      trocarLoja(lojaParaTrocar.id);
    }
    setShowConfirm(false);
    setLojaParaTrocar(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            className="flex items-center gap-2 px-3 py-2 h-auto rounded-full"
          >
            <Building2 className="h-4 w-4" />
            <span className="font-medium">{lojaDisplay.codigo}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg z-[100]"
          sideOffset={5}
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Trocar Unidade
          </DropdownMenuLabel>
          
          <div className="px-2 py-1">
            <Input
              placeholder="Buscar por nome ou apelido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          
          <DropdownMenuSeparator />
          
          <div className="max-h-48 overflow-y-auto">
            {lojasPermitidas.length <= 1 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                Você só tem acesso a esta unidade
              </div>
            ) : lojasFiltradas.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                Nenhuma loja encontrada
              </div>
            ) : (
              lojasFiltradas.map((loja) => (
                <DropdownMenuItem
                  key={loja.id}
                  onClick={() => handleTrocarLoja(loja)}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                >
                  <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{loja.nome}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Código: {loja.codigo}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3" />
              <span>Atual: {lojaDisplay.nome}</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Troca de Unidade
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a trocar para a loja <strong>{lojaParaTrocar?.nome} ({lojaParaTrocar?.codigo})</strong>.
              <br /><br />
              Os dados da tela atual podem ser alterados e você visualizará apenas as informações desta nova unidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarTrocaLoja}>
              Confirmar Troca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}