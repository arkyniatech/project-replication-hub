import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { clienteStorage, tituloStorage } from "@/lib/storage";
import { timelineStore, MENSAGEM_TEMPLATES, formatMensagem } from "@/stores/timelineStore";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/date-utils";

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
  const [enviando, setEnviando] = useState(false);
  const { toast } = useToast();
  const { addEntry } = timelineStore();

  // Buscar dados do cliente e título
  const cliente = clienteId ? clienteStorage.getAll().find(c => c.id === clienteId) : null;
  const titulo = tituloId ? tituloStorage.getAll().find(t => t.id === tituloId) : null;

  // Gerar mensagem padrão quando modal abre
  useEffect(() => {
    if (open && cliente) {
      const template = MENSAGEM_TEMPLATES.COBRANCA_VENCIDO;
      
      const payload = {
        cliente: cliente.nomeRazao,
        titulo: titulo?.numero || 'N/A',
        contrato: titulo?.contrato?.numero || 'N/A',
        valor: titulo ? `R$ ${titulo.saldo.toLocaleString('pt-BR')}` : 'N/A',
        vencimento: titulo ? formatDateBR(titulo.vencimento, 'N/A') : 'N/A'
      };

      setMensagem(formatMensagem(template, payload));
    }
  }, [open, cliente, titulo]);

  // Telefone do cliente para WhatsApp: procura um contato de WhatsApp/celular/
  // telefone e, na falta, usa o campo compatível `telefone`.
  const getTelefoneCliente = (): string | null => {
    if (!cliente) return null;
    const contato = cliente.contatos?.find((c) => {
      const t = (c.tipo || '').toLowerCase();
      return t === 'whatsapp' || t === 'celular' || t === 'telefone';
    });
    return contato?.valor || cliente.telefone || null;
  };

  const handleEnviar = async () => {
    if (!clienteId || !mensagem.trim()) {
      toast({
        title: "Erro",
        description: "Cliente e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // WhatsApp: envia de verdade via Edge Function whatsapp-send (uazapi).
    // Antes o botão só registrava na timeline e mostrava sucesso sem enviar nada
    // (bug #47: canais não funcionavam).
    if (canal === 'WHATSAPP') {
      const phone = getTelefoneCliente();
      if (!phone) {
        toast({
          title: "Telefone não encontrado",
          description: "O cliente não possui WhatsApp/celular cadastrado.",
          variant: "destructive",
        });
        return;
      }
      if (!cliente?.lojaId) {
        toast({
          title: "Loja não identificada",
          description: "Não foi possível identificar a loja do cliente.",
          variant: "destructive",
        });
        return;
      }

      setEnviando(true);
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            loja_id: cliente.lojaId,
            phone,
            message: mensagem.trim(),
          },
        });

        if (error || data?.error) {
          toast({
            title: "Erro ao enviar WhatsApp",
            description: data?.error || error?.message || "Tente novamente.",
            variant: "destructive",
          });
          return;
        }
      } catch (err) {
        console.error('[EnviarAviso] Erro ao enviar WhatsApp:', err);
        toast({
          title: "Erro inesperado",
          description: "Não foi possível enviar a mensagem por WhatsApp.",
          variant: "destructive",
        });
        return;
      } finally {
        setEnviando(false);
      }
    } else if (canal === 'EMAIL') {
      // Envio por e-mail ainda não implementado no backend — evita prometer um
      // envio que não acontece.
      toast({
        title: "E-mail indisponível",
        description: "O envio por e-mail ainda não está disponível. Use WhatsApp ou registre como interno.",
        variant: "destructive",
      });
      return;
    }

    // Registro na timeline (todos os canais que chegaram até aqui)
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
      title: canal === 'WHATSAPP' ? "WhatsApp enviado" : "Aviso registrado",
      description: canal === 'WHATSAPP'
        ? `Mensagem enviada para ${cliente?.nomeRazao}.`
        : `Registrado como contato interno para ${cliente?.nomeRazao}.`
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar Aviso"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}