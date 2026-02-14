import { useState, useMemo } from 'react';
import { Plus, Search, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { OleoForm } from '@/components/veiculos/OleoForm';

export default function Oleos() {
  const { oleos } = useVeiculosStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const oleosFiltrados = useMemo(() => {
    let result = [...oleos];

    if (busca) {
      const buscaLower = busca.toLowerCase();
      result = result.filter(o => 
        o.tipo_especificacao.toLowerCase().includes(buscaLower) ||
        (o.obs && o.obs.toLowerCase().includes(buscaLower))
      );
    }

    return result.sort((a, b) => a.tipo_especificacao.localeCompare(b.tipo_especificacao));
  }, [oleos, busca]);

  const stats = useMemo(() => ({
    total: oleos.length,
  }), [oleos]);

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
          <h1 className="text-3xl font-bold tracking-tight">Óleos e Lubrificantes</h1>
          <p className="text-muted-foreground">
            Gerencie os tipos de óleo e seus intervalos de troca
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Óleo
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Óleos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Droplet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por especificação ou observações..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Óleos ({oleosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Especificação</TableHead>
                  <TableHead>Intervalo (km)</TableHead>
                  <TableHead>Intervalo (meses)</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oleosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum óleo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  oleosFiltrados.map((oleo) => (
                    <TableRow key={oleo.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {oleo.tipo_especificacao}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR').format(oleo.intervalo_km)} km
                      </TableCell>
                      <TableCell>
                        {oleo.intervalo_meses} {oleo.intervalo_meses === 1 ? 'mês' : 'meses'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {oleo.obs || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(oleo.id)}
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

      <OleoForm
        open={showForm}
        onOpenChange={setShowForm}
        oleoId={editingId}
        onSuccess={handleCloseForm}
      />
    </div>
  );
}