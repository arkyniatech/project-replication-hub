import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, RotateCcw, Calendar, User, Link2, Edit2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface VisualizarAditivoModalProps {
  aditivo: {
    id: string;
    numero: string;
    tipo: string;
    descricao: string;
    justificativa: string;
    valor: number;
    vinculacao: string;
    itemId?: string;
    status: string;
    criadoEm: string;
    criadoPor: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar?: (aditivo: any) => void;
}

export default function VisualizarAditivoModal({ aditivo, open, onOpenChange, onEditar }: VisualizarAditivoModalProps) {
  const { can } = usePermissions();

  if (!aditivo) return null;

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      RENOVACAO: "Renovação",
      DESCONTO: "Desconto",
      TAXA: "Taxa",
      AJUSTE: "Ajuste",
      OUTRO: "Outro",
    };
    return labels[tipo] || tipo;
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "RENOVACAO": return <RotateCcw className="w-5 h-5" />;
      case "DESCONTO": return <DollarSign className="w-5 h-5" />;
      case "TAXA": return <DollarSign className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTipoBgClass = (tipo: string) => {
    switch (tipo) {
      case "RENOVACAO": return "bg-primary/10 text-primary";
      case "DESCONTO": return "bg-success/15 text-success";
      case "TAXA": return "bg-warning/15 text-warning";
      case "AJUSTE": return "bg-info/15 text-info";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTipoBgClass(aditivo.tipo)}`}>
              {getTipoIcon(aditivo.tipo)}
            </div>
            <div>
              <span className="block">{aditivo.numero}</span>
              <span className="text-sm font-normal text-muted-foreground">Aditivo Contratual</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getTipoLabel(aditivo.tipo)}</Badge>
            <Badge variant={aditivo.status === "ATIVO" ? "default" : "secondary"}>{aditivo.status}</Badge>
          </div>

          {/* Valor */}
          <div className="p-4 rounded-xl bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">Valor</p>
            <p className={`text-xl font-bold ${aditivo.valor >= 0 ? "text-success" : "text-destructive"}`}>
              {aditivo.valor >= 0 ? "+" : ""}R$ {Math.abs(aditivo.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Descrição */}
          {aditivo.descricao && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground">{aditivo.descricao}</p>
            </div>
          )}

          {/* Justificativa */}
          {aditivo.justificativa && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Justificativa</p>
              <p className="text-sm text-foreground italic">{aditivo.justificativa}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(aditivo.criadoEm).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>{aditivo.criadoPor}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
              <Link2 className="w-3.5 h-3.5" />
              <span>{aditivo.vinculacao === "CONTRATO" ? "Vinculado ao contrato" : `Vinculado ao item ${aditivo.itemId}`}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {can("contratos", "editar") && onEditar && (
            <Button
              className="gap-2"
              onClick={() => {
                onOpenChange(false);
                onEditar(aditivo);
              }}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
