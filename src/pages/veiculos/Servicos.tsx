import { useState, useMemo } from 'react';
import { Plus, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { ServicoForm } from '@/components/veiculos/ServicoForm';
import { CRITICIDADE_LABELS, CRITICIDADE_COLORS } from '@/lib/veiculos-utils';

export default function Servicos() {
  const { servicos } = useVeiculosStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const servicosFiltrados = useMemo(() => {
    let result = [...servicos];

    if (busca) {
      const buscaLower = busca.toLowerCase();
      result = result.filter(s => 
        s.grupo.toLowerCase().includes(buscaLower) ||
        s.servico_especifico.toLowerCase().includes(buscaLower) ||
        (s.obs && s.obs.toLowerCase().includes(buscaLower))
      );
    }

    return result.sort((a, b) => {
      const groupCompare = a.grupo.localeCompare(b.grupo);
      if (groupCompare !== 0) return groupCompare;
      return a.servico_especifico.localeCompare(b.servico_especifico);
    });
  }, [servicos, busca]);

  const stats = useMemo(() => {
    const grupos = new Set(servicos.map(s => s.grupo));
    return {
      total: servicos.length,
      grupos: grupos.size,
      alta: servicos.filter(s => s.criticidade === 'ALTA').length,
      media: servicos.filter(s => s.criticidade === 'MEDIA').length,
      baixa: servicos.filter(s => s.criticidade === 'BAIXA').length,
    };
  }, [servicos]);

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
          Novo Serviço
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Grupos</p>
                <p className="text-2xl font-bold">{stats.grupos}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alta</p>
                <p className="text-2xl font-bold text-red-600">{stats.alta}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Média</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.media}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Baixa</p>
                <p className="text-2xl font-bold text-blue-600">{stats.baixa}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-blue-500" />
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
                  placeholder="Buscar por grupo, serviço ou observações..."
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
          <CardTitle>Serviços ({servicosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum serviço encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  servicosFiltrados.map((servico) => (
                    <TableRow key={servico.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{servico.grupo}</TableCell>
                      <TableCell>{servico.servico_especifico}</TableCell>
                      <TableCell>
                        <Badge className={CRITICIDADE_COLORS[servico.criticidade]}>
                          {CRITICIDADE_LABELS[servico.criticidade]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {servico.obs || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(servico.id)}
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

      <ServicoForm
        open={showForm}
        onOpenChange={setShowForm}
        servicoId={editingId}
        onSuccess={handleCloseForm}
      />
    </div>
  );
}