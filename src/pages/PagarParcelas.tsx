import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Search, Filter, DollarSign, Download, FileText, CreditCard, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PagarModal } from '@/components/contas-pagar/PagarModal';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { NovoTituloDrawer } from '@/components/contas-pagar/NovoTituloDrawer';
import { DetalheTituloDrawer } from '@/components/contas-pagar/DetalheTituloDrawer';
import { EditarParcelaModal } from '@/components/contas-pagar/EditarParcelaModal';
import { AnexosModal } from '@/components/contas-pagar/AnexosModal';
import { useSupabaseCategoriasN2 } from '@/hooks/useSupabaseCategoriasN2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type StatusFilter = 'all' | 'hoje' | 'amanha' | 'semana' | 'mes' | 'atrasadas';

function getStatusColor(status: string) {
  switch (status) {
    case 'paga':
      return 'text-green-700 bg-green-100';
    case 'vencida':
      return 'text-red-700 bg-red-100';
    case 'parcial':
      return 'text-orange-700 bg-orange-100';
    case 'negociacao':
      return 'text-blue-700 bg-blue-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'paga':
      return <CheckCircle className="w-4 h-4" />;
    case 'vencida':
      return <XCircle className="w-4 h-4" />;
    case 'parcial':
      return <AlertTriangle className="w-4 h-4" />;
    case 'negociacao':
      return <Clock className="w-4 h-4" />;
    default:
      return <Calendar className="w-4 h-4" />;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'paga':
      return 'Paga';
    case 'vencida':
      return 'Vencida';
    case 'parcial':
      return 'Parcial';
    case 'negociacao':
      return 'Negociação';
    default:
      return 'A Vencer';
  }
}

