import { useState } from 'react';
import { Plus, Search, Filter, FileText, Send, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useComprasStore, ItemRequisicao } from '@/modules/compras/store/comprasStore';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';

const statusColors = {
  rascunho: 'bg-gray-100 text-gray-800',
  solicitado: 'bg-blue-100 text-blue-800',
  em_cotacao: 'bg-yellow-100 text-yellow-800',
  cotado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

const prioridadeColors = {
  baixa: 'bg-green-100 text-green-800',
  media: 'bg-yellow-100 text-yellow-800', 
  alta: 'bg-red-100 text-red-800'
};

export default function Requisicoes() {
  const { can } = useRbac();
  const { requisicoes, criarRequisicao, editarRequisicao, enviarParaCotacao } = useComprasStore();
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    lojaId: 'loja-1', // Mock
    solicitante: '',
    centroCusto: '',
    categoria: '' as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta',
    observacoes: '',
    itens: [] as ItemRequisicao[]
  });

  const [newItem, setNewItem] = useState({
    sku: '',
    descricao: '',
    unidade: 'UN',
    quantidade: 1,
    obs: ''
  });

  const filteredRequisicoes = requisicoes.filter(req => {
    const matchSearch = req.numero.toLowerCase().includes(search.toLowerCase()) ||
                       req.solicitante.toLowerCase().includes(search.toLowerCase()) ||
                       req.itens.some(item => item.descricao.toLowerCase().includes(search.toLowerCase()));
    const matchCategoria = selectedCategoria === 'all' || req.categoria === selectedCategoria;
    const matchStatus = selectedStatus === 'all' || req.status === selectedStatus;
    
    return matchSearch && matchCategoria && matchStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoria || formData.itens.length === 0) {
      toast.error('Preencha a categoria e adicione pelo menos um item');
      return;
    }

    if (editingId) {
      editarRequisicao(editingId, {
        ...formData,
        categoria: formData.categoria as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL'
      });
      toast.success('Requisição atualizada com sucesso');
    } else {
      criarRequisicao({
        ...formData,
        anexos: [],
        status: 'rascunho',
        categoria: formData.categoria as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL'
      });
      toast.success('Requisição criada com sucesso');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      lojaId: 'loja-1',
      solicitante: '',
      centroCusto: '',
      categoria: '',
      prioridade: 'media',
      observacoes: '',
      itens: []
    });
    setNewItem({
      sku: '',
      descricao: '',
      unidade: 'UN',
      quantidade: 1,
      obs: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddItem = () => {
    if (!newItem.sku || !newItem.descricao) {
      toast.error('Preencha SKU e descrição do item');
      return;
    }

    const item: ItemRequisicao = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...newItem
    };

    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, item]
    }));

    setNewItem({
      sku: '',
      descricao: '',
      unidade: 'UN',
      quantidade: 1,
      obs: ''
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }));
  };

  const handleEnviarParaCotacao = (reqId: string) => {
    const cotacaoId = enviarParaCotacao(reqId);
    if (cotacaoId) {
      toast.success('Requisição enviada para cotação');
    }
  };

  const handleEdit = (req: typeof requisicoes[0]) => {
    setFormData({
      lojaId: req.lojaId,
      solicitante: req.solicitante,
      centroCusto: req.centroCusto || '',
      categoria: req.categoria,
      prioridade: req.prioridade,
      observacoes: req.observacoes || '',
      itens: req.itens
    });
    setEditingId(req.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Requisições</h1>
          <p className="text-muted-foreground">
            Gerencie requisições internas de compras
          </p>
        </div>
        
        {can('compras:req:create') && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Requisição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Editar Requisição' : 'Nova Requisição'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="solicitante">Solicitante *</Label>
                    <Input
                      id="solicitante"
                      value={formData.solicitante}
                      onChange={(e) => setFormData(prev => ({ ...prev, solicitante: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="centroCusto">Centro de Custo</Label>
                    <Input
                      id="centroCusto"
                      value={formData.centroCusto}
                      onChange={(e) => setFormData(prev => ({ ...prev, centroCusto: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select 
                      value={formData.categoria} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PATRIMONIAL">Patrimonial</SelectItem>
                        <SelectItem value="PECA">Peças</SelectItem>
                        <SelectItem value="CONSUMIVEL">Consumíveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select 
                      value={formData.prioridade} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Itens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Itens da Requisição</Label>
                  </div>
                  
                  {/* Add new item */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <Label htmlFor="sku">SKU *</Label>
                          <Input
                            id="sku"
                            value={newItem.sku}
                            onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="Ex: PEC001"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="descricao">Descrição *</Label>
                          <Input
                            id="descricao"
                            value={newItem.descricao}
                            onChange={(e) => setNewItem(prev => ({ ...prev, descricao: e.target.value }))}
                            placeholder="Descrição do item"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="unidade">Unidade</Label>
                          <Select 
                            value={newItem.unidade} 
                            onValueChange={(value) => setNewItem(prev => ({ ...prev, unidade: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UN">UN</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="M">M</SelectItem>
                              <SelectItem value="PCT">PCT</SelectItem>
                              <SelectItem value="JG">JG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="quantidade">Quantidade</Label>
                          <Input
                            id="quantidade"
                            type="number"
                            min="1"
                            value={newItem.quantidade}
                            onChange={(e) => setNewItem(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <Button type="button" onClick={handleAddItem}>
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items list */}
                  {formData.itens.length > 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {formData.itens.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <span className="font-medium">{item.sku}</span>
                                <span className="ml-2 text-muted-foreground">{item.descricao}</span>
                                <span className="ml-2 text-sm">
                                  {item.quantidade} {item.unidade}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? 'Atualizar' : 'Criar'} Requisição
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, solicitante ou item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="PATRIMONIAL">Patrimonial</SelectItem>
                <SelectItem value="PECA">Peças</SelectItem>
                <SelectItem value="CONSUMIVEL">Consumíveis</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="solicitado">Solicitado</SelectItem>
                <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                <SelectItem value="cotado">Cotado</SelectItem>
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
                <TableHead>Nº REQ</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>CC</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequisicoes.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.numero}</TableCell>
                  <TableCell>Loja Principal</TableCell>
                  <TableCell>{req.solicitante}</TableCell>
                  <TableCell>{req.centroCusto || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{req.categoria}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={prioridadeColors[req.prioridade]}>
                      {req.prioridade.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {req.itens.slice(0, 2).map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item.sku}
                        </Badge>
                      ))}
                      {req.itens.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{req.itens.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[req.status]}>
                      {req.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {can('compras:req:view') && req.status === 'rascunho' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(req)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {can('compras:cot:create') && req.status === 'solicitado' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEnviarParaCotacao(req.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}