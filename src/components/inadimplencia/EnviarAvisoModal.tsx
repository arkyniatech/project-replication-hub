import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { clienteStorage, tituloStorage } from "@/lib/storage";
import { timelineStore, MENSAGEM_TEMPLATES, formatMensagem } from "@/stores/timelineStore";

interface EnviarAvisoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId?: string;
  tituloId?: string;
  onSuccess?: () => void;
}

export default function EnviarAvisoModal({ open, onOpenChange, clienteId, tituloId, onSuccess }: EnviarAvisoModalProps) {
  const [canal, setCanal] = useState<'EMAIL' | 'WHATSAPP' | 'INTERNO'>('INTERNO');
  const [mensagem, setMensagem] = useState('');
  const { toast } = useToast();
  const { addEntry } = timelineStore();

  // Buscar dados do cliente e título
  const cliente = clienteId ? clienteStorage.getAll().find(c => c.id === clienteId) : null;
  const titulo = tituloId ? tituloStorage.getAll().find(t => t.id === tituloId) : null;

  // Gerar mensagem padrão quando modal abre
  useEffect(() => {
    if (open && cliente) {
      let template = MENSAGEM_TEMPLATES.COBRANCA_VENCIDO;
      
      const payload = {
        cliente: cliente.nomeRazao,
        titulo: titulo?.numero || 'N/A',
        contrato: titulo?.contrato?.numero || 'N/A',
        valor: titulo ? `R$ ${titulo.saldo.toLocaleString('pt-BR')}` : 'N/A',
        vencimento: titulo ? new Date(titulo.vencimento).toLocaleDateString('pt-BR') : 'N/A'
      };

      setMensagem(formatMensagem(template, payload));
    }
  }, [open, cliente, titulo]);

  const handleEnviar = () => {
    if (!clienteId || !mensagem.trim()) {
      toast({
        title: "Erro",
        description: "Cliente e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Adicionar entrada na timeline
    addEntry({
      clienteId,
      contratoNumero: titulo?.contrato?.numero,
      tituloId,
      canal,
      tipo: 'COBRANCA',
      mensagem: mensagem.trim(),
      user: { id: 'user-1', nome: 'Admin' }, // Mock user
      dataISO: new Date().toISOString()
    });

    toast({
      title: "Aviso enviado",
      description: `Aviso enviado por ${canal.toLowerCase()} para ${cliente?.nomeRazao}.`
    });

    onOpenChange(false);
    setMensagem('');
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Aviso de Cobrança</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do cliente */}
          {cliente && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cliente.nomeRazao}</p>
                  <p className="text-sm text-muted-foreground">{cliente.documento}</p>
                </div>
                {titulo && (
                  <div className="text-right">
                    <p className="text-sm">Título: {titulo.numero}</p>
                    <p className="font-medium">R$ {titulo.saldo.toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="canal">Canal</Label>
            <Select value={canal} onValueChange={(value: 'EMAIL' | 'WHATSAPP' | 'INTERNO') => setCanal(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNO">Interno</SelectItem>
                <SelectItem value="EMAIL">E-mail</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite a mensagem..."
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar}>
              Enviar Aviso
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}