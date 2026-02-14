import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Car, Wrench, MapPin, Droplets, Building2, FileText, BarChart3, TrendingUp, Calendar, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const menuItems = [
  { 
    value: 'frota', 
    label: 'Frota', 
    icon: Car, 
    route: '/veiculos' 
  },
  { 
    value: 'lancamentos', 
    label: 'Lançamentos', 
    icon: FileText, 
    route: '/veiculos/lancamentos' 
  }
];

const cadastrosItems = [
  { 
    value: 'cadastros', 
    label: 'Cadastros', 
    icon: Car, 
    route: '/veiculos/cadastros' 
  },
  { 
    value: 'postos', 
    label: 'Postos', 
    icon: MapPin, 
    route: '/veiculos/postos' 
  },
  { 
    value: 'oleos', 
    label: 'Óleos', 
    icon: Droplets, 
    route: '/veiculos/oleos' 
  },
  { 
    value: 'oficinas', 
    label: 'Oficinas', 
    icon: Building2, 
    route: '/veiculos/oficinas' 
  },
  { 
    value: 'servicos', 
    label: 'Serviços', 
    icon: Wrench, 
    route: '/veiculos/servicos' 
  }
];

const relatoriosItems = [
  { 
    value: 'eficiencia', 
    label: 'Eficiência', 
    icon: TrendingUp, 
    route: '/veiculos/relatorios/eficiencia' 
  },
  { 
    value: 'custos', 
    label: 'Custos', 
    icon: BarChart3, 
    route: '/veiculos/relatorios/custos' 
  },
  { 
    value: 'disponibilidade', 
    label: 'Disponibilidade', 
    icon: Calendar, 
    route: '/veiculos/relatorios/disponibilidade' 
  },
  { 
    value: 'manutencoes', 
    label: 'Manutenções', 
    icon: FileText, 
    route: '/veiculos/relatorios/manutencoes' 
  }
];

const configItems = [
  { 
    value: 'configuracoes', 
    label: 'Configurações', 
    icon: Settings, 
    route: '/veiculos/configuracoes' 
  }
];

export default function VeiculosLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    const path = location.pathname;
    
    // Se é página de relatórios, retorna o tipo específico do relatório
    if (path.startsWith('/veiculos/relatorios/')) {
      return path.replace('/veiculos/relatorios/', '');
    }
    
    // Para outras páginas, verifica exatamente
    if (path === '/veiculos') return 'frota';
    if (path === '/veiculos/lancamentos') return 'lancamentos';
    if (path === '/veiculos/cadastros') return 'cadastros';
    if (path === '/veiculos/postos') return 'postos';
    if (path === '/veiculos/oleos') return 'oleos';
    if (path === '/veiculos/oficinas') return 'oficinas';
    if (path === '/veiculos/servicos') return 'servicos';
    if (path === '/veiculos/configuracoes') return 'configuracoes';
    
    // Default para frota
    return 'frota';
  };

  const getMainTab = () => {
    const path = location.pathname;
    if (path === '/veiculos') return 'frota';
    if (path === '/veiculos/lancamentos') return 'lancamentos';
    if (path.startsWith('/veiculos/relatorios/')) return 'relatorios';
    if (path === '/veiculos/configuracoes') return 'configuracoes';
    // Todas as outras páginas fazem parte de "cadastros"
    return 'cadastros';
  };

  const handleTabChange = (value: string) => {
    const allItems = [...menuItems, ...cadastrosItems, ...relatoriosItems, ...configItems];
    const item = allItems.find(item => item.value === value);
    if (item) {
      navigate(item.route);
    } else if (value === 'relatorios') {
      navigate('/veiculos/relatorios/eficiencia');
    } else if (value === 'cadastros') {
      navigate('/veiculos/cadastros');
    }
  };

  const currentTab = getCurrentTab();
  const mainTab = getMainTab();

  return (
    <div className="container mx-auto p-4 space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Veículos</h1>
          <p className="text-muted-foreground">
            Controle completo da sua frota de veículos
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="frota" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Frota
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="cadastros" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Cadastros
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frota" className="mt-3">
          <Outlet />
        </TabsContent>

        <TabsContent value="lancamentos" className="mt-3">
          <Outlet />
        </TabsContent>

        <TabsContent value="cadastros" className="mt-3">
          <div className="mb-3">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {cadastrosItems.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <Outlet />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-3">
          <div className="mb-3">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {relatoriosItems.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <Outlet />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-3">
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}