import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";
import { caixaStorage } from "@/lib/storage";
import { MovimentoCaixa } from "@/types";
import ProximoPassoSnackbar from "./ProximoPassoSnackbar";

interface LancarDespesaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CATEGORIAS = [
  'Combustível',
  'Manutenção',
  'Frete',
  'Material',
  'Alimentação',
  'Hospedagem',
  'Outros'
];

export default function LancarDespesaModal({
  open,
  onOpenChange,
  onSuccess,
}: LancarDespesaModalProps) {
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Combustível');
  const [forma, setForma] = useState<'PIX' | 'Cartão' | 'Dinheiro' | 'Transferência'>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [anexoFoto, setAnexoMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const valorNum = parseFloat(valor);
    
    if (!valorNum || valorNum <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!categoria) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se há caixa aberto para integração
      const currentUser = { id: "user-1", nome: "Admin" };
      const hoje = new Date().toISOString().split('T')[0];
      const caixaAberto = caixaStorage.getCaixaAbertaUsuario(currentUser.id, hoje);
      
      if (!caixaAberto) {
        toast({
          title: "Caixa não aberto",
          description: "Abra o caixa para registrar o movimento.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Registrar movimento no caixa
      const novoMovimento: MovimentoCaixa = {
        id: `mov-${Date.now()}`,
        ts: Date.now(),
        usuarioId: currentUser.id,
        usuarioNome: currentUser.nome,
        tipo: 'Saída',
        forma,
        valorBruto: valorNum,
        desconto: 0,
        jurosMulta: 0,
        valorLiquido: valorNum,
        origem: `Despesa - ${categoria}`,
        refs: {}
      };

      const movimentosAtualizados = [...caixaAberto.movimentos, novoMovimento];
      caixaStorage.update(caixaAberto.id, { movimentos: movimentosAtualizados });

      // Salvar despesa para auditoria (complementar)
      const despesa = {
        id: Date.now().toString(),
        valor: valorNum,
        categoria,
        forma,
        observacoes,
        anexoFoto,
        data: hoje,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        usuario: currentUser.nome,
        createdAt: new Date().toISOString()
      };

      const despesasExistentes = JSON.parse(localStorage.getItem('erp-despesas-dia') || '[]');
      despesasExistentes.push(despesa);
      localStorage.setItem('erp-despesas-dia', JSON.stringify(despesasExistentes));

      toast({
        title: "Despesa lançada",
        description: `Despesa de R$ ${valorNum.toLocaleString('pt-BR')} registrada no caixa!`,
      });

      // Resetar form
      setValor('');
      setCategoria('Combustível');
      setForma('PIX');
      setObservacoes('');
      setAnexoMock(false);

      onSuccess?.();
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a despesa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ➕ Lançar Despesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="valor">Valor *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1"
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-input border border-input-border rounded-md text-foreground"
            >
              {CATEGORIAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="forma">Forma de Pagamento *</Label>
            <select
              id="forma"
              value={forma}
              onChange={(e) => setForma(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 bg-input border border-input-border rounded-md text-foreground"
            >
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
            </select>
          </div>

          <div>
            <Label htmlFor="anexo">Anexo</Label>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAnexoMock(!anexoFoto)}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                {anexoFoto ? "Foto anexada" : "Anexar foto"}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Descrição da despesa..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Lançando..." : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}