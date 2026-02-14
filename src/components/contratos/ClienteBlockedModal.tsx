import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClienteBlockedModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  cliente: {
    nomeRazao: string;
    documento: string;
  };
  motivo: string;
  origemLoja?: string;
  valor?: number;
}

export function ClienteBlockedModal({
  open,
  onClose,
  onApprove,
  cliente,
  motivo,
  origemLoja,
  valor
}: ClienteBlockedModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSolicitarLiberacao = () => {
    setShowPasswordForm(true);
    setError("");
  };

  const handleSubmitPassword = () => {
    // Mock password validation - senha gerente: 1234
    if (password === "1234") {
      onApprove();
      handleClose();
    } else {
      setError("Senha incorreta. Tente novamente.");
    }
  };

  const handleClose = () => {
    setShowPasswordForm(false);
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Cliente Bloqueado</DialogTitle>
          </div>
          <DialogDescription>
            Este cliente não pode realizar novas locações no momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
            <h4 className="font-semibold text-destructive">{cliente.nomeRazao}</h4>
            <p className="text-sm text-muted-foreground">{cliente.documento}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Bloqueado</Badge>
              <span className="text-sm">{motivo}</span>
            </div>
            
            {origemLoja && (
              <p className="text-sm text-muted-foreground">
                Origem: {origemLoja}
                {valor && ` • Valor: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            )}
          </div>

          {!showPasswordForm ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleSolicitarLiberacao}
                className="flex-1 gap-2"
              >
                <Unlock className="h-4 w-4" />
                Solicitar Liberação
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Liberação do Gerente</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Digite a senha do gerente para liberar este cliente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager-password">Senha do Gerente</Label>
                <Input
                  id="manager-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitPassword()}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitPassword}
                  disabled={!password.trim()}
                  className="flex-1"
                >
                  Liberar Cliente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}