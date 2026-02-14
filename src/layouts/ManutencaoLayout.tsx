import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Map, TrendingUp, Package, Clock, AlertTriangle, Wrench, CheckCircle, ClipboardList } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const mainTabs = [
  { 
    value: 'painel', 
    label: 'Painel', 
    icon: BarChart3, 
    route: '/manutencao' 
  },
  { 
    value: 'solicitacoes', 
    label: 'Solicitações', 
    icon: ClipboardList, 
    route: '/manutencao/solicitacoes' 
  },
  { 
    value: 'areas', 
    label: 'Áreas', 
    icon: Map, 
    route: '/manutencao/area/amarela' 
  },
  { 
    value: 'produtividade', 
    label: 'Produtividade', 
    icon: TrendingUp, 
    route: '/manutencao/produtividade' 
  },
  { 
    value: 'pedidos', 
    label: 'Pedidos', 
    icon: Package, 
    route: '/manutencao/pecas' 
  }
];

const areasSubTabs = [
  { 
    value: 'amarela', 
    label: 'Amarela', 
    icon: Clock, 
    route: '/manutencao/area/amarela',
    color: 'text-yellow-600'
  },
  { 
    value: 'vermelha', 
    label: 'Vermelha', 
    icon: AlertTriangle, 
    route: '/manutencao/area/vermelha',
    color: 'text-red-600'
  },
  { 
    value: 'azul', 
    label: 'Azul', 
    icon: Wrench, 
    route: '/manutencao/area/azul',
    color: 'text-blue-600'
  },
  { 
    value: 'verde', 
    label: 'Verde', 
    icon: CheckCircle, 
    route: '/manutencao/area/verde',
    color: 'text-green-600'
  }
];

export default function ManutencaoLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentSubTab = () => {
    const path = location.pathname;
    
    // Se é área específica, retorna a área
    if (path.startsWith('/manutencao/area/')) {
      return path.replace('/manutencao/area/', '');
    }
    
    // Default para amarela quando na aba áreas
    return 'amarela';
  };

  const getMainTab = () => {
    const path = location.pathname;
    
    if (path === '/manutencao') return 'painel';
    if (path === '/manutencao/solicitacoes') return 'solicitacoes';
    if (path.startsWith('/manutencao/area/')) return 'areas';
    if (path === '/manutencao/produtividade') return 'produtividade';
    if (path.startsWith('/manutencao/pecas/') || path.startsWith('/manutencao/os/')) return 'pedidos';
    
    // Default para painel
    return 'painel';
  };

  const handleMainTabChange = (value: string) => {
    const tab = mainTabs.find(t => t.value === value);
    if (tab) {
      navigate(tab.route);
    }
  };

  const handleSubTabChange = (value: string) => {
    const subTab = areasSubTabs.find(t => t.value === value);
    if (subTab) {
      navigate(subTab.route);
    }
  };

  const currentSubTab = getCurrentSubTab();
  const mainTab = getMainTab();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Manutenção</h1>
          <p className="text-muted-foreground">
            Controle completo do fluxo de manutenção e reparos
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="painel" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger value="areas" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Áreas
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Produtividade
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="mt-6">
          <Outlet />
        </TabsContent>

        <TabsContent value="solicitacoes" className="mt-6">
          <Outlet />
        </TabsContent>

        <TabsContent value="produtividade" className="mt-6">
          <Outlet />
        </TabsContent>

        <TabsContent value="pedidos" className="mt-6">
          <Outlet />
        </TabsContent>

        <TabsContent value="areas" className="mt-6">
          <div className="mb-6">
            <Tabs value={currentSubTab} onValueChange={handleSubTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {areasSubTabs.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}