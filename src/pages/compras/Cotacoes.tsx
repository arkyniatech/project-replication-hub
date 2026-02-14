import { useState } from 'react';
import { Search, Eye, FileText, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useComprasStore, PropostaFornecedor } from '@/modules/compras/store/comprasStore';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';

const statusColors = {
  em_andamento: 'bg-blue-100 text-blue-800',
  para_aprovacao: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  negado: 'bg-red-100 text-red-800',
  comprado: 'bg-gray-100 text-gray-800'
};

export default function Cotacoes() {
  const { can } = useRbac();
  const { 
    cotacoes, 
    adicionarFornecedor, 
    enviarParaAprovacao, 
    aprovarCotacao,
    gerarPOs 
  } = useComprasStore();
  
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCotacao, setSelectedCotacao] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  // Form states
  const [showFornecedorForm, setShowFornecedorForm] = useState(false);
  const [fornecedorData, setFornecedorData] = useState({
    fornecedorId: '',
    fornecedorNome: '',
    frete: 0,
    impostos: 0,
    desconto: 0,
    prazoGeralDias: 30,
    condicoesPagamento: '30 dias',
    validadeProposta: '',
    itens: [] as any[]
  });

  const [approvalData, setApprovalData] = useState({
    tipo: 'fornecedor_unico' as 'fornecedor_unico' | 'dividir_por_item',
    justificativa: '',
    template: ''
  });

  const filteredCotacoes = cotacoes.filter(cot => {
    const matchSearch = cot.numero.toLowerCase().includes(search.toLowerCase()) ||
                       cot.comprador.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'all' || cot.status === selectedStatus;
    
    return matchSearch && matchStatus;
  });

  const selectedCotacaoData = selectedCotacao ? cotacoes.find(c => c.id === selectedCotacao) : null;

  const handleAddFornecedor = () => {
    if (!selectedCotacao || !selectedCotacaoData) return;

    // Calculate total
    const total = fornecedorData.itens.reduce((sum, item) => sum + (item.precoUnit * item.quantidade), 0) 
                  + fornecedorData.frete + fornecedorData.impostos - fornecedorData.desconto;

    const proposta: PropostaFornecedor = {
      ...fornecedorData,
      total,
      itens: fornecedorData.itens.map(item => ({
        itemId: item.itemId,
        precoUnit: item.precoUnit,
        prazoEntrega: item.prazoEntrega || fornecedorData.prazoGeralDias,
        observacao: item.observacao
      }))
    };

    adicionarFornecedor(selectedCotacao, proposta);
    toast.success('Fornecedor adicionado à cotação');
    setShowFornecedorForm(false);
    resetFornecedorForm();
  };

  const resetFornecedorForm = () => {
    setFornecedorData({
      fornecedorId: '',
      fornecedorNome: '',
      frete: 0,
      impostos: 0,
      desconto: 0,
      prazoGeralDias: 30,
      condicoesPagamento: '30 dias',
      validadeProposta: '',
      itens: []
    });
  };

  const handleEnviarParaAprovacao = (cotacaoId: string) => {
    const cotacao = cotacoes.find(c => c.id === cotacaoId);
    if (!cotacao) return;

    if (cotacao.propostas.length < 2) {
      toast.error('É necessário ter pelo menos 2 fornecedores para enviar para aprovação');
      return;
    }

    enviarParaAprovacao(cotacaoId);
    toast.success('Cotação enviada para aprovação');
  };

  const handleAprovar = () => {
    if (!selectedCotacao || !approvalData.justificativa) {
      toast.error('Preencha a justificativa');
      return;
    }

    aprovarCotacao(selectedCotacao, {
      tipo: approvalData.tipo,
      justificativa: approvalData.justificativa,
      aprovadoPor: 'admin', // Mock
      aprovadoEm: new Date().toISOString(),
      snapshot: selectedCotacaoData // Store snapshot
    });

    toast.success('Cotação aprovada com sucesso');
    setShowApprovalModal(false);
    setApprovalData({ tipo: 'fornecedor_unico', justificativa: '', template: '' });
  };

  const handleGerarPOs = (cotacaoId: string) => {
    const poIds = gerarPOs(cotacaoId);
    if (poIds.length > 0) {
      toast.success(`${poIds.length} PO(s) gerado(s) com sucesso`);
    }
  };

  const initFornecedorForm = (cotacao: typeof cotacoes[0]) => {
    setFornecedorData(prev => ({
      ...prev,
      itens: cotacao.itens.map(item => ({
        itemId: item.id,
        sku: item.sku,
        descricao: item.descricao,
        quantidade: item.quantidade,
        precoUnit: 0,
        prazoEntrega: prev.prazoGeralDias,
        observacao: ''
      }))
    }));
  };

  const templateOptions = [
    { value: 'preco', label: 'Melhor Preço', text: 'Aprovado com base no menor preço total oferecido.' },
    { value: 'prazo', label: 'Melhor Prazo', text: 'Aprovado priorizando o menor prazo de entrega.' },
    { value: 'qualidade', label: 'Qualidade', text: 'Aprovado com base na qualidade e histórico do fornecedor.' },
    { value: 'conformidade', label: 'Conformidade', text: 'Aprovado por atender às especificações técnicas exigidas.' },
    { value: 'disponibilidade', label: 'Disponibilidade', text: 'Aprovado por ser o único fornecedor com disponibilidade imediata.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie cotações e comparação de fornecedores
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número ou comprador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="para_aprovacao">Para Aprovação</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="negado">Negado</SelectItem>
                <SelectItem value="comprado">Comprado</SelectItem>
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
                <TableHead>Nº COT</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Fornec.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCotacoes.map((cot) => (
                <TableRow key={cot.id}>
                  <TableCell className="font-medium">{cot.numero}</TableCell>
                  <TableCell>Loja Principal</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {cot.origem === 'REQ' ? 'Requisição' : 'OS'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {cot.itens.slice(0, 2).map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item.sku}
                        </Badge>
                      ))}
                      {cot.itens.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{cot.itens.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {cot.propostas.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[cot.status]}>
                      {cot.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCotacao(cot.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Cotação {cot.numero}</DialogTitle>
                          </DialogHeader>
                          
                          {selectedCotacaoData && (
                            <div className="space-y-6">
                              {/* Header Info */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">Origem</p>
                                      <Badge variant="outline">
                                        {selectedCotacaoData.origem === 'REQ' ? 'Requisição' : 'OS'}
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">Comprador</p>
                                      <p>{selectedCotacaoData.comprador}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">SLA Interno</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(selectedCotacaoData.slaInterno).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Comparison Matrix */}
                              {selectedCotacaoData.propostas.length > 0 && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Matriz de Comparação</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                          <tr>
                                            <th className="border border-gray-300 p-2 bg-gray-50">Item</th>
                                            {selectedCotacaoData.propostas.map((prop, idx) => (
                                              <th key={idx} className="border border-gray-300 p-2 bg-gray-50">
                                                {prop.fornecedorNome}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {selectedCotacaoData.itens.map((item) => (
                                            <tr key={item.id}>
                                              <td className="border border-gray-300 p-2 font-medium">
                                                {item.sku} - {item.descricao}
                                                <br />
                                                <span className="text-sm text-muted-foreground">
                                                  Qtd: {item.quantidade}
                                                </span>
                                              </td>
                                              {selectedCotacaoData.propostas.map((prop, idx) => {
                                                const propItem = prop.itens.find(pi => pi.itemId === item.id);
                                                return (
                                                  <td key={idx} className="border border-gray-300 p-2">
                                                    {propItem ? (
                                                      <div>
                                                        <p className="font-medium">
                                                          R$ {propItem.precoUnit.toFixed(2)}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                          {propItem.prazoEntrega} dias
                                                        </p>
                                                      </div>
                                                    ) : (
                                                      <span className="text-muted-foreground">-</span>
                                                    )}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                          <tr className="bg-gray-50">
                                            <td className="border border-gray-300 p-2 font-medium">TOTAL</td>
                                            {selectedCotacaoData.propostas.map((prop, idx) => (
                                              <td key={idx} className="border border-gray-300 p-2 font-bold">
                                                R$ {prop.total.toFixed(2)}
                                              </td>
                                            ))}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Actions */}
                              <div className="flex justify-end gap-2">
                                {can('compras:cot:edit') && selectedCotacaoData.status === 'em_andamento' && (
                                  <Button
                                    onClick={() => {
                                      initFornecedorForm(selectedCotacaoData);
                                      setShowFornecedorForm(true);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adicionar Fornecedor
                                  </Button>
                                )}
                                
                                {can('compras:cot:edit') && selectedCotacaoData.status === 'em_andamento' && selectedCotacaoData.propostas.length >= 2 && (
                                  <Button onClick={() => handleEnviarParaAprovacao(selectedCotacaoData.id)}>
                                    Enviar para Aprovação
                                  </Button>
                                )}
                                
                                {can('compras:approve') && selectedCotacaoData.status === 'para_aprovacao' && (
                                  <Button onClick={() => setShowApprovalModal(true)}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Aprovar
                                  </Button>
                                )}
                                
                                {can('compras:po:create') && selectedCotacaoData.status === 'aprovado' && (
                                  <Button onClick={() => handleGerarPOs(selectedCotacaoData.id)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Gerar PO(s)
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Supplier Modal */}
      <Dialog open={showFornecedorForm} onOpenChange={setShowFornecedorForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Fornecedor</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fornecedorNome">Nome do Fornecedor *</Label>
                <Input
                  id="fornecedorNome"
                  value={fornecedorData.fornecedorNome}
                  onChange={(e) => setFornecedorData(prev => ({ ...prev, fornecedorNome: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="condicoesPagamento">Condições de Pagamento</Label>
                <Input
                  id="condicoesPagamento"
                  value={fornecedorData.condicoesPagamento}
                  onChange={(e) => setFornecedorData(prev => ({ ...prev, condicoesPagamento: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="frete">Frete (R$)</Label>
                <Input
                  id="frete"
                  type="number"
                  step="0.01"
                  value={fornecedorData.frete}
                  onChange={(e) => setFornecedorData(prev => ({ ...prev, frete: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="impostos">Impostos (R$)</Label>
                <Input
                  id="impostos"
                  type="number"
                  step="0.01"
                  value={fornecedorData.impostos}
                  onChange={(e) => setFornecedorData(prev => ({ ...prev, impostos: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="desconto">Desconto (R$)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  value={fornecedorData.desconto}
                  onChange={(e) => setFornecedorData(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="prazoGeralDias">Prazo Geral (dias)</Label>
                <Input
                  id="prazoGeralDias"
                  type="number"
                  value={fornecedorData.prazoGeralDias}
                  onChange={(e) => setFornecedorData(prev => ({ ...prev, prazoGeralDias: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>

            {/* Items pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Preços por Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fornecedorData.itens.map((item, idx) => (
                    <div key={item.itemId} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded">
                      <div>
                        <p className="font-medium">{item.sku}</p>
                        <p className="text-sm text-muted-foreground">{item.descricao}</p>
                        <p className="text-sm">Qtd: {item.quantidade}</p>
                      </div>
                      
                      <div>
                        <Label>Preço Unit. (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.precoUnit}
                          onChange={(e) => {
                            const newItens = [...fornecedorData.itens];
                            newItens[idx] = { ...item, precoUnit: parseFloat(e.target.value) || 0 };
                            setFornecedorData(prev => ({ ...prev, itens: newItens }));
                          }}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Prazo (dias)</Label>
                        <Input
                          type="number"
                          value={item.prazoEntrega}
                          onChange={(e) => {
                            const newItens = [...fornecedorData.itens];
                            newItens[idx] = { ...item, prazoEntrega: parseInt(e.target.value) || 30 };
                            setFornecedorData(prev => ({ ...prev, itens: newItens }));
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label>Observação</Label>
                        <Input
                          value={item.observacao}
                          onChange={(e) => {
                            const newItens = [...fornecedorData.itens];
                            newItens[idx] = { ...item, observacao: e.target.value };
                            setFornecedorData(prev => ({ ...prev, itens: newItens }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFornecedorForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddFornecedor}>
                Adicionar Fornecedor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aprovar Cotação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tipo de Aprovação</Label>
              <Select 
                value={approvalData.tipo} 
                onValueChange={(value) => setApprovalData(prev => ({ ...prev, tipo: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor_unico">Fornecedor Único (Menor Total)</SelectItem>
                  <SelectItem value="dividir_por_item">Dividir por Item (Melhor de Cada)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Template de Justificativa</Label>
              <Select 
                value={approvalData.template} 
                onValueChange={(value) => {
                  const template = templateOptions.find(t => t.value === value);
                  setApprovalData(prev => ({ 
                    ...prev, 
                    template: value,
                    justificativa: template?.text || prev.justificativa
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map(template => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Justificativa *</Label>
              <Textarea
                value={approvalData.justificativa}
                onChange={(e) => setApprovalData(prev => ({ ...prev, justificativa: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAprovar}>
                <Check className="mr-2 h-4 w-4" />
                Aprovar Cotação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}