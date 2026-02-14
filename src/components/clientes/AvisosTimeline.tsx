import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Clock, 
  Truck,
  FileText,
  CreditCard,
  CheckCircle,
  User,
  MapPin,
  Link as LinkIcon
} from "lucide-react";

interface Aviso {
  id: string;
  tipo: 'CREDITO' | 'COBRANCA' | 'LOGISTICA';
  titulo: string;
  descricao: string;
  severity: 'warning' | 'error' | 'info';
  actionLabel?: string;
  actionHandler?: () => void;
}

interface EventoTimeline {
  id: string;
  tsISO: string;
  tipo: 'CONTRATO' | 'TITULO' | 'RECEBIMENTO' | 'OS' | 'ANEXO' | 'ASSINATURA';
  refId: string;
  resumo: string;
  link?: string;
  onVerDetalhes?: () => void;
}

interface AvisosTimelineProps {
  avisos: Aviso[];
  eventos: EventoTimeline[];
}

export function AvisosTimeline({
  avisos,
  eventos
}: AvisosTimelineProps) {
  const getAvisoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CREDITO':
        return <User className="h-4 w-4" />;
      case 'COBRANCA':
        return <CreditCard className="h-4 w-4" />;
      case 'LOGISTICA':
        return <Truck className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAvisoStyle = (severity: string) => {
    const styles = {
      warning: "bg-amber-50 border-amber-200 text-amber-800",
      error: "bg-rose-50 border-rose-200 text-rose-800",
      info: "bg-blue-50 border-blue-200 text-blue-800"
    };
    return styles[severity as keyof typeof styles];
  };

  const getEventoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CONTRATO':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'TITULO':
        return <CreditCard className="h-4 w-4 text-rose-600" />;
      case 'RECEBIMENTO':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'OS':
        return <Truck className="h-4 w-4 text-amber-600" />;
      case 'ANEXO':
        return <LinkIcon className="h-4 w-4 text-slate-600" />;
      case 'ASSINATURA':
        return <User className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  const formatDateTime = (dateISO: string) => {
    const now = new Date();
    const date = new Date(dateISO);
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Agora';
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const eventosOrdenados = [...eventos].sort((a, b) => 
    new Date(b.tsISO).getTime() - new Date(a.tsISO).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Avisos */}
      {avisos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Avisos ({avisos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {avisos.map((aviso) => (
              <div 
                key={aviso.id}
                className={`p-3 rounded-lg border ${getAvisoStyle(aviso.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAvisoIcon(aviso.tipo)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">
                      {aviso.titulo}
                    </h4>
                    <p className="text-sm opacity-90 mt-1">
                      {aviso.descricao}
                    </p>
                    
                    {aviso.actionLabel && aviso.actionHandler && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={aviso.actionHandler}
                        className="mt-2 h-7 px-2 text-xs underline"
                      >
                        {aviso.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline ({eventos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {eventosOrdenados.map((evento, index) => (
                <div key={evento.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {getEventoIcon(evento.tipo)}
                    </div>
                    {index < eventosOrdenados.length - 1 && (
                      <div className="w-px h-8 bg-border mt-2" />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {evento.tipo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(evento.tsISO)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground">
                      {evento.resumo}
                    </p>
                    
                    {evento.onVerDetalhes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={evento.onVerDetalhes}
                        className="mt-1 h-6 px-2 text-xs text-primary hover:text-primary/80"
                      >
                        ver detalhes
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {eventos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum evento registrado ainda.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}