export default function PagarParcelas() {
  const { can } = usePermissions();
  const { lojaAtual, lojas: lojasPermitidas } = useMultiunidade();
  const { parcelas, isLoading } = useSupabaseParcelasPagar({ lojaId: lojaAtual?.id });
  const { categorias } = useSupabaseCategoriasN2();

  // Fetch lojas for filter
  const { data: lojas } = useQuery({
    queryKey: ['lojas-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lojas').select('id, nome, codigo').eq('ativo', true).order('nome');
      if (error) throw error;
      return data || [];
    }
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedParcelas, setSelectedParcelas] = useState<string[]>([]);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [showNovoTitulo, setShowNovoTitulo] = useState(false);
  const [showDetalheTitulo, setShowDetalheTitulo] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<string | null>(null);
  const [showEditarParcela, setShowEditarParcela] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<string | null>(null);
  const [showAnexos, setShowAnexos] = useState(false);
  const [anexosConfig, setAnexosConfig] = useState<{tipo: 'titulo' | 'parcela', id: string, nome: string} | null>(null);

  // Verificar permissões
  const hasAccess = can('financeiro', 'ver');
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar as parcelas de Contas a Pagar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredParcelas = useMemo(() => {
    return parcelas.filter(parcela => {
      // Filtro por status/período
      if (statusFilter !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        switch (statusFilter) {
          case 'hoje':
            return parcela.vencimento === today && parcela.status !== 'paga';
          case 'amanha':
            return parcela.vencimento === tomorrow && parcela.status !== 'paga';
          case 'semana':
            return parcela.vencimento <= nextWeek && parcela.vencimento >= today && parcela.status !== 'paga';
          case 'mes':
            return parcela.vencimento <= nextMonth && parcela.vencimento >= today && parcela.status !== 'paga';
          case 'atrasadas':
            return parcela.vencimento < today && parcela.status !== 'paga';
        }
      }

      // Filtro por termo de busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fornecedor = parcela.fornecedor?.nome || '';
        const categoria = parcela.categoria_codigo || '';
        return (
          fornecedor.toLowerCase().includes(term) ||
          categoria.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [parcelas, statusFilter, searchTerm, selectedUnidade, selectedCategory]);

  const handleSelectParcela = (parcelaId: string, checked: boolean) => {
    if (checked) {
      setSelectedParcelas([...selectedParcelas, parcelaId]);
    } else {
      setSelectedParcelas(selectedParcelas.filter(id => id !== parcelaId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const payableParcelas = filteredParcelas
        .filter(p => p.status !== 'PAGA')
        .map(p => p.id);
      setSelectedParcelas(payableParcelas);
    } else {
      setSelectedParcelas([]);
    }
  };

  const handlePagarSelecionadas = () => {
    if (selectedParcelas.length === 0) {
      toast.error("Selecione ao menos uma parcela para pagar");
      return;
    }
    setShowPagarModal(true);
  };

  const handleExportCSV = () => {
    toast.success("Download do CSV iniciado");
  };

  const handleGeneratePDF = () => {
    toast.success("PDF será criado com os dados filtrados");
  };

  const getFilterCount = (filter: StatusFilter) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (filter) {
      case 'hoje':
        return parcelas.filter(p => p.vencimento === today && p.status !== 'PAGA').length;
      case 'amanha':
        return parcelas.filter(p => p.vencimento === tomorrow && p.status !== 'PAGA').length;
      case 'semana':
        return parcelas.filter(p => p.vencimento <= nextWeek && p.vencimento >= today && p.status !== 'PAGA').length;
      case 'mes':
        return parcelas.filter(p => p.vencimento <= nextMonth && p.vencimento >= today && p.status !== 'PAGA').length;
      case 'atrasadas':
        return parcelas.filter(p => p.vencimento < today && p.status !== 'PAGA').length;
      default:
        return parcelas.length;
    }
  };

  const selectedParcelasData = filteredParcelas.filter(p => selectedParcelas.includes(p.id));
  const totalSelected = selectedParcelasData.reduce((sum, p) => sum + p.saldo, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando parcelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Parcelas a Pagar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lojaAtual ? `Loja: ${lojaAtual.nome}` : 'Todas as lojas'} • 
                {filteredParcelas.length} parcelas encontradas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowNovoTitulo(true)}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Novo Título
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros rápidos */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'hoje', label: 'Hoje' },
                { key: 'amanha', label: 'Amanhã' },
                { key: 'semana', label: 'Semana' },
                { key: 'mes', label: 'Mês' },
                { key: 'atrasadas', label: 'Atrasadas' }
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.key as StatusFilter)}
                  className="relative"
                >
                  {filter.label}
                  {filter.key !== 'all' && (
                    <Badge 
                      variant="secondary" 
                      className="ml-2 h-5 px-1 text-xs"
                    >
                      {getFilterCount(filter.key as StatusFilter)}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Filtros detalhados */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar fornecedor, categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {(lojas || []).map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {(categorias || []).map(cat => (
                    <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Mais Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações em lote */}
        {selectedParcelas.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    {selectedParcelas.length} parcelas selecionadas
                  </Badge>
                  <span className="text-sm font-medium">
                    Total: {formatCurrency(totalSelected)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedParcelas([])}
                  >
                    Limpar Seleção
                  </Button>
                  <Button size="sm" onClick={handlePagarSelecionadas}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar Selecionadas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Lista de Parcelas
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedParcelas.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcelas.map((parcela) => (
                  <TableRow key={parcela.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedParcelas.includes(parcela.id)}
                        onCheckedChange={(checked) => handleSelectParcela(parcela.id, checked as boolean)}
                        disabled={parcela.status === 'PAGA'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(parcela.vencimento).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <button 
                          className="font-medium hover:underline text-left"
                          onClick={() => {
                            setTituloSelecionado(parcela.titulo_id);
                            setShowDetalheTitulo(true);
                          }}
                        >
                          {parcela.fornecedor?.nome || 'N/A'}
                        </button>
                        <div className="text-sm text-muted-foreground">
                          {parcela.titulo?.numero || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Loja {lojaAtual?.nome || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {parcela.categoria_codigo || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parcela.valor)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(parcela.pago)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parcela.saldo)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(parcela.status.toLowerCase())}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(parcela.status.toLowerCase())}
                          {getStatusLabel(parcela.status.toLowerCase())}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {parcela.status !== 'PAGA' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedParcelas([parcela.id]);
                              setShowPagarModal(true);
                            }}
                          >
                            Pagar
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

      {/* Modais */}
      <PagarModal
        open={showPagarModal}
        onClose={() => {
          setShowPagarModal(false);
          setSelectedParcelas([]);
        }}
        parcelas={selectedParcelasData.map(p => ({
          id: p.id,
          vencimento: p.vencimento,
          fornecedor: p.fornecedor?.nome || 'N/A',
          unidade: lojaAtual?.nome || 'N/A',
          categoria: p.categoria_codigo || 'N/A',
          valor: p.valor,
          pago: p.pago,
          saldo: p.saldo,
          status: p.status.toLowerCase() as any,
          tituloId: p.titulo_id
        }))}
        onSuccess={() => {
          setShowPagarModal(false);
          setSelectedParcelas([]);
          toast.success("As parcelas foram pagas com sucesso");
        }}
      />

      <NovoTituloDrawer
        open={showNovoTitulo}
        onClose={() => setShowNovoTitulo(false)}
        onSuccess={() => {
          setShowNovoTitulo(false);
          toast.success("Novo título foi criado com sucesso");
        }}
      />

      <DetalheTituloDrawer
        open={showDetalheTitulo}
        onClose={() => setShowDetalheTitulo(false)}
        tituloId={tituloSelecionado}
        onEditParcela={(parcelaId) => {
          setParcelaSelecionada(parcelaId);
          setShowEditarParcela(true);
        }}
        onOpenAnexos={(tipo, id) => {
          setAnexosConfig({ tipo, id, nome: tipo === 'titulo' ? 'Título' : 'Parcela' });
          setShowAnexos(true);
        }}
      />

      <EditarParcelaModal
        open={showEditarParcela}
        onClose={() => setShowEditarParcela(false)}
        parcelaId={parcelaSelecionada}
        onSuccess={() => {
          setShowEditarParcela(false);
          setParcelaSelecionada(null);
        }}
      />

      <AnexosModal
        open={showAnexos}
        onClose={() => setShowAnexos(false)}
        tipo={anexosConfig?.tipo || 'titulo'}
        id={anexosConfig?.id || null}
        nome={anexosConfig?.nome || ''}
      />
    </div>
  );
}