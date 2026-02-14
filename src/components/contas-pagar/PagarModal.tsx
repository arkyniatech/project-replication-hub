import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Upload, Calculator, X } from 'lucide-react';
import { useSupabaseContasFinanceiras } from '@/hooks/useSupabaseContasFinanceiras';
import { useSupabaseMovimentosPagar } from '@/hooks/useSupabaseMovimentosPagar';
import { useMultiunidade } from '@/hooks/useMultiunidade';

interface ParcelasPagar {
  id: string;
  vencimento: string;
  fornecedor: string;
  unidade: string;
  categoria: string;
  valor: number;
  pago: number;
  saldo: number;
  status: 'a_vencer' | 'vencida' | 'paga' | 'parcial' | 'negociacao';
  tituloId: string;
}

interface PagarModalProps {
  open: boolean;
  onClose: () => void;
  parcelas: ParcelasPagar[];
  onSuccess: () => void;
}

export function PagarModal({ open, onClose, parcelas, onSuccess }: PagarModalProps) {
  const { lojaAtual } = useMultiunidade();
  const { contas, isLoading: loadingContas } = useSupabaseContasFinanceiras(lojaAtual?.id);
  const { registrarPagamento } = useSupabaseMovimentosPagar();
  const [selectedConta, setSelectedConta] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [parcelasData, setParcelasData] = useState<Array<{
    id: string;
    valorPago: number;
    juros: number;
    multa: number;
    desconto: number;
  }>>(
    parcelas.map(p => ({
      id: p.id,
      valorPago: p.saldo,
      juros: 0,
      multa: 0,
      desconto: 0
    }))
  );

  const updateParcelaData = (id: string, field: string, value: number) => {
    setParcelasData(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const getTotalLiquido = () => {
    return parcelasData.reduce((sum, p) => 
      sum + p.valorPago + p.juros + p.multa - p.desconto, 0
    );
  };

  const handleSubmit = async () => {
    if (!selectedConta) {
      toast.error("Selecione uma conta para o pagamento");
      return;
    }

    if (!lojaAtual?.id) {
      toast.error("Loja não selecionada");
      return;
    }

    try {
      // Registrar pagamento para cada parcela
      for (let i = 0; i < parcelas.length; i++) {
        const parcela = parcelas[i];
        const parcelaData = parcelasData[i];

        await registrarPagamento.mutateAsync({
          parcela_id: parcela.id,
          titulo_id: parcela.tituloId,
          conta_id: selectedConta,
          loja_id: lojaAtual.id,
          data_pagamento: dataPagamento,
          valor_bruto: parcelaData.valorPago,
          juros: parcelaData.juros,
          multa: parcelaData.multa,
          desconto: parcelaData.desconto,
          forma: contas.find(c => c.id === selectedConta)?.tipo || 'BANCO',
          comprovante_url: comprovante?.name, // TODO: Upload real
          observacoes: observacao
        });
      }

      toast.success(`${parcelas.length} parcela(s) paga(s) com sucesso!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao registrar pagamento:", error);
      toast.error(`Erro ao registrar pagamento: ${error.message}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setComprovante(file);
      toast.success(`Comprovante anexado: ${file.name}`);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Pagar Parcelas ({parcelas.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo das Parcelas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parcelas Selecionadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Juros</TableHead>
                    <TableHead className="text-right">Multa</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((parcela, index) => {
                    const parcelaData = parcelasData[index];
                    const liquido = parcelaData.valorPago + parcelaData.juros + parcelaData.multa - parcelaData.desconto;
                    
                    return (
                      <TableRow key={parcela.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{parcela.fornecedor}</div>
                            <div className="text-sm text-muted-foreground">{parcela.categoria}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(parcela.vencimento).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(parcela.saldo)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={parcelaData.valorPago}
                            onChange={(e) => updateParcelaData(parcela.id, 'valorPago', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={parcelaData.juros}
                            onChange={(e) => updateParcelaData(parcela.id, 'juros', parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={parcelaData.multa}
                            onChange={(e) => updateParcelaData(parcela.id, 'multa', parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={parcelaData.desconto}
                            onChange={(e) => updateParcelaData(parcela.id, 'desconto', parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(liquido)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Líquido:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(getTotalLiquido())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados do Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conta">Conta / Meio de Pagamento *</Label>
                  <Select value={selectedConta} onValueChange={setSelectedConta}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingContas ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : contas.length === 0 ? (
                        <SelectItem value="empty" disabled>Nenhuma conta cadastrada</SelectItem>
                      ) : (
                        contas.map(conta => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome} ({conta.tipo})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data">Data do Pagamento *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações sobre o pagamento..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Comprovante</Label>
                <div className="mt-2">
                  {comprovante ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <span className="text-sm">{comprovante.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setComprovante(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arraste um arquivo ou clique para selecionar
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        Selecionar Arquivo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Total: {formatCurrency(getTotalLiquido())}
              </span>
              <Button onClick={handleSubmit}>
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}