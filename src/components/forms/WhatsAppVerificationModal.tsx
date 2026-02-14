import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Shield, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  onVerified: () => void;
}

export default function WhatsAppVerificationModal({
  open,
  onOpenChange,
  phoneNumber,
  onVerified
}: WhatsAppVerificationModalProps) {
  const [step, setStep] = useState<'sending' | 'verify' | 'success'>('sending');
  const [code, setCode] = useState('');
  const { toast } = useToast();

  const handleSendCode = () => {
    // Mock: simular envio do código
    setTimeout(() => {
      setStep('verify');
      toast({
        title: "Código enviado!",
        description: `Um código de verificação foi enviado para ${phoneNumber} via WhatsApp.`,
      });
    }, 1000);
  };

  const handleVerifyCode = () => {
    // Mock: código correto é "123456"
    if (code === '123456') {
      setStep('success');
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
        // Reset para próxima vez
        setTimeout(() => {
          setStep('sending');
          setCode('');
        }, 300);
      }, 1500);
    } else {
      toast({
        title: "Código inválido",
        description: "O código informado está incorreto. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('sending');
      setCode('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Autenticar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Vamos verificar se este número de WhatsApp pertence ao cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'sending' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Smartphone className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{phoneNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Um código será enviado para este número
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Clique em "Enviar Código" para que o cliente receba uma mensagem via WhatsApp com um código de 6 dígitos.
              </p>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Código enviado com sucesso!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Peça ao cliente para informar o código recebido
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Digite o código de 6 dígitos
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-900 dark:text-blue-100">
                <strong>💡 Dica para testes:</strong> Use o código <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">123456</code>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  WhatsApp Verificado!
                </h3>
                <p className="text-sm text-muted-foreground">
                  O número foi autenticado com sucesso
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'sending' && (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSendCode}>
                Enviar Código
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleVerifyCode}
                disabled={code.length !== 6}
              >
                Verificar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
