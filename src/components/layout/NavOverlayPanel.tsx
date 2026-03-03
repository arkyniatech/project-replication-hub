import { forwardRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Truck,
  Car,
  Users2,
  ChevronDown,
  Pin,
  Package,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePermissions } from '@/hooks/usePermissions';
import { useRbac } from '@/hooks/useRbac';
import { APP_CONFIG } from '@/config/app';
import locacaoLogo from '@/assets/locacao-logo.png';

interface NavOverlayPanelProps {
  isExpanded: boolean;
  isPinned: boolean;
  onMouseLeave: () => void;
  onTogglePin: () => void;
  className?: string;
}

// PRINCIPAL
const principalItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Financeiro a Receber", url: "/contas-receber", icon: CreditCard }
];

// OPERAÇÃO
const operacaoItems = [
  { title: "Equipamentos", url: "/equipamentos", icon: Wrench },
  { title: "Manutenção", url: "/manutencao", icon: Settings },
  { title: "Financeiro a Pagar", url: "/pagar", icon: CreditCard }
];

// GESTÃO
const gestaoItems = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Recursos Humanos", url: "/rh", icon: Users2 },
  { title: "Veículos", url: "/veiculos", icon: Car },
  { title: "Compras & Estoque", url: "/compras", icon: ShoppingCart },
  { title: "Configurações", url: "/configuracoes", icon: Settings }
];

export const NavOverlayPanel = forwardRef<HTMLElement, NavOverlayPanelProps>(({
  isExpanded,
  isPinned,
  onMouseLeave,
  onTogglePin,
  className
}, ref) => {
  const location = useLocation();
  const { can } = usePermissions();
  const rbac = useRbac();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
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
  const hasVeiculosAccess = true;
  const hasRhAccess = true;

  const renderMenuItem = (item: any) => {
    if (item.items) {
      let hasAccess = true;
      if (item.title === "Logística") hasAccess = hasLogisticaAccess;
      if (item.title === "Equipamentos") hasAccess = hasEquipamentosAccess;
      if (item.title === "Compras & Estoque") hasAccess = hasComprasAccess;
      if (item.title === "Veículos") hasAccess = hasVeiculosAccess;
      if (!hasAccess) return null;

      const isOpen = item.items.some((sub: any) => isActive(sub.url));

      return (
        <Collapsible key={item.title} defaultOpen={isOpen} className="group/collapsible">
          <div className="px-3 py-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start px-3 h-10 text-sm font-medium",
                  isOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="mr-3 h-4 w-4 shrink-0 text-muted-foreground group-hover/collapsible:text-primary transition-colors" />
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 opacity-50" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-9 mt-1 space-y-1 pl-1 border-l border-border/50">
                {item.items.map((subitem: any) => {
                  if (subitem.claim && !rbac.can(subitem.claim)) return null;

                  if (subitem.requiresPermission && subitem.roles) {
                    // ... legacy check logic kept as is for safety
                    const hasSubitemAccess = subitem.roles.some((role: string) => {
                      switch (role) {
                        case "admin": return can('configuracoes', 'gerirConfiguracoes');
                        case "gerente": return can('logistica', 'ver') || can('financeiro', 'ver');
                        default: return false;
                      }
                    });
                    if (!hasSubitemAccess) return null;
                  }

                  return (
                    <NavLink
                      key={subitem.title}
                      to={subitem.url}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200",
                        getNavClass(subitem.url)
                      )}
                    >
                      {subitem.title}
                    </NavLink>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    return (
      <div key={item.title} className="px-3 py-1">
        <NavLink
          to={item.url}
          className={cn(
            "flex items-center px-3 py-2.5 rounded-md transition-all duration-200 text-sm group",
            getNavClass(item.url)
          )}
        >
          <item.icon className={cn(
            "mr-3 h-4 w-4 shrink-0 transition-colors",
            isActive(item.url) ? "text-primary" : "text-muted-foreground group-hover:text-primary"
          )} />
          <span>{item.title}</span>
        </NavLink>
      </div>
    );
  };

  const renderMenuSection = (items: any[], sectionName: string, isFirst: boolean = false) => {
    return (
      <div className={cn(!isFirst && "mt-2")}>
        <div className="px-6 py-1 text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider leading-tight">
          {sectionName}
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            if (item.title === "Logística" && !hasLogisticaAccess) return null;
            if (item.title === "Equipamentos" && !hasEquipamentosAccess) return null;
            if (item.title === "Compras & Estoque" && !hasComprasAccess) return null;
            if (item.title === "Veículos" && !hasVeiculosAccess) return null;
            if (item.title === "Recursos Humanos" && !hasRhAccess) return null;
            if (item.title === "Financeiro a Receber" && !hasFinanceiroAccess) return null;
            if (item.title === "Financeiro a Pagar" && !hasPagarAccess) return null;

            return renderMenuItem(item);
          })}
        </div>
      </div>
    );
  };

  if (!isExpanded) return null;

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed left-16 top-0 bottom-0 bg-background/95 backdrop-blur-xl", // Changed top-16 to top-0 to align with NavRail
        "border-r border-border shadow-2xl z-50 flex flex-col",
        "transition-all ease-cubic-bezier(0.4, 0, 0.2, 1) duration-300",
        isExpanded ? "translate-x-0 opacity-100 shadow-[10px_0_30px_-10px_rgba(0,0,0,0.1)]" : "-translate-x-4 opacity-0 pointer-events-none",
        className
      )}
      onMouseLeave={onMouseLeave}
      style={{ width: '280px' }}
    >
      {/* Header - Height 64px to match TopBar/NavRail header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border/40 shrink-0 bg-background/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <img
              src={locacaoLogo}
              alt="LocaAção"
              className="w-5 h-5 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">{APP_CONFIG.system.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Sistema de Gestão</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0 custom-scrollbar">
        {renderMenuSection(principalItems, "Principal", true)}
        {renderMenuSection(operacaoItems, "Operação")}
        {renderMenuSection(gestaoItems, "Gestão")}
      </div>

      {/* Footer / Pin */}
      <div className="p-4 border-t border-border/40 bg-muted/5 mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground pl-2">
            {isPinned ? "Menu fixado" : "Fixar menu"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            className={cn(
              "h-8 w-8 p-0 hover:bg-background hover:shadow-sm transition-all",
              isPinned ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
          >
            <Pin className={cn("h-4 w-4 transition-transform duration-200", isPinned && "rotate-45")} />
          </Button>
        </div>
      </div>
    </aside>
  );
});

NavOverlayPanel.displayName = 'NavOverlayPanel';