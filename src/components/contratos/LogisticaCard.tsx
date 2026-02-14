import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Truck } from "lucide-react";

interface ProximaAcao {
  label: string;
  dateISO?: string;
}

interface LogisticaCardProps {
  proximaAcao?: ProximaAcao;
  statusOS?: 'PLANEJADA' | 'EM_ROTA' | 'CONCLUIDA';
  onAbrirOS: () => void;
  onReagendar: () => void;
}

export function LogisticaCard({
  proximaAcao,
  statusOS,
  onAbrirOS,
  onReagendar
}: LogisticaCardProps) {
  const getStatusOSBadge = (status?: LogisticaCardProps['statusOS']) => {
    if (!status) return null;
    
    const variants = {
      PLANEJADA: "bg-amber-100 text-amber-700",
      EM_ROTA: "bg-indigo-100 text-indigo-700", 
      CONCLUIDA: "bg-emerald-100 text-emerald-700"
    };
    
    const labels = {
      PLANEJADA: "Planejada",
      EM_ROTA: "Em Rota",
      CONCLUIDA: "Concluída"
    };
    
    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formatDateTime = (dateISO: string) => {
    const date = new Date(dateISO);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const timeStr = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (isToday) {
      return `hoje • ${timeStr}`;
    }
    
    return `${date.toLocaleDateString('pt-BR')} • ${timeStr}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Logística
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {proximaAcao ? proximaAcao.label : "—"}
              </span>
            </div>
            {proximaAcao?.dateISO && (
              <p className="text-sm text-muted-foreground">
                {formatDateTime(proximaAcao.dateISO)}
              </p>
            )}
          </div>
          
          {statusOS && (
            <div>
              {getStatusOSBadge(statusOS)}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onAbrirOS}
            className="flex-1"
          >
            Abrir OS
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReagendar}
            className="flex-1"
          >
            Reagendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}