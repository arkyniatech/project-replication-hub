import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, MapPin, TrendingUp, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function LogisticaLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("itinerario");

  useEffect(() => {
    const path = location.pathname;
    
    if (path === "/logistica" || path.includes("/logistica/itinerario")) {
      setActiveTab("itinerario");
    } else if (path.includes("/logistica/quadro")) {
      setActiveTab("quadro");
    } else if (path.includes("/logistica/produtividade")) {
      setActiveTab("produtividade");
    } else if (path.includes("/logistica/config")) {
      setActiveTab("configuracoes");
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    switch (value) {
      case "itinerario":
        navigate("/logistica/itinerario");
        break;
      case "quadro":
        navigate("/logistica/quadro");
        break;
      case "produtividade":
        navigate("/logistica/produtividade");
        break;
      case "configuracoes":
        navigate("/logistica/config");
        break;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão Logística</h2>
          <p className="text-muted-foreground">
            Controle completo de entregas, coletas e operações de campo
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="itinerario" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Itinerário</span>
          </TabsTrigger>
          <TabsTrigger value="quadro" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Quadro</span>
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Produtividade</span>
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
