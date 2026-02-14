import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";

const DEV_ROLES = [
  { id: 'admin', name: 'Admin' },
  { id: 'gestor', name: 'Gestor' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'vendedor', name: 'Vendedor' },
  { id: 'mecanico', name: 'Mecânico' },
  { id: 'motorista', name: 'Motorista' },
  { id: 'rh', name: 'RH' },
];

export function DevRoleSwitcher() {
  // ⚠️ SECURITY: Só renderizar em ambiente DEV
  if (import.meta.env.PROD) {
    return null;
  }
  const [currentRole, setCurrentRole] = useState<string>('vendedor');

  useEffect(() => {
    const role = localStorage.getItem('rh-dev-profile') || 'vendedor';
    setCurrentRole(role);
  }, []);

  const handleRoleChange = (role: string) => {
    localStorage.setItem('rh-dev-profile', role);
    window.location.reload();
  };

  const getCurrentRoleName = () => {
    return DEV_ROLES.find(r => r.id === currentRole)?.name || currentRole;
  };

  return (
    <div className="flex items-center gap-3">


      <Select value={currentRole} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Perfil" />
        </SelectTrigger>
        <SelectContent>
          {DEV_ROLES.map(role => (
            <SelectItem key={role.id} value={role.id} className="text-xs">
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}