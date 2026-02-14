import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getRhMenuItems } from '../menu';
import { RhMenuItem } from '../types';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

export function RhModuleSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('rh-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('rh-sidebar-groups');
    return saved ? JSON.parse(saved) : {};
  });
  const location = useLocation();
  const navigate = useNavigate();
  const menuItems = getRhMenuItems();
  
  // Separate individual items from groups
  const individualItems = menuItems.filter(item => item.path && !item.children);
  const groupItems = menuItems.filter(item => item.children && item.children.length > 0);
  
  // Check if current path matches any item in a group
  const isGroupActive = (group: RhMenuItem): boolean => {
    return group.children?.some(child => child.path === location.pathname) || false;
  };
  
  // Check if current path matches an individual item
  const isItemActive = (item: RhMenuItem): boolean => {
    return item.path === location.pathname;
  };
  
  // Auto-expand groups that contain the active item
  const shouldAutoExpand = (groupId: string) => {
    const group = groupItems.find(g => g.id === groupId);
    return group ? isGroupActive(group) : false;
  };
  
  // Toggle group open state
  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('rh-sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Persist groups state
  useEffect(() => {
    localStorage.setItem('rh-sidebar-groups', JSON.stringify(openGroups));
  }, [openGroups]);

  // Auto-expand groups containing active items
  useEffect(() => {
    groupItems.forEach(group => {
      if (isGroupActive(group) && !openGroups[group.id]) {
        setOpenGroups(prev => ({
          ...prev,
          [group.id]: true
        }));
      }
    });
  }, [location.pathname]);

  // Get icon component
  const getIcon = (iconName: string) => {
    if (!iconName) return <LucideIcons.Circle className="h-4 w-4" />;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : <LucideIcons.Circle className="h-4 w-4" />;
  };
  
  return (
    <TooltipProvider>
      <div className={cn(
        "bg-background border-r transition-all duration-300 flex flex-col",
        isCollapsed ? "w-14" : "w-60"
      )}>
        {/* Header with toggle */}
        <div className="p-3 border-b flex items-center justify-between">
          {!isCollapsed && (
            <span className="font-semibold text-sm text-foreground">
              Navegação RH
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Menu content */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Individual menu items */}
            {individualItems.map((item) => {
              const isActive = isItemActive(item);
              const icon = getIcon(item.icon || 'Circle');
              
              const menuButton = (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left h-9",
                    isCollapsed && "justify-center px-2",
                    isActive && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => item.path && navigate(item.path)}
                >
                  {icon}
                  {!isCollapsed && (
                    <span className="ml-2 truncate">{item.label}</span>
                  )}
                </Button>
              );
              
              if (isCollapsed) {
                return (
                  <Tooltip key={item.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {menuButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
              return <div key={item.id}>{menuButton}</div>;
            })}
            
            {/* Group menu items with collapsible */}
            {groupItems.map((group) => {
              const isActive = isGroupActive(group);
              const isOpen = openGroups[group.id] ?? shouldAutoExpand(group.id);
              const icon = getIcon(group.icon || 'Circle');
              
              if (isCollapsed) {
                // In collapsed mode, show dropdown-like behavior on hover or click
                return (
                  <Tooltip key={group.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-center px-2 h-9",
                          isActive && "bg-muted text-foreground font-medium"
                        )}
                      >
                        {icon}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <div className="space-y-1 min-w-[160px]">
                        <div className="font-medium text-sm mb-2">{group.label}</div>
                        {group.children?.map((child) => (
                          <Button
                            key={child.id}
                            variant={isItemActive(child) ? "secondary" : "ghost"}
                            className="w-full justify-start text-left h-8 text-xs"
                            onClick={() => child.path && navigate(child.path)}
                          >
                            {getIcon(child.icon || 'Circle')}
                            <span className="ml-2">{child.label}</span>
                          </Button>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
              return (
                <Collapsible
                  key={group.id}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(group.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-between text-left h-9",
                        isActive && "bg-muted text-foreground font-medium"
                      )}
                    >
                      <div className="flex items-center">
                        {icon}
                        <span className="ml-2 truncate">{group.label}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1 mt-1">
                    {group.children?.map((child) => (
                      <Button
                        key={child.id}
                        variant={isItemActive(child) ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left h-8 text-sm",
                          isItemActive(child) && "bg-muted text-foreground font-medium"
                        )}
                        onClick={() => child.path && navigate(child.path)}
                      >
                        {getIcon(child.icon || 'Circle')}
                        <span className="ml-2 truncate">{child.label}</span>
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}