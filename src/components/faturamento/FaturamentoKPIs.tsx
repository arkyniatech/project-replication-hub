import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { formatCurrency } from "@/lib/utils";

export function FaturamentoKPIs() {
  const { kpis } = useFaturamentoStore();

  const formatValue = (value: number) => {
    return formatCurrency(value);
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      {/* Selecionados */}
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Selecionados:</span>
        <Badge variant="default" className="font-medium">
          {formatValue(kpis.selecionados)}
        </Badge>
      </div>

      {/* Em atraso */}
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-destructive" />
        <span className="text-muted-foreground">Em atraso do cliente:</span>
        <Badge variant="destructive" className="font-medium">
          {formatValue(kpis.emAtraso)}
        </Badge>
      </div>

      {/* Próximos 7 dias */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-warning" />
        <span className="text-muted-foreground">Próx. 7 dias:</span>
        <Badge variant="secondary" className="font-medium">
          {formatValue(kpis.proximos7Dias)}
        </Badge>
      </div>

      {/* Último pagamento */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-success" />
        <span className="text-muted-foreground">Último pagamento:</span>
        <Badge variant="outline" className="font-medium">
          {kpis.ultimoPagamento || "—"}
        </Badge>
      </div>
    </div>
  );
}