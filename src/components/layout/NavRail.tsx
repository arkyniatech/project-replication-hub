import { forwardRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Pin,
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Settings,
  Truck
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
];

const allMenuItems = [...principalItems, ...operacaoItems, ...gestaoItems];

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
        return true; // Temporary - will add proper RBAC later for CP
      case 'logistica':
        return can('logistica:view');
      case 'manutencao':
        return can('manutencaoOS:ver');
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

  return (
    <nav
      ref={ref}
      className={cn(
        "fixed left-0 top-0 h-full w-16 bg-background border-r border-border z-40",
        "flex flex-col",
        "transition-all ease-out",
        "[transition-duration:var(--nav-transition-duration,200ms)]"
      )}
      onMouseEnter={onMouseEnter}
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
      <div className="flex-1 py-3">
        <TooltipProvider delayDuration={300}>
          {/* Spacer matching overlay "PRINCIPAL" section header */}
          <div className="h-5" />
          
          {/* Principal */}
          {principalItems.map((item) => {
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
          
          {/* Spacer matching overlay "OPERAÇÃO" section header */}
          <div className="h-5" />
          
          {/* Operação */}
          {operacaoItems.map((item) => {
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
          
          {/* Spacer matching overlay "GESTÃO" section header */}
          <div className="h-5" />
          
          {/* Gestão */}
          {gestaoItems.map((item) => {
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
        </TooltipProvider>
      </div>

      {/* Bottom Controls */}
      <div className="p-2 space-y-2 border-t border-border">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleExpand}
                className="w-12 h-12"
                aria-expanded={isExpanded}
                aria-label="Expandir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isExpanded ? 'Recolher menu' : 'Expandir menu'}
            </TooltipContent>
          </Tooltip>

          {isExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onTogglePin}
                  className={cn(
                    "w-12 h-12 transition-colors duration-200",
                    isPinned && "bg-primary/10 text-primary"
                  )}
                  aria-pressed={isPinned}
                  aria-label={isPinned ? 'Desafixar menu' : 'Fixar menu'}
                >
                  <Pin className={cn("h-5 w-5 transition-transform duration-200", isPinned && "rotate-45")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {isPinned ? 'Desafixar menu' : 'Fixar menu aberto'}
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </nav>
  );
});

NavRail.displayName = 'NavRail';