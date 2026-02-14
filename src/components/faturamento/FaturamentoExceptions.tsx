import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, AlertTriangle, Info, XCircle, Wifi } from "lucide-react";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { cn } from "@/lib/utils";

const EXCEPTION_ICONS = {
  INADIMPLENCIA_BLOQUEADA: AlertTriangle,
  ITEM_DIVERGENTE: Info,
  BOLETO_DUPLICADO: XCircle,
  BANCO_OFFLINE: Wifi
};

const EXCEPTION_VARIANTS = {
  INADIMPLENCIA_BLOQUEADA: "destructive" as const,
  ITEM_DIVERGENTE: "default" as const,
  BOLETO_DUPLICADO: "destructive" as const,
  BANCO_OFFLINE: "default" as const
};

export function FaturamentoExceptions() {
  const { exceptions, clearExceptions } = useFaturamentoStore();

  if (exceptions.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Alertas e Exceções</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearExceptions}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Limpar todos
        </Button>
      </div>

      <div className="space-y-2">
        {exceptions.map((exception, index) => {
          const Icon = EXCEPTION_ICONS[exception.tipo];
          const variant = EXCEPTION_VARIANTS[exception.tipo];

          return (
            <Alert key={index} variant={variant} className="py-3">
              <Icon className="h-4 w-4" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <AlertTitle className="text-sm font-medium">
                    {exception.titulo}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {exception.descricao}
                  </AlertDescription>
                </div>
                
                {exception.acaoRequerida && (
                  <Badge variant="outline" className="ml-4 text-xs">
                    {exception.acaoRequerida === 'JUSTIFICATIVA' && 'Justificativa necessária'}
                    {exception.acaoRequerida === 'RETRY' && 'Tentar novamente'}
                    {exception.acaoRequerida === 'CONTATO_SUPORTE' && 'Contatar suporte'}
                  </Badge>
                )}
              </div>
            </Alert>
          );
        })}
      </div>
    </div>
  );
}