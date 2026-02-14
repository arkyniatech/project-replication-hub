import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// Mock aprovação para demonstração
interface AprovacaoMock {
  id: string;
  tipo: 'ponto' | 'ferias' | 'ausencia' | 'admissao' | 'beneficio';
  pessoaId: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  dataSolicitacao: string;
  descricao: string;
}

export default function Aprovacoes() {
  const { pessoas } = useRhStore();
  
  const [filtros, setFiltros] = useState({
    tipo: 'all',
    status: 'all',
    busca: ''
  });

  // Mock de aprovações para demonstração
  const aprovacoesMock: AprovacaoMock[] = [
    {
      id: '1',
      tipo: 'ferias',
      pessoaId: pessoas[0]?.id || '1',
      status: 'pendente',
      dataSolicitacao: new Date().toISOString(),
      descricao: 'Solicitação de férias - 15 dias'
    },
    {
      id: '2',
      tipo: 'ponto',
      pessoaId: pessoas[1]?.id || '2',
      status: 'pendente',
      dataSolicitacao: new Date().toISOString(),
      descricao: 'Ajuste de ponto - 2 horas extras'
    }
  ];

  const aprovacoesFiltradas = useMemo(() => {
    return aprovacoesMock.filter(aprovacao => {
      const pessoa = pessoas.find(p => p.id === aprovacao.pessoaId);
      const nomeMatch = pessoa?.nome.toLowerCase().includes(filtros.busca.toLowerCase()) || false;
      
      return (
        (filtros.tipo === 'all' || aprovacao.tipo === filtros.tipo) &&
        (filtros.status === 'all' || aprovacao.status === filtros.status) &&
        (filtros.busca === '' || nomeMatch)
      );
    });
  }, [aprovacoesMock, pessoas, filtros]);

  const handleAprovar = (id: string) => {
    toast({
      title: 'Solicitação aprovada',
      description: 'A solicitação foi aprovada com sucesso.'
    });
  };

  const handleRecusar = (id: string) => {
    toast({
      title: 'Solicitação recusada',
      description: 'A solicitação foi recusada.'
    });
  };

  const getStatusBadge = (status: AprovacaoMock['status']) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
      case 'aprovado':
        return <Badge variant="default" className="gap-1 bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Aprovado</Badge>;
      case 'recusado':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Recusado</Badge>;
    }
  };

  const getTipoBadge = (tipo: AprovacaoMock['tipo']) => {
    const variants = {
      'ponto': 'default',
      'ferias': 'secondary', 
      'ausencia': 'outline',
      'admissao': 'default',
      'beneficio': 'secondary'
    } as const;
    
    return <Badge variant={variants[tipo]}>{tipo}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Central de Aprovações</h1>
        <p className="text-muted-foreground">Gerencie todas as solicitações pendentes</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Buscar por colaborador..."
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              />
            </div>
            
            <div>
              <Select
                value={filtros.tipo}
                onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="ponto">Ponto</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="ausencia">Ausência</SelectItem>
                  <SelectItem value="admissao">Admissão</SelectItem>
                  <SelectItem value="beneficio">Benefício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select
                value={filtros.status}
                onValueChange={(value) => setFiltros({ ...filtros, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="recusado">Recusados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Aprovações */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações ({aprovacoesFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {aprovacoesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aprovacoesFiltradas.map((aprovacao) => {
                  const pessoa = pessoas.find(p => p.id === aprovacao.pessoaId);
                  
                  return (
                    <TableRow key={aprovacao.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pessoa?.nome}</div>
                          <div className="text-sm text-muted-foreground">{pessoa?.cargo}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getTipoBadge(aprovacao.tipo)}</TableCell>
                      <TableCell>
                        {format(new Date(aprovacao.dataSolicitacao), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(aprovacao.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          
                          {aprovacao.status === 'pendente' && (
                            <>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleAprovar(aprovacao.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleRecusar(aprovacao.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Recusar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}