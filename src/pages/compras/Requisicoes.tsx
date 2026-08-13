import { useState } from 'react';
import { Plus, Search, Send, X, Edit2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSupabaseRequisicoes, type NovaRequisicaoInput, type RequisicaoComItens } from '@/modules/compras/hooks/useSupabaseRequisicoes';
import { useSupabaseCatalogo } from '@/modules/almox/hooks/useSupabaseCatalogo';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useCurrentUserName } from '@/hooks/useCurrentUserName';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  solicitado: 'bg-blue-100 text-blue-800',
  em_cotacao: 'bg-yellow-100 text-yellow-800',
  cotado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

const prioridadeColors: Record<string, string> = {
  baixa: 'bg-green-100 text-green-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-800'
};

interface FormItem {
  id: string;
  item_catalogo_id: string | null;
  sku: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  obs: string;
}

export default function Requisicoes() {
  const { can } = useRbac();
  const { lojaAtual } = useMultiunidade();
  const solicitanteNome = useCurrentUserName();
  const { requisicoes, isLoading, criar, editar, solicitar, enviarParaCotacao } = useSupabaseRequisicoes(lojaAtual?.id);
  const { itens: catalogo } = useSupabaseCatalogo();

  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    centroCusto: '',
    categoria: '' as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta',
    observacoes: '',
    itens: [] as FormItem[]
  });

  // quantidade fica como texto: com estado numérico, digitar "0" e depois "."
  // faz a re-renderização apagar o ponto, tornando 0,5 impossível de digitar.
  const [newItem, setNewItem] = useState({ item_catalogo_id: null as string | null, sku: '', descricao: '', unidade: 'UN', quantidade: '1', obs: '' });

  const filteredRequisicoes = requisicoes.filter(req => {
    const matchSearch = req.numero.toLowerCase().includes(search.toLowerCase()) ||
      (req.solicitante_nome || '').toLowerCase().includes(search.toLowerCase()) ||
      req.itens.some(item => item.descricao.toLowerCase().includes(search.toLowerCase()));
    const matchCategoria = selectedCategoria === 'all' || req.categoria === selectedCategoria;
    const matchStatus = selectedStatus === 'all' || req.status === selectedStatus;
    return matchSearch && matchCategoria && matchStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaAtual) { toast.error('Selecione uma loja'); return; }
    if (!formData.categoria || formData.itens.length === 0) {
      toast.error('Preencha a categoria e adicione pelo menos um item');
      return;
    }

    const input: NovaRequisicaoInput = {
      loja_id: lojaAtual.id,
      categoria: formData.categoria as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL',
      prioridade: formData.prioridade,
      centro_custo: formData.centroCusto || null,
      observacoes: formData.observacoes || null,
      itens: formData.itens.map(i => ({
        item_catalogo_id: i.item_catalogo_id,
        sku: i.sku || null,
        descricao: i.descricao,
        unidade: i.unidade,
        quantidade: i.quantidade,
        obs: i.obs || null,
      })),
    };

    if (editingId) {
      editar.mutate({ id: editingId, input }, { onSuccess: resetForm });
    } else {
      criar.mutate(input, { onSuccess: resetForm });
    }
  };

  const resetForm = () => {
    setFormData({ centroCusto: '', categoria: '', prioridade: 'media', observacoes: '', itens: [] });
    setNewItem({ item_catalogo_id: null, sku: '', descricao: '', unidade: 'UN', quantidade: '1', obs: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddItem = () => {
    if (!newItem.descricao.trim()) { toast.error('Informe a descrição do item'); return; }
    const quantidade = Number(newItem.quantidade.replace(',', '.'));
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error('Informe uma quantidade maior que zero');
      return;
    }
    const item: FormItem = {
      id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...newItem,
      quantidade,
    };
    setFormData(prev => ({ ...prev, itens: [...prev.itens, item] }));
    setNewItem({ item_catalogo_id: null, sku: '', descricao: '', unidade: 'UN', quantidade: '1', obs: '' });
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({ ...prev, itens: prev.itens.filter(item => item.id !== itemId) }));
  };

  const handleEdit = (req: RequisicaoComItens) => {
    setFormData({
      centroCusto: req.centro_custo || '',
      categoria: req.categoria as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL',
      prioridade: req.prioridade as 'baixa' | 'media' | 'alta',
      observacoes: req.observacoes || '',
      itens: req.itens.map(i => ({
        id: i.id,
        item_catalogo_id: i.item_catalogo_id ?? null,
        sku: i.sku || '',
        descricao: i.descricao,
        unidade: i.unidade,
        quantidade: Number(i.quantidade),
        obs: i.obs || '',
      })),
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
          <p className="text-muted-foreground">Gerencie requisições internas de compras</p>
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
                <DialogTitle>{editingId ? 'Editar Requisição' : 'Nova Requisição'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="solicitante">Solicitante</Label>
                    <Input id="solicitante" value={solicitanteNome} disabled readOnly />
                    <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente com o usuário logado</p>
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

                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-12">
                          <Label>Buscar do catálogo (opcional — vincula ao estoque)</Label>
                          <Select
                            value={newItem.item_catalogo_id ?? '__livre__'}
                            onValueChange={(v) => {
                              if (v === '__livre__') { setNewItem(prev => ({ ...prev, item_catalogo_id: null })); return; }
                              const it = catalogo.find(c => c.id === v);
                              if (it) setNewItem(prev => ({ ...prev, item_catalogo_id: it.id, sku: it.sku, descricao: it.descricao, unidade: it.unidade }));
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Item livre (digite abaixo)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__livre__">— Item livre —</SelectItem>
                              {catalogo.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.sku} — {c.descricao}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-3">
                          <Label htmlFor="sku">SKU</Label>
                          <Input
                            id="sku"
                            value={newItem.sku}
                            onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="md:col-span-9">
                          <Label htmlFor="descricao">Descrição *</Label>
                          <Textarea
                            id="descricao"
                            value={newItem.descricao}
                            onChange={(e) => setNewItem(prev => ({ ...prev, descricao: e.target.value }))}
                            placeholder="Descrição completa do item"
                            rows={2}
                            className="resize-y"
                          />
                        </div>

                        <div className="md:col-span-3">
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

                        <div className="md:col-span-3">
                          <Label htmlFor="quantidade">Quantidade</Label>
                          <Input
                            id="quantidade"
                            type="number"
                            min="1"
                            value={newItem.quantidade}
                            inputMode="decimal"
                            step="any"
                            onChange={(e) => setNewItem(prev => ({ ...prev, quantidade: e.target.value }))}
                          />
                        </div>

                        <div className="md:col-span-6 flex items-end">
                          <Button type="button" onClick={handleAddItem}>Adicionar</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {formData.itens.length > 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {formData.itens.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <span className="font-medium">{item.sku}</span>
                                <span className="ml-2 text-muted-foreground">{item.descricao}</span>
                                <span className="ml-2 text-sm">{item.quantidade} {item.unidade}</span>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
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
                  <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit" disabled={criar.isPending || editar.isPending}>
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
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
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
                  <TableCell>{lojaAtual?.nome || 'Loja'}</TableCell>
                  <TableCell>{req.solicitante_nome}</TableCell>
                  <TableCell>{req.centro_custo || '-'}</TableCell>
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
                          {item.sku || item.descricao.slice(0, 10)}
                        </Badge>
                      ))}
                      {req.itens.length > 2 && (
                        <Badge variant="secondary" className="text-xs">+{req.itens.length - 2}</Badge>
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
                        <Button variant="ghost" size="sm" title="Editar" onClick={() => handleEdit(req)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Item 1: destrava o fluxo — rascunho -> solicitado */}
                      {can('compras:req:create') && req.status === 'rascunho' && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Solicitar (enviar para compras)"
                          disabled={solicitar.isPending}
                          onClick={() => solicitar.mutate(req.id)}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-1" /> Solicitar
                        </Button>
                      )}

                      {can('compras:cot:create') && req.status === 'solicitado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Abrir cotação"
                          disabled={enviarParaCotacao.isPending}
                          onClick={() => enviarParaCotacao.mutate(req.id)}
                        >
                          <Send className="h-4 w-4 mr-1" /> Cotar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequisicoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhuma requisição encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
