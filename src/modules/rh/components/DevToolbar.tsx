import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAcessosStore } from '@/modules/rh/store/acessosStore';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';

export function DevToolbar() {
  if (process.env.NODE_ENV === 'production') return null;

  const { perfis, getPerfilAtivo, setPerfilAtivo } = useAcessosStore();
  const { can } = useRbacPermissions();
  const perfilAtivo = getPerfilAtivo();
  
  const handleSwitchProfile = (perfilId: string) => {
    setPerfilAtivo(perfilId);
    window.location.reload();
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Badge variant="secondary">DEV MODE</Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {perfilAtivo} ({can('rh:users') ? 'Admin' : 'User'})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {perfis.map((perfil) => (
            <DropdownMenuItem
              key={perfil.id}
              onClick={() => handleSwitchProfile(perfil.id)}
            >
              {perfil.nome}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}