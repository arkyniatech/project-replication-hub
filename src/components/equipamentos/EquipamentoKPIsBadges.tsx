import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Activity, DollarSign, Calendar } from "lucide-react";
import { formatMoney } from "@/lib/equipamentos-utils";

interface EquipamentoKPIsBadgesProps {
  receitaAcumulada?: number;
  margemAcumulada?: number;
  vezesLocado?: number;
  taxaOcupacaoUltimoMes?: number;
  diasOciosoUltimoMes?: number;
}

export function EquipamentoKPIsBadges({
  receitaAcumulada = 0,
  margemAcumulada = 0,
  vezesLocado = 0,
  taxaOcupacaoUltimoMes = 0,
  diasOciosoUltimoMes = 0,
}: EquipamentoKPIsBadgesProps) {
  // Se não há dados, não mostrar nada
  if (receitaAcumulada === 0 && vezesLocado === 0) {
    return null;
  }

  const getOcupacaoColor = (taxa: number) => {
    if (taxa >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (taxa >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getMargemColor = (margem: number) => {
    if (margem > 0) return "text-green-600 bg-green-50 border-green-200";
    if (margem === 0) return "text-gray-600 bg-gray-50 border-gray-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {receitaAcumulada > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs gap-1">
                <DollarSign className="h-3 w-3" />
                {formatMoney(receitaAcumulada)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Receita Acumulada</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {vezesLocado > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs gap-1">
                <Activity className="h-3 w-3" />
                {vezesLocado}x
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Vezes Locado</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {taxaOcupacaoUltimoMes > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className={`text-xs gap-1 ${getOcupacaoColor(taxaOcupacaoUltimoMes)}`}
              >
                <Calendar className="h-3 w-3" />
                {taxaOcupacaoUltimoMes.toFixed(0)}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Taxa de Ocupação (últimos 30 dias)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {margemAcumulada !== 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className={`text-xs gap-1 ${getMargemColor(margemAcumulada)}`}
              >
                {margemAcumulada > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatMoney(Math.abs(margemAcumulada))}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {margemAcumulada > 0 ? 'Margem Positiva' : 'Margem Negativa'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
