import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { useRbac } from '@/hooks/useRbac';
import { useAcessosStore } from '@/modules/rh/store/acessosStore';
import { Shield, User, Settings } from 'lucide-react';

export function DevRbacSwitcher() {
  const { perfilAtivo, claimsAtivas } = useRbac();
  const { perfis } = useAcessosStore();
  const [isOpen, setIsOpen] = useState(false);

  // Só mostrar em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const perfilAtual = perfis.find(p => p.id === perfilAtivo);

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            <Shield className="h-4 w-4" />
            <span className="font-mono text-xs">{perfilAtivo}</span>
            <Badge variant="secondary" className="text-xs">
              {claimsAtivas.length}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-yellow-600" />
              <span className="font-semibold text-sm">Dev RBAC Switcher</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Perfil atual: <span className="font-mono">{perfilAtual?.nome}</span>
            </p>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {perfis.filter(p => p.sistema).map(perfil => (
              <DropdownMenuItem
                key={perfil.id}
                onClick={() => {
                  console.log('RBAC Switch to:', perfil.id);
                  setIsOpen(false);
                }}
                className={`cursor-pointer ${
                  perfil.id === perfilAtivo ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <User className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{perfil.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {perfil.claims.length} claims
                    </div>
                  </div>
                  {perfil.id === perfilAtivo && (
                    <Badge variant="default" className="text-xs">
                      Ativo
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          
          <DropdownMenuSeparator />
          
          <div className="p-2">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Claims Ativas:</div>
              <div className="max-h-20 overflow-y-auto">
                {claimsAtivas.length === 0 ? (
                  <span className="text-muted-foreground">Nenhuma claim</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {claimsAtivas.slice(0, 8).map(claim => (
                      <Badge 
                        key={claim} 
                        variant="outline" 
                        className="text-xs font-mono"
                      >
                        {claim}
                      </Badge>
                    ))}
                    {claimsAtivas.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{claimsAtivas.length - 8}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}