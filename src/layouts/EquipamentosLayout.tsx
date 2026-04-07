import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  FolderTree, 
  Calendar, 
  ArrowLeftRight, 
  DollarSign, 
  ClipboardCheck 
} from "lucide-react";
import { useEffect, useState } from "react";

export default function EquipamentosLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lista");

  // Determinar aba ativa baseada na rota atual
  useEffect(() => {
    const path = location.pathname;
    
    // Ignorar rotas de detalhes/edição/novo - manter "lista" ativa
    if (path.includes("/novo") || path.includes("/editar") || /\/equipamentos\/[a-f0-9-]+$/.test(path)) {
      setActiveTab("lista");
      return;
    }
    
    if (path === "/equipamentos" || path.includes("/equipamentos/lista")) {
      setActiveTab("lista");
    } else if (path.includes("/equipamentos/catalogo")) {
      setActiveTab("catalogo");
    } else if (path.includes("/equipamentos/agenda")) {
      setActiveTab("agenda");
    } else if (path.includes("/equipamentos/transferencias")) {
      setActiveTab("transferencias");
    } else if (path.includes("/equipamentos/tabela-precos")) {
      setActiveTab("tabela-precos");
    } else if (path.includes("/equipamentos/conferencia")) {
      setActiveTab("conferencia");
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    switch (value) {
      case "lista":
        navigate("/equipamentos/lista");
        break;
      case "catalogo":
        navigate("/equipamentos/catalogo");
        break;
      case "agenda":
        navigate("/equipamentos/agenda");
        break;
      case "transferencias":
        navigate("/equipamentos/transferencias");
        break;
      case "tabela-precos":
        navigate("/equipamentos/tabela-precos");
        break;
      case "conferencia":
        navigate("/equipamentos/conferencia");
        break;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Equipamentos</h2>
          <p className="text-muted-foreground">
            Controle completo do inventário, preços e movimentação de equipamentos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transferências</span>
          </TabsTrigger>
          <TabsTrigger value="tabela-precos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Preços</span>
          </TabsTrigger>
          <TabsTrigger value="conferencia" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Conferência</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
