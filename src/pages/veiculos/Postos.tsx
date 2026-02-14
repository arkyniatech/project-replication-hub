import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { PostoForm } from '@/components/veiculos/PostoForm';
import { formatCNPJ, ESTADOS_BRASIL } from '@/lib/veiculos-utils';
import { FiltrosPostos } from '@/types/veiculos';

export default function Postos() {
  const { postos } = useVeiculosStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosPostos>({});

  const postosFiltrados = useMemo(() => {
    let result = [...postos];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      result = result.filter(p => 
        p.nome.toLowerCase().includes(busca) ||
        p.cidade.toLowerCase().includes(busca) ||
        (p.cnpj && p.cnpj.includes(busca))
      );
    }

    if (filtros.uf) {
      result = result.filter(p => p.uf === filtros.uf);
    }

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [postos, filtros]);

  const stats = useMemo(() => {
    const ufsUnicas = new Set(postos.map(p => p.uf));
    return {
      total: postos.length,
      ufs: ufsUnicas.size,
    };
  }, [postos]);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Postos de Combustível</h1>
          <p className="text-muted-foreground">
            Gerencie os postos de combustível cadastrados
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Posto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Postos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Fuel className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estados Atendidos</p>
                <p className="text-2xl font-bold">{stats.ufs}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">UF</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, cidade ou CNPJ..."
                  value={filtros.busca || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado</label>
                  <Select 
                    value={filtros.uf || ''} 
                    onValueChange={(value) => setFiltros(prev => ({ ...prev, uf: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-estados">Todos os estados</SelectItem>
                      {ESTADOS_BRASIL.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Postos ({postosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum posto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  postosFiltrados.map((posto) => (
                    <TableRow key={posto.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{posto.nome}</TableCell>
                      <TableCell>{posto.cidade}</TableCell>
                      <TableCell>{posto.uf}</TableCell>
                      <TableCell className="font-mono">
                        {posto.cnpj ? formatCNPJ(posto.cnpj) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {posto.obs || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(posto.id)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PostoForm
        open={showForm}
        onOpenChange={setShowForm}
        postoId={editingId}
        onSuccess={handleCloseForm}
      />
    </div>
  );
}