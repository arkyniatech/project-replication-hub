import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Wrench } from "lucide-react";
import { OSOficina } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OSTimelineProps {
  os: OSOficina;
}

export default function OSTimeline({ os }: OSTimelineProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {os.timeline.map((evento) => (
            <div key={evento.id} className="flex gap-4 pb-4 border-b last:border-b-0">
              <div className="p-2 rounded-full bg-muted">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{evento.action}</Badge>
                  <span className="text-sm text-muted-foreground">
                    por {evento.user}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(evento.ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                {evento.payload && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(evento.payload)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}