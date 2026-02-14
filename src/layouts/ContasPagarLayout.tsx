import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Receipt, ArrowRightLeft, BarChart3, Users } from "lucide-react";

export default function ContasPagarLayout() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const location = useLocation();
  const navigate = useNavigate();

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname;
    
    if (path === "/pagar" || path === "/pagar/dashboard") {
      setActiveTab("dashboard");
    } else if (path === "/pagar/parcelas") {
      setActiveTab("parcelas");
    } else if (path === "/financeiro/transferencias" || path === "/financeiro") {
      setActiveTab("transferencias");
    } else if (path === "/pagar/dre") {
      setActiveTab("dre");
    } else if (path === "/pagar/fornecedores") {
      setActiveTab("fornecedores");
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    switch (value) {
      case "dashboard":
        navigate("/pagar/dashboard");
        break;
      case "parcelas":
        navigate("/pagar/parcelas");
        break;
      case "transferencias":
        navigate("/financeiro/transferencias");
        break;
      case "dre":
        navigate("/pagar/dre");
        break;
      case "fornecedores":
        navigate("/pagar/fornecedores");
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Financeiro a Pagar</h1>
        <p className="text-muted-foreground">
          Gestão completa de contas a pagar, extratos e análises financeiras
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="parcelas" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Parcelas
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Extratos & Transferências
          </TabsTrigger>
          <TabsTrigger value="dre" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            DRE / Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="parcelas" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="fornecedores" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="transferencias" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="dre" className="mt-6">
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}