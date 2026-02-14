import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, FileText, AlertTriangle, BarChart3 } from "lucide-react";

export default function ContasReceberLayout() {
  const [activeTab, setActiveTab] = useState("contas-receber");
  const location = useLocation();
  const navigate = useNavigate();

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname;
    
    if (path === "/contas-receber") {
      setActiveTab("contas-receber");
    } else if (path === "/faturamento") {
      setActiveTab("faturamento");
    } else if (path === "/inadimplencia") {
      setActiveTab("inadimplencia");
    } else if (path === "/gestao/contas-receber") {
      setActiveTab("gestao");
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    switch (value) {
      case "contas-receber":
        navigate("/contas-receber");
        break;
      case "faturamento":
        navigate("/faturamento");
        break;
      case "inadimplencia":
        navigate("/inadimplencia");
        break;
      case "gestao":
        navigate("/gestao/contas-receber");
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Financeiro a Receber</h1>
        <p className="text-muted-foreground">
          Gestão completa de contas a receber, faturamento e análises de inadimplência
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contas-receber" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="faturamento" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Faturamento
          </TabsTrigger>
          <TabsTrigger value="inadimplencia" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Inadimplência
          </TabsTrigger>
          <TabsTrigger value="gestao" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gestão Financeira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contas-receber" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="faturamento" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="inadimplencia" className="mt-6">
          <Outlet />
        </TabsContent>
        
        <TabsContent value="gestao" className="mt-6">
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}