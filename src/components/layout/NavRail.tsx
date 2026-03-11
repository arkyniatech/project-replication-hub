import { forwardRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, 
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Settings,
  Truck,
  Car,
  Users2,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useRbac } from '@/hooks/useRbac';
import locacaoLogo from '@/assets/locacao-logo.png';

interface NavRailProps {
  isExpanded: boolean;
  isPinned: boolean;
  onMouseEnter: () => void;
  onToggleExpand: () => void;
  onTogglePin: () => void;
}

// Principal
const principalItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, id: "dashboard" },
  { title: "Clientes", url: "/clientes", icon: Users, id: "clientes" },
  { title: "Contratos", url: "/contratos", icon: FileText, id: "contratos" },
  { title: "Logística", url: "/logistica", icon: Truck, id: "logistica" },
  { title: "Receber", url: "/contas-receber", icon: ArrowUpCircle, id: "financeiro-receber" },
];

// Operação
const operacaoItems = [
  { title: "Equipamentos", url: "/equipamentos", icon: Wrench, id: "equipamentos" },
  { title: "Manutenção", url: "/manutencao", icon: Settings, id: "manutencao" },
  { title: "Pagar", url: "/pagar", icon: ArrowDownCircle, id: "financeiro-pagar" },
];

// Gestão
const gestaoItems = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, id: "relatorios" },
  { title: "RH", url: "/rh", icon: Users2, id: "rh" },
  { title: "Veículos", url: "/veiculos", icon: Car, id: "veiculos" },
  { title: "Compras", url: "/compras", icon: ShoppingCart, id: "compras" },
  { title: "Config", url: "/configuracoes", icon: Settings, id: "configuracoes" },
];

export const NavRail = forwardRef<HTMLElement, NavRailProps>(({
  isExpanded,
  isPinned,
  onMouseEnter,
  onToggleExpand,
  onTogglePin
}, ref) => {
  const location = useLocation();
  const { can } = useRbac();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/contas-receber") {
      return location.pathname.startsWith('/contas-receber') ||
             location.pathname.startsWith('/inadimplencia') ||
             location.pathname.startsWith('/gestao');
    }
    if (path === "/pagar") {
      return location.pathname.startsWith('/pagar');
    }
    if (path === "/logistica") {
      return location.pathname.startsWith('/logistica');
    }
    if (path === "/manutencao") {
      return location.pathname.startsWith('/manutencao');
    }
    return location.pathname.startsWith(path);
  };

  const hasAccess = (itemId: string) => {
    switch (itemId) {
      case 'financeiro-receber':
        return can('financeiro.cr:view');
      case 'financeiro-pagar':
        return true;
      case 'logistica':
        return can('logistica:view');
      case 'manutencao':
        return can('manutencaoOS:ver');
      case 'equipamentos':
        return can('equipamentos:view');
      case 'compras':
        return can('compras:view') || can('almox:view');
      default:
        return true;
    }
  };

  const getActiveIndicator = (path: string) => {
    if (isActive(path)) {
      return (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
      );
    }
    return null;
  };

  const renderSection = (items: typeof principalItems, label: string) => (
    <>
      <div className="h-[28px] flex items-end px-2 pb-1">
        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-wider leading-tight truncate w-full text-center">
          {label}
        </span>
      </div>
      {items.map((item) => {
        if (!hasAccess(item.id)) return null;
        const active = isActive(item.url);
        return (
          <div key={item.id} className="relative px-2 mb-0.5">
            {getActiveIndicator(item.url)}
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.url}
                  className={cn(
                    "flex items-center justify-center w-12 h-10 rounded-lg",
                    "transition-all ease-out [transition-duration:var(--nav-transition-duration,200ms)]",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-primary/10 text-primary"
                  )}
                  aria-label={item.title}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.title}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </>
  );

  return (
    <nav
      ref={ref}
      className={cn(
        "fixed left-0 top-0 h-full w-16 bg-background border-r border-border z-40",
        "flex flex-col",
        "transition-all ease-out",
        "[transition-duration:var(--nav-transition-duration,200ms)]"
      )}
      onClick={() => { if (!isExpanded) onToggleExpand(); }}
      aria-label="Navegação principal"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center border-b border-border">
        <img 
          src={locacaoLogo} 
          alt="LocaAção" 
          className="w-10 h-10 object-contain"
        />
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-3 overflow-y-auto custom-scrollbar">
        <TooltipProvider delayDuration={300}>
          {renderSection(principalItems, "Principal")}
          {renderSection(operacaoItems, "Operação")}
          {renderSection(gestaoItems, "Gestão")}
        </TooltipProvider>
      </div>

      {/* Bottom Controls */}
      <div className="p-2 border-t border-border">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className="w-12 h-12"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isExpanded ? 'Recolher menu' : 'Expandir menu'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </nav>
  );
});

NavRail.displayName = 'NavRail';