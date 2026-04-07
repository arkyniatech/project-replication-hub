import { Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ContagemSessao } from "@/hooks/useSupabaseConferencia";

interface SessionDisplayChipProps {
  sessao: ContagemSessao;
  showCopyButton?: boolean;
  variant?: "default" | "outline";
}

export function SessionDisplayChip({
  sessao,
  showCopyButton = true,
  variant = "outline"
}: SessionDisplayChipProps) {
  const { toast } = useToast();

  const displayText = sessao.displayNo || sessao.id;
  const isLegacy = !sessao.displayNo;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    toast({
      title: "Copiado",
      description: "Número da sessão copiado para a área de transferência"
    });
  };

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <div><strong>ID interno:</strong> {sessao.id}</div>
      {sessao.displayNo && (
        <div><strong>Número amigável:</strong> {sessao.displayNo}</div>
      )}
      <div><strong>Criada por:</strong> {sessao.criadaPor.nome}</div>
      <div>
        <strong>Criada em:</strong>{' '}
        {format(new Date(sessao.criadaEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={variant}
              className={`font-mono text-xs px-2 py-1 ${
                isLegacy ? 'bg-amber-100 text-amber-800 border-amber-300' : ''
              }`}
            >
              {displayText}
              {isLegacy && <Info className="w-3 h-3 ml-1" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showCopyButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
          title="Copiar número da sessão"
        >
          <Copy className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
