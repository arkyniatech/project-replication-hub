import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, DollarSign } from "lucide-react";
import { Titulo } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface AgruparFaturaModalProps {
  open: boolean;
  onClose: () => void;
  titulos: Titulo[];
}

export function AgruparFaturaModal({ open, onClose, titulos }: AgruparFaturaModalProps) {
  const { toast } = useToast();
  const [tipoVencimento, setTipoVencimento] = useState<'original' | 'unica'>('original');
  const [dataUnica, setDataUnica] = useState('');

  // Verificar se todos os títulos são do mesmo cliente e loja
  const clienteId = titulos[0]?.clienteId;
  const lojaId = titulos[0]?.lojaId;
  const cliente = titulos[0]?.cliente;

  const titulosValidos = useMemo(() => {
    return titulos.every(t => 
      t.clienteId === clienteId && 
      t.lojaId === lojaId &&
      t.status === 'Em aberto'
    );
  }, [titulos, clienteId, lojaId]);

  const totalGeral = titulos.reduce((sum, t) => sum + t.saldo, 0);
  const vencimentoMaisProximo = titulos
    .map(t => new Date(t.vencimento))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const handleAgrupar = () => {
    if (!titulosValidos) {
      toast({
        title: "Erro ao agrupar",
        description: "Todos os títulos devem ser do mesmo cliente e loja."
      });
      return;
    }

    // Simular geração de documento consolidado (mock)
    const numeroDocumento = `DOC-${Date.now()}`;
    const vencimentoFinal = tipoVencimento === 'unica' && dataUnica 
      ? dataUnica 
      : vencimentoMaisProximo.toISOString().split('T')[0];

    // Em um sistema real, isso geraria um documento de cobrança consolidado
    // Por enquanto, apenas simular e registrar na timeline dos títulos
    titulos.forEach(titulo => {
      if (titulo.timeline) {
        titulo.timeline.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          tipo: 'criacao', // Usar tipo existente
          descricao: `Incluído no documento consolidado ${numeroDocumento}`,
          usuario: 'Sistema',
          meta: {
            valor: titulo.saldo
          }
        });
      }
    });

    // Salvar títulos atualizados (mock)
    try {
      const titulosStorage = JSON.parse(localStorage.getItem('erp-titulos') || '[]');
      titulos.forEach(titulo => {
        const index = titulosStorage.findIndex((t: Titulo) => t.id === titulo.id);
        if (index >= 0) {
          titulosStorage[index] = titulo;
        }
      });
      localStorage.setItem('erp-titulos', JSON.stringify(titulosStorage));
    } catch (error) {
      console.error('Erro ao atualizar títulos:', error);
    }

    toast({
      title: "Documento consolidado gerado",
      description: `${titulos.length} títulos agrupados no documento ${numeroDocumento}`
    });

    onClose();
  };

  if (!titulosValidos) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <FileText className="h-5 w-5" />
              Erro ao Agrupar
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para agrupar em fatura, todos os títulos devem ser:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Do mesmo cliente</li>
              <li>• Da mesma loja</li>
              <li>• Com status "Em Aberto"</li>
            </ul>
          </div>

          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Agrupar em Fatura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliente:</span>
                <span className="text-sm font-medium">{cliente?.nomeRazao}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Títulos:</span>
                <span className="text-sm font-medium">{titulos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-sm font-medium">
                  R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Configuração de Vencimento */}
          <div className="space-y-3">
            <Label>Vencimento</Label>
            <Select value={tipoVencimento} onValueChange={(value: 'original' | 'unica') => setTipoVencimento(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Respeitar vencimentos originais</SelectItem>
                <SelectItem value="unica">Usar data única</SelectItem>
              </SelectContent>
            </Select>

            {tipoVencimento === 'unica' && (
              <div className="space-y-2">
                <Label htmlFor="dataUnica">Data única</Label>
                <input
                  id="dataUnica"
                  type="date"
                  value={dataUnica}
                  onChange={(e) => setDataUnica(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}

            {tipoVencimento === 'original' && vencimentoMaisProximo && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Vencimento mais próximo: {vencimentoMaisProximo.toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          {/* Lista de Títulos */}
          <div className="space-y-2">
            <Label>Títulos Selecionados</Label>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulos.map((titulo) => (
                    <TableRow key={titulo.id}>
                      <TableCell className="font-medium">{titulo.numero}</TableCell>
                      <TableCell>{titulo.contrato?.numero || '-'}</TableCell>
                      <TableCell>
                        {new Date(titulo.vencimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={titulo.origem === 'LOGISTICA' ? 'secondary' : 'outline'}>
                          {titulo.origem === 'LOGISTICA' ? 'Logística' : 'Contrato'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {titulo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAgrupar}
            disabled={tipoVencimento === 'unica' && !dataUnica}
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}