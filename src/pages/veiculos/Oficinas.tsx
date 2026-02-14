import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { OficinaForm } from '@/components/veiculos/OficinaForm';
import { ESTADOS_BRASIL } from '@/lib/veiculos-utils';
import { FiltrosOficinas } from '@/types/veiculos';

export default function Oficinas() {
  const { oficinas, servicos } = useVeiculosStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosOficinas>({});

  const oficinasFiltradas = useMemo(() => {
    let result = [...oficinas];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      result = result.filter(o => 
        o.nome.toLowerCase().includes(busca) ||
        o.cidade.toLowerCase().includes(busca) ||
        (o.contato && o.contato.toLowerCase().includes(busca))
      );
    }

    if (filtros.uf) {
      result = result.filter(o => o.uf === filtros.uf);
    }

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [oficinas, filtros]);

  const stats = useMemo(() => {
    const ufsUnicas = new Set(oficinas.map(o => o.uf));
    return {
      total: oficinas.length,
      ufs: ufsUnicas.size,
    };
  }, [oficinas]);

  const getServicosOficina = (servicosIds: string[]) => {
    return servicos.filter(s => servicosIds.includes(s.id));
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Oficina
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Oficinas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
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
                  placeholder="Buscar por nome, cidade ou contato..."
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
          <CardTitle>Oficinas ({oficinasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oficinasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma oficina encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  oficinasFiltradas.map((oficina) => {
                    const servicosOficina = getServicosOficina(oficina.servicos_ids);
                    return (
                      <TableRow key={oficina.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{oficina.nome}</TableCell>
                        <TableCell>{oficina.cidade}</TableCell>
                        <TableCell>{oficina.uf}</TableCell>
                        <TableCell>{oficina.contato || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {servicosOficina.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Nenhum serviço</span>
                            ) : (
                              servicosOficina.slice(0, 2).map((servico) => (
                                <Badge key={servico.id} variant="secondary" className="text-xs">
                                  {servico.servico_especifico}
                                </Badge>
                              ))
                            )}
                            {servicosOficina.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{servicosOficina.length - 2} mais
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(oficina.id)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OficinaForm
        open={showForm}
        onOpenChange={setShowForm}
        oficinaId={editingId}
        onSuccess={handleCloseForm}
      />
    </div>
  );
}