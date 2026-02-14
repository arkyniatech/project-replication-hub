import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, Clock, Wrench, Truck, Calculator } from "lucide-react";
import { DisponibilidadeResultado, DisponibilidadeConflito } from "@/types/disponibilidade-rt";

interface DisponibilidadeBadgeProps {
  resultado: DisponibilidadeResultado;
  className?: string;
}

export function DisponibilidadeBadge({ resultado, className }: DisponibilidadeBadgeProps) {
  const getIcon = (tipo: DisponibilidadeConflito['tipo']) => {
    switch (tipo) {
      case 'RESERVA':
        return <Clock className="w-3 h-3" />;
      case 'MANUTENCAO':
        return <Wrench className="w-3 h-3" />;
      case 'TRANSFERENCIA':
        return <Truck className="w-3 h-3" />;
      case 'CONTAGEM_CEGA':
        return <Calculator className="w-3 h-3" />;
      case 'LOCADO':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getVariant = () => {
    if (resultado.disponivel) {
      return resultado.conflitos.length > 0 ? "outline" : "default";
    }
    return "destructive";
  };

  const getBadgeText = () => {
    if (resultado.disponivel) {
      if (resultado.conflitos.length === 0) {
        return "Disponível";
      }
      return `Disponível (${resultado.conflitos.length} aviso${resultado.conflitos.length > 1 ? 's' : ''})`;
    }
    return "Conflito";
  };

  const getBadgeIcon = () => {
    if (resultado.disponivel) {
      return resultado.conflitos.length === 0 ? 
        <CheckCircle className="w-3 h-3 text-green-600" /> : 
        <AlertTriangle className="w-3 h-3 text-yellow-600" />;
    }
    return <AlertTriangle className="w-3 h-3" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className={`gap-1 ${className}`}>
            {getBadgeIcon()}
            {getBadgeText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              Status: {resultado.disponivel ? "Disponível" : "Indisponível"}
            </div>
            
            {resultado.quantidade > 0 && (
              <div className="text-sm">
                Quantidade disponível: {resultado.quantidade}
              </div>
            )}

            {resultado.conflitos.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Conflitos:</div>
                {resultado.conflitos.map((conflito, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    {getIcon(conflito.tipo)}
                    <div>
                      <div className="font-medium">{conflito.tipo.replace('_', ' ')}</div>
                      <div className="text-muted-foreground">{conflito.detalhes}</div>
                      {conflito.periodo && (
                        <div className="text-muted-foreground">
                          {new Date(conflito.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(conflito.periodo.fim).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resultado.alternativas && (
              <div className="space-y-1 pt-2 border-t">
                <div className="text-sm font-medium text-blue-600">Alternativas:</div>
                {resultado.alternativas.outrasQuantidades && resultado.alternativas.outrasQuantidades.length > 0 && (
                  <div className="text-xs">
                    Quantidade sugerida: {resultado.alternativas.outrasQuantidades[0]}
                  </div>
                )}
                {resultado.alternativas.outrosPeriodos && resultado.alternativas.outrosPeriodos.length > 0 && (
                  <div className="text-xs">
                    Períodos alternativos disponíveis
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}