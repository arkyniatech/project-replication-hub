import { useState } from 'react';
import { ArrowLeft, Plus, Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useComprasStore } from '@/modules/compras/store/comprasStore';
import { useAlmoxStore } from '@/modules/almox/store/almoxStore';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';

interface WizardStep {
  id: number;
  title: string;
  description: string;
}

const steps: WizardStep[] = [
  { id: 1, title: 'Selecionar PO', description: 'Escolha o pedido de compra' },
  { id: 2, title: 'Nota Fiscal', description: 'Informações da NF' },
  { id: 3, title: 'Itens', description: 'Quantidades recebidas' },
  { id: 4, title: 'Conferência', description: 'Revisar e confirmar' }
];

export default function Recebimento() {
  const { can } = useRbac();
  const { pedidosCompra, registrarRecebimento } = useComprasStore();
  const { entradaPorRecebimento, getItem } = useAlmoxStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [nfData, setNfData] = useState({
    numero: '',
    emissao: '',
    chave: ''
  });
  const [itensRecebimento, setItensRecebimento] = useState<{
    [itemId: string]: {
      quantidadeRecebida: number;
      series?: string[];
      observacao?: string;
    };
  }>({});

  const selectedPOData = selectedPO ? pedidosCompra.find(p => p.id === selectedPO) : null;
  
  // Filter only POs that can be received
  const availablePOs = pedidosCompra.filter(po => 
    po.status === 'emitido' || po.status === 'parcial'
  );

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedPO) {
      toast.error('Selecione um pedido de compra');
      return;
    }
    
    if (currentStep === 2 && (!nfData.numero || !nfData.emissao)) {
      toast.error('Preencha os dados da nota fiscal');
      return;
    }
    
    if (currentStep === 3) {
      const hasItems = Object.keys(itensRecebimento).length > 0;
      const hasValidQuantities = Object.values(itensRecebimento).some(item => item.quantidadeRecebida > 0);
      
      if (!hasItems || !hasValidQuantities) {
        toast.error('Informe pelo menos um item com quantidade recebida');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleItemQuantityChange = (itemId: string, quantidade: number) => {
    setItensRecebimento(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantidadeRecebida: quantidade
      }
    }));
  };

  const handleSeriesChange = (itemId: string, series: string) => {
    const seriesArray = series.split(',').map(s => s.trim()).filter(s => s);
    setItensRecebimento(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        series: seriesArray
      }
    }));
  };

  const handleFinish = () => {
    if (!selectedPOData) return;

    // Register receiving
    const recebimentoId = registrarRecebimento({
      pedidoCompraId: selectedPO,
      lojaId: selectedPOData.lojaId,
      notaFiscal: {
        numero: nfData.numero,
        emissao: nfData.emissao,
        chave: nfData.chave
      },
      itens: Object.entries(itensRecebimento).map(([itemId, data]) => ({
        itemId,
        quantidadeRecebida: data.quantidadeRecebida,
        series: data.series,
        observacao: data.observacao
      })),
      status: 'total', // Simplified - would calculate based on quantities
      conferente: 'admin' // Mock user
    });

    // Register stock entries
    Object.entries(itensRecebimento).forEach(([itemId, data]) => {
      if (data.quantidadeRecebida > 0) {
        const poItem = selectedPOData.itens.find(i => i.itemId === itemId);
        if (poItem) {
          entradaPorRecebimento({
            itemId,
            lojaId: selectedPOData.lojaId,
            quantidade: data.quantidadeRecebida,
            series: data.series,
            custoUnitario: poItem.precoUnit,
            referencia: selectedPOData.numero
          });
        }
      }
    });

    toast.success('Recebimento registrado com sucesso');
    
    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedPO('');
    setNfData({ numero: '', emissao: '', chave: '' });
    setItensRecebimento({});
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recebimento de Materiais</h1>
          <p className="text-muted-foreground">
            Wizard para registrar recebimento de pedidos de compra
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="ml-4">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Select PO */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Selecionar Pedido de Compra</h3>
              
              <div className="grid grid-cols-1 gap-4">
                {availablePOs.map((po) => (
                  <div 
                    key={po.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPO === po.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedPO(po.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{po.numero}</span>
                          <Badge variant="outline">{po.status.toUpperCase()}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{po.fornecedorNome}</p>
                        <p className="text-sm">
                          {po.itens.length} itens • {formatCurrency(po.total)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Prazo</p>
                        <p className="text-sm font-medium">{po.prazoEntrega} dias</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Invoice Data */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados da Nota Fiscal</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numero">Número da NF *</Label>
                  <Input
                    id="numero"
                    value={nfData.numero}
                    onChange={(e) => setNfData(prev => ({ ...prev, numero: e.target.value }))}
                    placeholder="123456"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="emissao">Data de Emissão *</Label>
                  <Input
                    id="emissao"
                    type="date"
                    value={nfData.emissao}
                    onChange={(e) => setNfData(prev => ({ ...prev, emissao: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="chave">Chave de Acesso</Label>
                  <Input
                    id="chave"
                    value={nfData.chave}
                    onChange={(e) => setNfData(prev => ({ ...prev, chave: e.target.value }))}
                    placeholder="44 dígitos (opcional)"
                    maxLength={44}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Items */}
          {currentStep === 3 && selectedPOData && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Quantidades Recebidas</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Nº de Série</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPOData.itens.map((item) => {
                    const catalogItem = getItem(item.itemId);
                    const isSerial = catalogItem?.controle === 'SERIE';
                    const recebimentoItem = itensRecebimento[item.itemId];
                    
                    return (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.sku}</p>
                            <p className="text-sm text-muted-foreground">{item.descricao}</p>
                            {isSerial && (
                              <Badge variant="outline" className="mt-1">SÉRIE</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.quantidade}
                            value={recebimentoItem?.quantidadeRecebida || 0}
                            onChange={(e) => handleItemQuantityChange(
                              item.itemId, 
                              parseInt(e.target.value) || 0
                            )}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          {isSerial && recebimentoItem?.quantidadeRecebida ? (
                            <Input
                              placeholder="S001, S002, ..."
                              value={recebimentoItem.series?.join(', ') || ''}
                              onChange={(e) => handleSeriesChange(item.itemId, e.target.value)}
                              className="w-32"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Observação"
                            value={recebimentoItem?.observacao || ''}
                            onChange={(e) => setItensRecebimento(prev => ({
                              ...prev,
                              [item.itemId]: {
                                ...prev[item.itemId],
                                observacao: e.target.value
                              }
                            }))}
                            className="w-32"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && selectedPOData && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Conferência do Recebimento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pedido de Compra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Número:</strong> {selectedPOData.numero}</p>
                      <p><strong>Fornecedor:</strong> {selectedPOData.fornecedorNome}</p>
                      <p><strong>Total:</strong> {formatCurrency(selectedPOData.total)}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Nota Fiscal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Número:</strong> {nfData.numero}</p>
                      <p><strong>Emissão:</strong> {new Date(nfData.emissao).toLocaleDateString()}</p>
                      {nfData.chave && (
                        <p><strong>Chave:</strong> {nfData.chave}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo dos Itens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(itensRecebimento)
                      .filter(([_, data]) => data.quantidadeRecebida > 0)
                      .map(([itemId, data]) => {
                        const poItem = selectedPOData.itens.find(i => i.itemId === itemId);
                        return poItem ? (
                          <div key={itemId} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium">{poItem.sku} - {poItem.descricao}</p>
                              {data.series && data.series.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Séries: {data.series.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">Qtd: {data.quantidadeRecebida}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(poItem.precoUnit * data.quantidadeRecebida)}
                              </p>
                            </div>
                          </div>
                        ) : null;
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevStep}
          disabled={currentStep === 1}
        >
          Anterior
        </Button>
        
        {currentStep === steps.length ? (
          <Button onClick={handleFinish}>
            <Package className="mr-2 h-4 w-4" />
            Finalizar Recebimento
          </Button>
        ) : (
          <Button onClick={handleNextStep}>
            Próximo
          </Button>
        )}
      </div>
    </div>
  );
}