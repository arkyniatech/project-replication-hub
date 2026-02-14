import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface JustificativaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (texto: string) => void;
  title: string;
  subtitle: string;
  placeholder: string;
}

export function JustificativaModal({
  open,
  onClose,
  onSave,
  title,
  subtitle,
  placeholder
}: JustificativaModalProps) {
  const [texto, setTexto] = useState("");

  const handleSave = () => {
    if (!texto.trim()) return;
    onSave(texto.trim());
    setTexto("");
    onClose();
  };

  const handleClose = () => {
    setTexto("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>

          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa</Label>
            <Textarea
              id="justificativa"
              placeholder={placeholder}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={240}
            />
            <div className="text-xs text-muted-foreground text-right">
              {texto.length}/240 caracteres
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!texto.trim()}
          >
            Salvar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}