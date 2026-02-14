import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Archive, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseLojas } from '../hooks/useSupabaseLojas';
import { useSupabaseCentrosCusto } from '../hooks/useSupabaseCentrosCusto';
import { PessoaForm } from '../components/PessoaForm';
import { FiltrosPessoas, Pessoa } from '../types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Pessoas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pessoas, isLoading, createPessoa, updatePessoa, removePessoa } = useSupabasePessoas();
  const { lojas } = useSupabaseLojas();
  const { centrosCusto } = useSupabaseCentrosCusto();

  const [filtros, setFiltros] = useState<FiltrosPessoas>({
    busca: '',
    unidadeId: 'all',
    ccId: 'all',
    situacao: 'all',
    cargo: 'all'
  });

  const [showForm, setShowForm] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<Pessoa | undefined>();

  // Filtrar pessoas
  const pessoasFiltradas = useMemo(() => {
    if (!pessoas) return [];

    return pessoas.filter(pessoa => {
      if (filtros.busca && !pessoa.nome.toLowerCase().includes(filtros.busca.toLowerCase()) &&
        !pessoa.matricula.toLowerCase().includes(filtros.busca.toLowerCase()) &&
        !pessoa.cpf.includes(filtros.busca)) {
        return false;
      }
      if (filtros.unidadeId !== 'all' && pessoa.lojaId !== filtros.unidadeId) return false;
      if (filtros.ccId !== 'all' && pessoa.ccId !== filtros.ccId) return false;
      if (filtros.situacao !== 'all' && pessoa.situacao !== filtros.situacao) return false;
      if (filtros.cargo !== 'all' && pessoa.cargo !== filtros.cargo) return false;
      return true;
    });
  }, [pessoas, filtros]);

  // Cargos únicos para filtro
  const cargosUnicos = useMemo(() => {
    const cargos = [...new Set(pessoas.map(p => p.cargo).filter(c => c && c.trim() !== ''))];
    return cargos.sort();
  }, [pessoas]);


  const handleSavePessoa = async (pessoaData: Omit<Pessoa, 'id'>) => {
    try {
      if (editingPessoa) {
        await updatePessoa.mutateAsync({
          id: editingPessoa.id,
          updates: pessoaData
        });
        toast({
          title: "Pessoa atualizada",
          description: `${pessoaData.nome} foi atualizada com sucesso.`
        });
      } else {
        await createPessoa.mutateAsync(pessoaData);
        toast({
          title: "Pessoa criada",
          description: `${pessoaData.nome} foi criada com sucesso.`
        });
      }

      setShowForm(false);
      setEditingPessoa(undefined);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar a pessoa.",
        variant: "destructive"
      });
    }
  };

  const handleEditPessoa = (pessoa: Pessoa) => {
    setEditingPessoa(pessoa);
    setShowForm(true);
  };

  const handleArchivePessoa = async (pessoa: Pessoa) => {
    try {
      await removePessoa.mutateAsync(pessoa.id);
      toast({
        title: "Pessoa arquivada",
        description: `${pessoa.nome} foi arquivada.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao arquivar",
        description: error.message || "Ocorreu um erro ao arquivar a pessoa.",
        variant: "destructive"
      });
    }
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getCCNome = (ccId: string) => {
    return centrosCusto.find(cc => cc.id === ccId)?.nome || ccId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pessoas</h1>
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingPessoa(undefined);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <PessoaForm
              pessoa={editingPessoa}
              onSave={handleSavePessoa}
              onCancel={() => {
                setShowForm(false);
                setEditingPessoa(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, matrícula ou CPF..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Select
                value={filtros.unidadeId}
                onValueChange={(value) => setFiltros({ ...filtros, unidadeId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Centro de Custo</label>
              <Select
                value={filtros.ccId}
                onValueChange={(value) => setFiltros({ ...filtros, ccId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {centrosCusto.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Situação</label>
              <Select
                value={filtros.situacao}
                onValueChange={(value) => setFiltros({ ...filtros, situacao: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo</label>
              <Select
                value={filtros.cargo}
                onValueChange={(value) => setFiltros({ ...filtros, cargo: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {cargosUnicos.map((cargo) => (
                    <SelectItem key={cargo} value={cargo}>
                      {cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de pessoas */}
      <Card>
        <CardHeader>
          <CardTitle>Colaboradores ({pessoasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando pessoas...</p>
            </div>
          ) : pessoasFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum colaborador encontrado com os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pessoasFiltradas.map((pessoa) => (
                    <TableRow key={pessoa.id}>
                      <TableCell className="font-medium">{pessoa.nome}</TableCell>
                      <TableCell>{pessoa.matricula}</TableCell>
                      <TableCell>{pessoa.cargo}</TableCell>
                      <TableCell>{getLojaNome(pessoa.lojaId)}</TableCell>
                      <TableCell>
                        {format(parseISO(pessoa.admissaoISO), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={pessoa.situacao === 'ativo' ? 'default' : 'secondary'}>
                          {pessoa.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/rh/pessoas/${pessoa.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPessoa(pessoa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {pessoa.situacao === 'ativo' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchivePessoa(pessoa)}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}