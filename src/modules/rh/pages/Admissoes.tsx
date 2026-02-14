import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Eye, CheckSquare, Calendar, AlertCircle } from 'lucide-react';

const mockAdmissoes = [
  {
    id: '1',
    candidato: 'Roberto Silva',
    vaga: 'Analista Comercial',
    unidade: 'Matriz',
    status: 'PENDENTE',
    dataPrevisao: '2024-02-01',
    dataEfetiva: null,
    documentos: {
      total: 8,
      pendentes: 3
    }
  },
  {
    id: '2',
    candidato: 'Mariana Santos',
    vaga: 'Desenvolvedor Frontend', 
    unidade: 'Filial SP',
    status: 'EM_PROCESSO',
    dataPrevisao: '2024-01-25',
    dataEfetiva: null,
    documentos: {
      total: 8,
      pendentes: 1
    }
  },
  {
    id: '3',
    candidato: 'José Oliveira',
    vaga: 'Operador',
    unidade: 'Filial RJ',
    status: 'CONCLUIDA',
    dataPrevisao: '2024-01-15',
    dataEfetiva: '2024-01-15',
    documentos: {
      total: 8,
      pendentes: 0
    }
  }
];

export default function Admissoes() {
  const getStatusBadge = (status: string) => {
    const variants = {
      'PENDENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'EM_PROCESSO': 'bg-blue-100 text-blue-800 border-blue-200',
      'CONCLUIDA': 'bg-green-100 text-green-800 border-green-200',
      'CANCELADA': 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge 
        variant="outline" 
        className={variants[status as keyof typeof variants]}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getDocumentosStatus = (docs: { total: number; pendentes: number }) => {
    if (docs.pendentes === 0) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completo</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">{docs.pendentes} pendentes</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admissões</h1>
          <p className="text-muted-foreground">Processo de admissão de novos colaboradores</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Admissão
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Processo</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídas (Mês)</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">7d</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por candidato ou vaga..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select defaultValue="TODOS_STATUS">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS_STATUS">Todos os Status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_PROCESSO">Em Processo</SelectItem>
                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="TODAS_UNIDADES">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS_UNIDADES">Todas as Unidades</SelectItem>
                <SelectItem value="matriz">Matriz</SelectItem>
                <SelectItem value="filial-sp">Filial SP</SelectItem>
                <SelectItem value="filial-rj">Filial RJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Admissões */}
      <Card>
        <CardHeader>
          <CardTitle>Admissões em Andamento ({mockAdmissoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Efetivação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAdmissoes.map((admissao) => (
                <TableRow key={admissao.id}>
                  <TableCell className="font-medium">{admissao.candidato}</TableCell>
                  <TableCell>{admissao.vaga}</TableCell>
                  <TableCell>{admissao.unidade}</TableCell>
                  <TableCell>{getStatusBadge(admissao.status)}</TableCell>
                  <TableCell>{getDocumentosStatus(admissao.documentos)}</TableCell>
                  <TableCell>{new Date(admissao.dataPrevisao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    {admissao.dataEfetiva 
                      ? new Date(admissao.dataEfetiva).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
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