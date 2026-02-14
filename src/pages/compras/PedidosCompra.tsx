import { useState } from 'react';
import { Search, Eye, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComprasStore } from '@/modules/compras/store/comprasStore';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';

const statusColors = {
  emitido: 'bg-blue-100 text-blue-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  total: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

export default function PedidosCompra() {
  const { can } = useRbac();
  const { pedidosCompra, cotacoes } = useComprasStore();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPO, setSelectedPO] = useState<string | null>(null);

  const filteredPOs = pedidosCompra.filter(po => {
    const matchSearch = po.numero.toLowerCase().includes(search.toLowerCase()) ||
                       po.fornecedorNome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'all' || po.status === selectedStatus;
    
    return matchSearch && matchStatus;
  });

  const selectedPOData = selectedPO ? pedidosCompra.find(p => p.id === selectedPO) : null;
  const selectedCotacao = selectedPOData ? cotacoes.find(c => c.id === selectedPOData.cotacaoId) : null;

  const handlePrintPO = (poId: string) => {
    toast.success('PO enviado para impressão (mock)');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="text-muted-foreground">
            Gerencie pedidos de compra emitidos para fornecedores
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de POs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidosCompra.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pedidosCompra.filter(p => p.status === 'emitido').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pedidosCompra.filter(p => p.status === 'total').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pedidosCompra.reduce((sum, po) => sum + po.total, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número ou fornecedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="emitido">Emitido</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº PO</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.map((po) => {
                const cotacao = cotacoes.find(c => c.id === po.cotacaoId);
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.numero}</TableCell>
                    <TableCell>Loja Principal</TableCell>
                    <TableCell>{po.fornecedorNome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cotacao?.origem === 'REQ' ? 'Requisição' : 'OS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(po.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[po.status]}>
                        {po.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPO(po.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Pedido de Compra {po.numero}</DialogTitle>
                            </DialogHeader>
                            
                            {selectedPOData && (
                              <div className="space-y-6">
                                {/* Header Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <Card>
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Fornecedor</p>
                                        <p>{selectedPOData.fornecedorNome}</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  
                                  <Card>
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Prazo de Entrega</p>
                                        <p>{selectedPOData.prazoEntrega} dias</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  
                                  <Card>
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Condições</p>
                                        <p className="text-sm">{selectedPOData.condicoesPagamento}</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Items */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Itens do Pedido</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>SKU</TableHead>
                                          <TableHead>Descrição</TableHead>
                                          <TableHead>Qtd</TableHead>
                                          <TableHead>Preço Unit.</TableHead>
                                          <TableHead>Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedPOData.itens.map((item) => (
                                          <TableRow key={item.itemId}>
                                            <TableCell className="font-medium">{item.sku}</TableCell>
                                            <TableCell>{item.descricao}</TableCell>
                                            <TableCell>{item.quantidade}</TableCell>
                                            <TableCell>{formatCurrency(item.precoUnit)}</TableCell>
                                            <TableCell>{formatCurrency(item.total)}</TableCell>
                                          </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/50">
                                          <TableCell colSpan={4} className="font-medium">
                                            TOTAL GERAL
                                          </TableCell>
                                          <TableCell className="font-bold">
                                            {formatCurrency(selectedPOData.total)}
                                          </TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>

                                {/* Observations */}
                                {selectedPOData.observacoes && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Observações</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-sm">{selectedPOData.observacoes}</p>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Actions */}
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline"
                                    onClick={() => handlePrintPO(selectedPOData.id)}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Imprimir PO
                                  </Button>
                                  
                                  {can('compras:rec:operar') && selectedPOData.status !== 'total' && (
                                    <Button onClick={() => toast.info('Redirecionando para Recebimento...')}>
                                      <Package className="mr-2 h-4 w-4" />
                                      Receber
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {can('compras:po:create') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintPO(po.id)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}