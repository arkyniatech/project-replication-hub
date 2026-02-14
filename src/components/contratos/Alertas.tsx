import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";

interface AlertasProps {
  clienteBloqueado?: boolean;
  onVerDetalhesCliente: () => void;
  diasParaVencer?: number;
}

export function Alertas({
  clienteBloqueado,
  onVerDetalhesCliente,
  diasParaVencer
}: AlertasProps) {
  const showVencendoBadge = diasParaVencer !== undefined && diasParaVencer <= 7 && diasParaVencer > 0;

  if (!clienteBloqueado && !showVencendoBadge) {
    return null;
  }

  return (
    <div className="space-y-3">
      {clienteBloqueado && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-800" />
            <span className="text-sm font-medium text-amber-800">
              Cliente bloqueado por crédito — ver detalhes
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onVerDetalhesCliente}
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-100"
          >
            Ver detalhes
          </Button>
        </div>
      )}

      {showVencendoBadge && (
        <div className="flex justify-start">
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100/80">
            <Clock className="h-3 w-3 mr-1" />
            Vencendo em {diasParaVencer} dias
          </Badge>
        </div>
      )}
    </div>
  );
}