import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useSupabaseRecebimentos } from "@/hooks/useSupabaseRecebimentos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import TitulosTab from "@/components/contas-receber/TitulosTab";
import RecebidasTab from "@/components/contas-receber/RecebidasTab";

export default function ContasReceber() {
  const [activeTab, setActiveTab] = useState("titulos");
  const { lojaAtual } = useMultiunidade();
  
  const { titulos = [] } = useSupabaseTitulos(lojaAtual?.id);
  const { recebimentos = [] } = useSupabaseRecebimentos(lojaAtual?.id);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const totalEmAberto = titulos
      .filter(t => t.status === 'EM_ABERTO' || t.status === 'PARCIAL')
      .reduce((acc, t) => acc + (t.saldo || 0), 0);

    const vencidos = titulos.filter(t => {
      const vencimento = new Date(t.vencimento);
      return vencimento < hoje && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
    }).length;

    const vencemHoje = titulos.filter(t => {
      const vencimento = new Date(t.vencimento);
      return vencimento.toDateString() === hoje.toDateString() && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
    }).length;

    const proximos7 = titulos.filter(t => {
      const vencimento = new Date(t.vencimento);
      const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
      return vencimento > hoje && vencimento <= em7Dias && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
    }).length;

    const recebidasMes = recebimentos
      .filter(r => {
        const dataRecebimento = new Date(r.data);
        return dataRecebimento >= inicioMes && dataRecebimento <= hoje;
      })
      .reduce((acc, r) => acc + (r.valor_liquido || 0), 0);

    return { totalEmAberto, vencidos, vencemHoje, proximos7, recebidasMes };
  }, [titulos, recebimentos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas a Receber</h1>
          <p className="text-muted-foreground">Gestão financeira e títulos a receber</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Aberto</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.totalEmAberto.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-xl font-bold text-foreground">{kpis.vencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-xl font-bold text-foreground">{kpis.vencemHoje}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
                <p className="text-xl font-bold text-foreground">{kpis.proximos7}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebidas (mês)</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.recebidasMes.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="titulos">Títulos (a receber)</TabsTrigger>
              <TabsTrigger value="recebidas">Recebidas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="titulos" className="mt-6">
              <TitulosTab />
            </TabsContent>
            
            <TabsContent value="recebidas" className="mt-6">
              <RecebidasTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}