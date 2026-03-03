import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRbac } from "@/hooks/useRbac";
import { Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  master: 'Master',
  admin: 'Admin',
  gestor: 'Gestor',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
  mecanico: 'Mecânico',
  motorista: 'Motorista',
  rh: 'RH',
};

export function DevRoleSwitcher() {
  const { perfilAtivo, isLoading } = useRbac();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const label = ROLE_LABELS[perfilAtivo] || perfilAtivo;

  return (
    <div className="flex items-center">
      <span className="px-3 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
