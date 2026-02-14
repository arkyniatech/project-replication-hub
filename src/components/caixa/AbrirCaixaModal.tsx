import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { caixaStorage } from "@/lib/storage";
import { CaixaDoDia } from "@/types";
import { DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AbrirCaixaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const currentUser = { id: "user-1", nome: "Admin" };

export default function AbrirCaixaModal({ open, onOpenChange, onSuccess }: AbrirCaixaModalProps) {
  const { toast } = useToast();
  const [saldoInicial, setSaldoInicial] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  const hoje = new Date();
  const dataISO = hoje.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar se já existe caixa para hoje
      const caixaExistente = caixaStorage.getCaixaUsuarioData(currentUser.id, dataISO);
      
      if (caixaExistente && caixaExistente.status === 'Aberto') {
        toast({
          title: "Caixa já aberto",
          description: "Já existe um caixa aberto para hoje",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (caixaExistente && caixaExistente.status === 'Fechado') {
        toast({
          title: "Caixa já foi fechado",
          description: "O caixa de hoje já foi fechado. Não é possível reabrir.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const novoCaixa: CaixaDoDia = {
        id: `caixa-${Date.now()}`,
        dataISO,
        usuarioId: currentUser.id,
        usuarioNome: currentUser.nome,
        status: 'Aberto',
        saldoInicial: parseFloat(saldoInicial) || 0,
        observacaoAbertura: observacao,
        abertoEm: Date.now(),
        movimentos: []
      };

      caixaStorage.add(novoCaixa);

      toast({
        title: "Caixa Aberto",
        description: `Caixa do dia aberto com saldo inicial de R$ ${parseFloat(saldoInicial || "0").toFixed(2)}`
      });

      setSaldoInicial("");
      setObservacao("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir caixa. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Abrir Caixa do Dia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                value={format(hoje, 'dd/MM/yyyy', { locale: ptBR })} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input 
                value={currentUser.nome} 
                disabled 
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saldoInicial">Saldo Inicial (R$)</Label>
            <Input
              id="saldoInicial"
              type="number"
              step="0.01"
              min="0"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações sobre a abertura do caixa..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Abrindo..." : "Abrir Caixa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}