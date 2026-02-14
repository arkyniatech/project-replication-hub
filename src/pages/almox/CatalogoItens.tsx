import { useState } from 'react';
import { Plus, Search, Edit2, Eye, Archive, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlmoxStore, CatalogoItem } from '@/modules/almox/store/almoxStore';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';

const tipoColors = {
  PATRIMONIAL: 'bg-purple-100 text-purple-800',
  PECA: 'bg-blue-100 text-blue-800',
  CONSUMIVEL: 'bg-green-100 text-green-800'
};

const controleColors = {
  SERIE: 'bg-yellow-100 text-yellow-800',
  SALDO: 'bg-gray-100 text-gray-800'
};

export default function CatalogoItens() {
  const { can } = useRbac();
  const { catalogoItens, cadastrarItem, editarItem, inativarItem } = useAlmoxStore();
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tipo: 'PECA' as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL',
    sku: '',
    descricao: '',
    unidade: 'UN',
    grupo: '',
    modelo: '',
    controle: 'SALDO' as 'SERIE' | 'SALDO',
    ativo: true,
    estoqueMinimo: undefined as number | undefined,
    estoqueMaximo: undefined as number | undefined,
    observacoes: ''
  });

  const filteredItens = catalogoItens.filter(item => {
    const matchSearch = item.sku.toLowerCase().includes(search.toLowerCase()) ||
                       item.descricao.toLowerCase().includes(search.toLowerCase()) ||
                       (item.grupo && item.grupo.toLowerCase().includes(search.toLowerCase()));
    const matchTipo = selectedTipo === 'all' || item.tipo === selectedTipo;
    const matchTab = selectedTab === 'all' || item.tipo === selectedTab;
    
    return matchSearch && matchTipo && matchTab;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.descricao) {
      toast.error('Preencha SKU e descrição');
      return;
    }

    // Check for duplicate SKU
    const existingSku = catalogoItens.find(item => 
      item.sku === formData.sku && item.id !== editingId
    );
    
    if (existingSku) {
      toast.error('SKU já existe no catálogo');
      return;
    }

    if (editingId) {
      editarItem(editingId, formData);
      toast.success('Item atualizado com sucesso');
    } else {
      const { estoqueMinimo, estoqueMaximo, observacoes, ...data } = formData;
      cadastrarItem({
        ...data,
        estoqueMinimo,
        estoqueMaximo,
        observacoes
      });
      toast.success('Item cadastrado com sucesso');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tipo: 'PECA',
      sku: '',
      descricao: '',
      unidade: 'UN',
      grupo: '',
      modelo: '',
      controle: 'SALDO',
      ativo: true,
      estoqueMinimo: undefined,
      estoqueMaximo: undefined,
      observacoes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: CatalogoItem) => {
    setFormData({
      tipo: item.tipo,
      sku: item.sku,
      descricao: item.descricao,
      unidade: item.unidade,
      grupo: item.grupo || '',
      modelo: item.modelo || '',
      controle: item.controle,
      ativo: item.ativo,
      estoqueMinimo: item.estoqueMinimo,
      estoqueMaximo: item.estoqueMaximo,
      observacoes: item.observacoes || ''
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleInativar = (itemId: string) => {
    inativarItem(itemId);
    toast.success('Item inativado');
  };

  // Check RBAC for Patrimonial
  const canViewPatrimonial = can('almox:patrimonial');
  const canEditPatrimonial = can('almox:patrimonial');
  
  const availableTabs = canViewPatrimonial 
    ? [
        { value: 'all', label: 'Todos', count: catalogoItens.length },
        { value: 'PATRIMONIAL', label: 'Patrimonial', count: catalogoItens.filter(i => i.tipo === 'PATRIMONIAL').length },
        { value: 'PECA', label: 'Peças', count: catalogoItens.filter(i => i.tipo === 'PECA').length },
        { value: 'CONSUMIVEL', label: 'Consumíveis', count: catalogoItens.filter(i => i.tipo === 'CONSUMIVEL').length }
      ]
    : [
        { value: 'all', label: 'Todos', count: catalogoItens.filter(i => i.tipo !== 'PATRIMONIAL').length },
        { value: 'PECA', label: 'Peças', count: catalogoItens.filter(i => i.tipo === 'PECA').length },
        { value: 'CONSUMIVEL', label: 'Consumíveis', count: catalogoItens.filter(i => i.tipo === 'CONSUMIVEL').length }
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Itens</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de itens do almoxarifado
          </p>
        </div>
        
        {(can('almox:view') && (selectedTab !== 'PATRIMONIAL' || canEditPatrimonial)) && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Editar Item' : 'Novo Item'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select 
                      value={formData.tipo} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as any }))}
                      disabled={!canEditPatrimonial && formData.tipo === 'PATRIMONIAL'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {canEditPatrimonial && (
                          <SelectItem value="PATRIMONIAL">Patrimonial</SelectItem>
                        )}
                        <SelectItem value="PECA">Peças</SelectItem>
                        <SelectItem value="CONSUMIVEL">Consumíveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="controle">Controle *</Label>
                    <Select 
                      value={formData.controle} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, controle: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALDO">Por Saldo</SelectItem>
                        <SelectItem value="SERIE">Por Série</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Ex: PEC001"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="unidade">Unidade</Label>
                    <Select 
                      value={formData.unidade} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, unidade: value }))}
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
                        <SelectItem value="CX">CX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição detalhada do item"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grupo">Grupo</Label>
                    <Input
                      id="grupo"
                      value={formData.grupo}
                      onChange={(e) => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                      placeholder="Ex: Motor, Freios, Informática"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input
                      id="modelo"
                      value={formData.modelo}
                      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                      placeholder="Ex: Universal, Civic"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
                    <Input
                      id="estoqueMinimo"
                      type="number"
                      min="0"
                      value={formData.estoqueMinimo || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estoqueMinimo: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="estoqueMaximo">Estoque Máximo</Label>
                    <Input
                      id="estoqueMaximo"
                      type="number"
                      min="0"
                      value={formData.estoqueMaximo || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estoqueMaximo: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
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

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? 'Atualizar' : 'Cadastrar'} Item
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              {availableTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} ({tab.count})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por SKU, descrição ou grupo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Controle</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.descricao}</p>
                      {item.modelo && (
                        <p className="text-sm text-muted-foreground">Modelo: {item.modelo}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tipoColors[item.tipo]}>
                      {item.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.grupo || '-'}</TableCell>
                  <TableCell>{item.unidade}</TableCell>
                  <TableCell>
                    <Badge className={controleColors[item.controle]}>
                      {item.controle}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.estoqueMinimo && (
                        <div>Mín: {item.estoqueMinimo}</div>
                      )}
                      {item.estoqueMaximo && (
                        <div>Máx: {item.estoqueMaximo}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? "outline" : "secondary"}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(item.tipo !== 'PATRIMONIAL' || canEditPatrimonial) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {(item.tipo !== 'PATRIMONIAL' || canEditPatrimonial) && item.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInativar(item.id)}
                        >
                          <Archive className="h-4 w-4" />
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