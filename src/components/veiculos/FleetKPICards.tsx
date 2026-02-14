import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fuel, Wrench, Clock, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getFleetKPIs } from "@/lib/fleet-utils";
import { useMemo } from "react";

interface FleetKPICardsProps {
  lojaId?: string;
  periodo?: { inicio: string; fim: string };
}

export function FleetKPICards({ lojaId, periodo }: FleetKPICardsProps) {
  const kpis = useMemo(() => getFleetKPIs(lojaId, periodo), [lojaId, periodo]);

  const getSemaforoIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'alerta':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'vencido':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSemaforoColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'success';
      case 'alerta':
        return 'warning';
      case 'vencido':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Próximas Trocas de Óleo */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trocas de Óleo</CardTitle>
          <Fuel className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{kpis.proximasTrocasOleo.length}</div>
            <div className="space-y-1">
              {kpis.proximasTrocasOleo.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="truncate">{item.veiculo.placa}</span>
                  <Badge 
                    variant={getSemaforoColor(item.alerta.status) as any}
                    className="w-4 h-4 p-0 flex items-center justify-center"
                  >
                    {getSemaforoIcon(item.alerta.status)}
                  </Badge>
                </div>
              ))}
              {kpis.proximasTrocasOleo.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{kpis.proximasTrocasOleo.length - 3} mais
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Veículo Mais Econômico */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mais Econômico</CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          {kpis.veiculoMaisEconomico ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-success">
                {kpis.veiculoMaisEconomico.kmPorL.toFixed(1)} km/L
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.veiculoMaisEconomico.veiculo.placa}
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.veiculoMaisEconomico.veiculo.modelo}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sem dados</div>
          )}
        </CardContent>
      </Card>

      {/* Veículo Menos Econômico */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Menos Econômico</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {kpis.veiculoMenosEconomico ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-destructive">
                {kpis.veiculoMenosEconomico.kmPorL.toFixed(1)} km/L
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.veiculoMenosEconomico.veiculo.placa}
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.veiculoMenosEconomico.veiculo.modelo}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sem dados</div>
          )}
        </CardContent>
      </Card>

      {/* Maior Custo de Manutenção */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maior Custo</CardTitle>
          <Wrench className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          {kpis.maiorCustoManutencao ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-warning">
                R$ {kpis.maiorCustoManutencao.custo.total.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.maiorCustoManutencao.veiculo.placa}
              </div>
              <div className="text-xs text-muted-foreground">
                R$ {kpis.maiorCustoManutencao.custo.porKm.toFixed(2)}/km
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sem dados</div>
          )}
        </CardContent>
      </Card>

      {/* Maior Tempo Parado */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maior Parada</CardTitle>
          <Clock className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {kpis.maiorTempoOficina ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-destructive">
                {Math.round(kpis.maiorTempoOficina.tempoHoras / 24)}d
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.maiorTempoOficina.veiculo.placa}
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.maiorTempoOficina.tempoHoras}h total
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sem dados</div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resumo Geral</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="text-lg font-bold text-success">
                {kpis.percentualPreventivaEmDia.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Preventiva em dia</div>
            </div>
            {periodo && (
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  R$ {kpis.custoTotalFrota.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Custo no período</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}