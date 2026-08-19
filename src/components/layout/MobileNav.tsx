import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  Truck,
  Car,
  Users2,
  ShoppingCart,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/usePermissions';
import { useRbac } from '@/hooks/useRbac';
import { APP_CONFIG } from '@/config/app';
import locacaoLogo from '@/assets/locacao-logo.png';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const principalItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Financeiro a Receber", url: "/contas-receber", icon: ArrowUpCircle }
];

const operacaoItems = [
  { title: "Equipamentos", url: "/equipamentos", icon: Wrench },
  { title: "Manutenção", url: "/manutencao", icon: Settings },
  { title: "Financeiro a Pagar", url: "/pagar", icon: ArrowDownCircle }
];

const gestaoItems = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Recursos Humanos", url: "/rh", icon: Users2 },
  { title: "Veículos", url: "/veiculos", icon: Car },
  { title: "Compras & Estoque", url: "/compras", icon: ShoppingCart },
  { title: "Configurações", url: "/configuracoes", icon: Settings }
];

// #16.3: mesma lista/regra de acesso do NavOverlayPanel (desktop), mas sem a
// mecânica de hover/pin — em touch não existe mouseenter, então o painel de
// desktop nunca teria como abrir num celular. O Sheet fecha ao navegar,
// como um drawer mobile deve se comportar.
export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const location = useLocation();
  const { can } = usePermissions();
  const rbac = useRbac();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/contas-receber") {
      return location.pathname.startsWith('/contas-receber') ||
             location.pathname.startsWith('/inadimplencia') ||
             location.pathname.startsWith('/gestao');
    }
    if (path === "/pagar") return location.pathname.startsWith('/pagar');
    if (path === "/logistica") return location.pathname.startsWith('/logistica');
    if (path === "/manutencao") return location.pathname.startsWith('/manutencao');
    return location.pathname.startsWith(path);
  };

  const getNavClass = (path: string) =>
    isActive(path)
      ? "bg-primary/10 text-primary font-medium"
      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground";

  const hasFinanceiroAccess = can('financeiro', 'ver');
  const hasPagarAccess = can('financeiro', 'ver') || can('inadimplencia', 'ver');
  const hasLogisticaAccess = can('logistica', 'ver');
  const hasEquipamentosAccess = rbac.can('equipamentos:view');
  const hasComprasAccess = rbac.can('compras:view') || rbac.can('almox:view');

  const renderItem = (item: typeof principalItems[number]) => (
    <div key={item.title} className="px-3 mb-0.5">
      <NavLink
        to={item.url}
        onClick={() => onOpenChange(false)}
        className={cn(
          "flex items-center px-3 h-11 rounded-md transition-all duration-200 text-sm",
          getNavClass(item.url)
        )}
      >
        <item.icon className={cn(
          "mr-3 h-5 w-5 shrink-0",
          isActive(item.url) ? "text-primary" : "text-muted-foreground"
        )} />
        <span>{item.title}</span>
      </NavLink>
    </div>
  );

  const renderSection = (items: typeof principalItems, label: string, filter: (title: string) => boolean) => {
    const visible = items.filter(item => filter(item.title));
    if (visible.length === 0) return null;
    return (
      <div className="mt-1">
        <div className="h-[28px] flex items-end px-6 pb-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">
            {label}
          </span>
        </div>
        <div>{visible.map(renderItem)}</div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="h-16 px-6 flex-row items-center border-b border-border/40 space-y-0">
          <Link
            to="/"
            aria-label="Ir para página inicial"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <img src={locacaoLogo} alt="LocaAção" className="w-5 h-5 object-contain" />
            </div>
            <SheetTitle className="text-sm font-bold tracking-tight">
              {APP_CONFIG.system.name}
            </SheetTitle>
          </Link>
          <SheetDescription className="sr-only">Menu de navegação principal</SheetDescription>
        </SheetHeader>

        <nav aria-label="Navegação principal (mobile)" className="flex-1 overflow-y-auto py-3">
          {renderSection(principalItems, "Principal", (title) => {
            if (title === "Logística") return hasLogisticaAccess;
            if (title === "Financeiro a Receber") return hasFinanceiroAccess;
            return true;
          })}
          {renderSection(operacaoItems, "Operação", (title) => {
            if (title === "Equipamentos") return hasEquipamentosAccess;
            if (title === "Financeiro a Pagar") return hasPagarAccess;
            return true;
          })}
          {renderSection(gestaoItems, "Gestão", (title) => {
            if (title === "Compras & Estoque") return hasComprasAccess;
            return true;
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
