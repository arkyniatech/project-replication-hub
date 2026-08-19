import { useState } from 'react';
import { ArrowLeft, Plus, Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSupabasePedidosCompra } from '@/modules/compras/hooks/useSupabasePedidosCompra';
import { useSupabaseRecebimentos } from '@/modules/compras/hooks/useSupabaseRecebimentos';
import { useSupabaseCatalogo } from '@/modules/almox/hooks/useSupabaseCatalogo';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';
import { validarSeriesRecebimento } from '@/modules/compras/lib/recebimento-validation';

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
  // isResolvendoPermissoes, não isLoading: no react-query v5 isLoading é
  // isPending && isFetching, e a query de papéis tem `enabled: !!user?.id` —
  // durante a restauração da sessão ela nunca entra em fetching, então
  // isLoading é FALSE com as claims ainda vazias. Quarta aparição do padrão
  // (Relay 07, Relay 35); o próprio useRbac documenta que o gate deve usar
  // este campo.
  const { can, isResolvendoPermissoes: rbacLoading } = useRbac();
  const { lojaAtual } = useMultiunidade();
  const { pedidos: pedidosCompra } = useSupabasePedidosCompra(lojaAtual?.id);
  const { registrar } = useSupabaseRecebimentos();
  const { itens: catalogo } = useSupabaseCatalogo();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [nfData, setNfData] = useState({
    numero: '',
    emissao: '',
    chave: ''
  });
  const [itensRecebimento, setItensRecebimento] = useState<{
    [itemId: string]: {
      quantidadeRecebida: string;   // texto enquanto digita; convertido no envio
      series?: string[];
      observacao?: string;
    };
  }>({});

  const qtdDigitada = (itemId: string): number => {
    const bruto = (itensRecebimento[itemId]?.quantidadeRecebida ?? '').trim().replace(',', '.');
    if (bruto === '') return 0;
    const n = Number(bruto);
    return Number.isFinite(n) ? n : 0;
  };

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
      const idsDigitados = Object.keys(itensRecebimento);
      const algumInvalido = idsDigitados.some(id => {
        const bruto = (itensRecebimento[id]?.quantidadeRecebida ?? '').trim();
        return bruto !== '' && !Number.isFinite(Number(bruto.replace(',', '.')));
      });
      if (algumInvalido) {
        toast.error('Há quantidade inválida — confira os campos preenchidos');
        return;
      }
      if (!idsDigitados.some(id => qtdDigitada(id) > 0)) {
        toast.error('Informe pelo menos um item com quantidade recebida');
        return;
      }

      const itensParaValidar = (selectedPOData?.itens ?? []).map(item => {
        const catalogItem = catalogo.find(c => c.id === item.item_catalogo_id);
        return {
          itemId: item.id,
          descricao: item.descricao,
          isSerial: catalogItem?.controle === 'SERIE',
          quantidade: qtdDigitada(item.id),
          series: itensRecebimento[item.id]?.series,
        };
      });
      const seriesInvalidas = validarSeriesRecebimento(itensParaValidar);
      if (seriesInvalidas.length > 0) {
        const primeiro = seriesInvalidas[0];
        toast.error(
          seriesInvalidas.length === 1
            ? `Informe ${primeiro.quantidade} número(s) de série para "${primeiro.descricao}" (recebeu ${primeiro.seriesInformadas})`
            : `${seriesInvalidas.length} itens com número de série pendente ou divergente da quantidade recebida`
        );
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // texto cru: pedido pode ter quantidade fracionada (2,5 KG) e converter a
  // cada tecla impede digitar o decimal — com parseInt o resto nunca fechava.
  const handleItemQuantityChange = (itemId: string, valor: string) => {
    setItensRecebimento(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantidadeRecebida: valor
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
    if (!selectedPOData || registrar.isPending) return;

    // RPC transacional: grava recebimento + dá entrada no estoque + atualiza status do pedido
    registrar.mutate({
      pedidoId: selectedPO,
      nf: { numero: nfData.numero, emissao: nfData.emissao, chave: nfData.chave },
      itens: Object.entries(itensRecebimento)
        .filter(([pedidoItemId]) => qtdDigitada(pedidoItemId) > 0)
        .map(([pedidoItemId, data]) => ({
          pedido_item_id: pedidoItemId,
          quantidade_recebida: qtdDigitada(pedidoItemId),
          series: data.series,
          observacao: data.observacao,
        })),
    }, { onSuccess: resetForm });
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

  // enquanto as permissões carregam, can() responde false para todos —
  // mostrar "Acesso Restrito" aqui barraria um gestor legítimo.
  if (rbacLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  }

  if (!can('compras:rec:operar')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Você não possui permissão para registrar recebimento de materiais.
        </p>
      </div>
    );
  }

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
                        <p className="text-sm text-muted-foreground">{po.fornecedor?.nome || '—'}</p>
                        <p className="text-sm">
                          {po.itens.length} itens • {formatCurrency(Number(po.total))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Prazo</p>
                        <p className="text-sm font-medium">{po.prazo_entrega ?? '—'} dias</p>
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
                    const catalogItem = catalogo.find(c => c.id === item.item_catalogo_id);
                    const isSerial = catalogItem?.controle === 'SERIE';
                    const recebimentoItem = itensRecebimento[item.id];

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.sku || '—'}</p>
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
                            step="any"
                            inputMode="decimal"
                            max={Number(item.quantidade)}
                            placeholder="0"
                            value={recebimentoItem?.quantidadeRecebida ?? ''}
                            onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          {isSerial && qtdDigitada(item.id) > 0 ? (
                            <Input
                              placeholder="S001, S002, ..."
                              value={recebimentoItem.series?.join(', ') || ''}
                              onChange={(e) => handleSeriesChange(item.id, e.target.value)}
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
                              [item.id]: {
                                ...prev[item.id],
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
                      <p><strong>Fornecedor:</strong> {selectedPOData.fornecedor?.nome || '—'}</p>
                      <p><strong>Total:</strong> {formatCurrency(Number(selectedPOData.total))}</p>
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
                      .filter(([itemId]) => qtdDigitada(itemId) > 0)
                      .map(([itemId, data]) => {
                        const poItem = selectedPOData.itens.find(i => i.id === itemId);
                        const qtd = qtdDigitada(itemId);
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
                              <p className="font-medium">Qtd: {qtd}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(Number(poItem.preco_unit) * qtd)}
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
          <Button onClick={handleFinish} disabled={registrar.isPending}>
            <Package className="mr-2 h-4 w-4" />
            {registrar.isPending ? 'Registrando...' : 'Finalizar Recebimento'}
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