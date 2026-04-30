import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, MessageCircle, FileText, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ContratoHeaderProps {
  statusContrato: 'ATIVO' | 'ENCERRADO';
  vencidoDias?: number;
  saldoAberto: number;
  saldoAtraso: number;
  onChipFinanceiro: () => void;
  onContratoPDF: () => void;
  onVerContrato: () => void;
  onEntregaPDF: () => void;
  onAssinar?: () => void; // mantido como opcional para compat (não renderiza mais botão)
  onWhatsApp: () => void;
}

export function ContratoHeader({
  statusContrato,
  vencidoDias,
  saldoAberto,
  saldoAtraso,
  onChipFinanceiro,
  onContratoPDF,
  onVerContrato,
  onEntregaPDF,
  onWhatsApp
}: ContratoHeaderProps) {
  const isMobile = useIsMobile();
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide da toolbar após 3s de inatividade (apenas desktop)
  useEffect(() => {
    if (isMobile) {
      setToolbarVisible(true);
      return;
    }

    const showAndScheduleHide = () => {
      setToolbarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setToolbarVisible(false), 3000);
    };

    showAndScheduleHide();
    window.addEventListener('mousemove', showAndScheduleHide);
    window.addEventListener('scroll', showAndScheduleHide, { passive: true });
    window.addEventListener('keydown', showAndScheduleHide);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      window.removeEventListener('mousemove', showAndScheduleHide);
      window.removeEventListener('scroll', showAndScheduleHide);
      window.removeEventListener('keydown', showAndScheduleHide);
    };
  }, [isMobile]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge 
            className={statusContrato === 'ATIVO' 
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80" 
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-100/80"
            }
          >
            {statusContrato}
          </Badge>
          
          {vencidoDias && vencidoDias > 0 && (
            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100/80">
              Vencido há {vencidoDias} dias
            </Badge>
          )}
        </div>

        <Card 
          className="cursor-pointer hover:shadow-sm transition-shadow border-primary/20 hover:border-primary/40"
          onClick={onChipFinanceiro}
        >
          <CardContent className="px-4 py-2">
            <div className="text-sm font-medium">
              Saldo aberto: R$ {saldoAberto.toLocaleString('pt-BR')} 
              {saldoAtraso > 0 && (
                <span className="text-rose-600">
                  • Em atraso: R$ {saldoAtraso.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className={`flex items-center gap-2 transition-opacity duration-300 ${
          toolbarVisible ? 'opacity-100' : 'opacity-20 hover:opacity-100'
        }`}
        onMouseEnter={() => setToolbarVisible(true)}
      >
        <TooltipProvider>
          <div className="grid grid-cols-4 gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-9 h-9 p-0"
                  onClick={onVerContrato}
                  aria-label="Ver contrato"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver contrato</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-9 h-9 p-0"
                  onClick={onContratoPDF}
                  aria-label="Baixar contrato"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Baixar contrato</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-9 h-9 p-0"
                  onClick={onEntregaPDF}
                  aria-label="Baixar entrega/devolução"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Baixar entrega/devolução</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-9 h-9 p-0"
                  onClick={onWhatsApp}
                  aria-label="Enviar por WhatsApp"
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enviar por WhatsApp</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="text-xs text-muted-foreground max-w-40 text-right">
          Ações rápidas do contrato. Os documentos refletem a versão mais recente.
        </div>
      </div>
    </div>
  );
}
