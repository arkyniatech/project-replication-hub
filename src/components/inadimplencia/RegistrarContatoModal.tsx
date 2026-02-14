import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { clienteStorage, tituloStorage } from "@/lib/storage";
import { timelineStore } from "@/stores/timelineStore";

interface RegistrarContatoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId?: string;
  tituloId?: string;
  onSuccess?: () => void;
}

export default function RegistrarContatoModal({ open, onOpenChange, clienteId, tituloId, onSuccess }: RegistrarContatoModalProps) {
  const [assunto, setAssunto] = useState('');
  const [observacao, setObservacao] = useState('');
  const { toast } = useToast();
  const { addEntry } = timelineStore();

  // Buscar dados do cliente
  const cliente = clienteId ? clienteStorage.getAll().find(c => c.id === clienteId) : null;
  const titulo = tituloId ? tituloStorage.getAll().find(t => t.id === tituloId) : null;

  const handleRegistrar = () => {
    if (!clienteId || !assunto.trim()) {
      toast({
        title: "Erro",
        description: "Cliente e assunto são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Adicionar entrada na timeline
    const mensagem = `${assunto}${observacao ? ` - ${observacao}` : ''}`;
    
    addEntry({
      clienteId,
      contratoNumero: titulo?.contrato?.numero,
      tituloId,
      canal: 'TELEFONE',
      tipo: 'ANOTACAO',
      mensagem,
      user: { id: 'user-1', nome: 'Admin' }, // Mock user
      dataISO: new Date().toISOString()
    });

    toast({
      title: "Contato registrado",
      description: `Ligação registrada para ${cliente?.nomeRazao}.`
    });

    onOpenChange(false);
    setAssunto('');
    setObservacao('');
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Contato</DialogTitle>
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
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex: Ligação - Cliente prometeu pagar"
            />
          </div>

          <div>
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes adicionais sobre o contato..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrar}>
              Registrar Contato
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}