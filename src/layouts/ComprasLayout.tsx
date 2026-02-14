import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, FileText, Users, ShoppingCart, Package, Archive, Boxes, ClipboardList } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const menuItems = [
  { 
    value: 'painel', 
    label: 'Painel', 
    icon: BarChart3, 
    route: '/compras/painel' 
  },
  { 
    value: 'requisicoes', 
    label: 'Requisições', 
    icon: FileText, 
    route: '/compras/requisicoes' 
  },
  { 
    value: 'cotacoes', 
    label: 'Cotações', 
    icon: Users, 
    route: '/compras/cotacoes' 
  },
  { 
    value: 'po', 
    label: 'Pedidos', 
    icon: ShoppingCart, 
    route: '/compras/po' 
  },
  { 
    value: 'recebimento', 
    label: 'Recebimento', 
    icon: Package, 
    route: '/compras/recebimento' 
  },
  { 
    value: 'catalogo', 
    label: 'Catálogo', 
    icon: Archive, 
    route: '/compras/catalogo' 
  },
  { 
    value: 'estoque', 
    label: 'Estoque', 
    icon: Boxes, 
    route: '/compras/estoque' 
  },
  { 
    value: 'inventario', 
    label: 'Inventário', 
    icon: ClipboardList, 
    route: '/compras/inventario' 
  }
];

export default function ComprasLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    const path = location.pathname;
    
    if (path === '/compras/painel') return 'painel';
    if (path === '/compras/requisicoes') return 'requisicoes';
    if (path === '/compras/cotacoes') return 'cotacoes';
    if (path === '/compras/po') return 'po';
    if (path === '/compras/recebimento') return 'recebimento';
    if (path === '/compras/catalogo') return 'catalogo';
    if (path === '/compras/estoque') return 'estoque';
    if (path === '/compras/inventario') return 'inventario';
    
    // Default para painel
    return 'painel';
  };

  const handleTabChange = (value: string) => {
    const item = menuItems.find(item => item.value === value);
    if (item) {
      navigate(item.route);
    }
  };

  const currentTab = getCurrentTab();

  return (
    <div className="container mx-auto p-4 space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras & Estoque</h1>
          <p className="text-muted-foreground">
            Gestão completa de compras, almoxarifado e estoque
          </p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          {menuItems.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {menuItems.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-3">
            <Outlet />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}