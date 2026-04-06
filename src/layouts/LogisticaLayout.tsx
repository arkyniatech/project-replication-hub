import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, MapPin, TrendingUp, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { format } from "date-fns";

export default function LogisticaLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("itinerario");
  const [pendingCount, setPendingCount] = useState(0);
  const { session } = useMultiunidade();
  const lojaId = session.lojaAtivaId || '';

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

  // Fetch count of unassigned tasks for today
  useEffect(() => {
    if (!lojaId) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const fetchPending = async () => {
      const { count } = await supabase
        .from('logistica_tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', lojaId)
        .is('motorista_id', null)
        .in('status', ['PROGRAMADO', 'AGENDAR'])
        .gte('previsto_iso', `${today}T00:00:00`)
        .lte('previsto_iso', `${today}T23:59:59`);

      setPendingCount(count || 0);
    };

    fetchPending();

    // Realtime subscription
    const channel = supabase
      .channel('logistica-pending-badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'logistica_tarefas',
      }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lojaId]);

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
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] leading-none">
                {pendingCount}
              </Badge>
            )}
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
