import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Download, Filter } from 'lucide-react';

const mockCandidatos = [
  {
    id: '1',
    nome: 'Carlos Oliveira',
    email: 'carlos.oliveira@email.com',
    telefone: '(11) 98765-4321',
    vaga: 'Analista Comercial',
    status: 'NOVO',
    dataAplicacao: '2024-01-20',
    experiencia: '3 anos'
  },
  {
    id: '2',
    nome: 'Fernanda Costa',
    email: 'fernanda.costa@email.com',
    telefone: '(11) 91234-5678',
    vaga: 'Desenvolvedor Frontend',
    status: 'EM_PROCESSO',
    dataAplicacao: '2024-01-18',
    experiencia: '5 anos'
  },
  {
    id: '3',
    nome: 'Roberto Silva',
    email: 'roberto.silva@email.com',
    telefone: '(11) 95555-5555',
    vaga: 'Analista Comercial',
    status: 'APROVADO',
    dataAplicacao: '2024-01-15',
    experiencia: '2 anos'
  },
  {
    id: '4',
    nome: 'Ana Rodrigues',
    email: 'ana.rodrigues@email.com',
    telefone: '(11) 94444-4444',
    vaga: 'Desenvolvedor Frontend',
    status: 'REPROVADO',
    dataAplicacao: '2024-01-12',
    experiencia: '1 ano'
  }
];

export default function Candidatos() {
  const getStatusBadge = (status: string) => {
    const variants = {
      'NOVO': 'bg-blue-100 text-blue-800 border-blue-200',
      'EM_PROCESSO': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'APROVADO': 'bg-green-100 text-green-800 border-green-200',
      'REPROVADO': 'bg-red-100 text-red-800 border-red-200'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Candidatos</h1>
          <p className="text-muted-foreground">Gestão de candidatos por vaga</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Novos</p>
                <p className="text-2xl font-bold">15</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Processo</p>
                <p className="text-2xl font-bold">28</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa Aprovação</p>
                <p className="text-2xl font-bold">21%</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
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
                  placeholder="Buscar candidatos..."
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
                <SelectItem value="NOVO">Novo</SelectItem>
                <SelectItem value="EM_PROCESSO">Em Processo</SelectItem>
                <SelectItem value="APROVADO">Aprovado</SelectItem>
                <SelectItem value="REPROVADO">Reprovado</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="TODAS_VAGAS">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Vaga" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS_VAGAS">Todas as Vagas</SelectItem>
                <SelectItem value="analista-comercial">Analista Comercial</SelectItem>
                <SelectItem value="desenvolvedor-frontend">Desenvolvedor Frontend</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Candidatos */}
      <Card>
        <CardHeader>
          <CardTitle>Candidatos ({mockCandidatos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Experiência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Aplicação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCandidatos.map((candidato) => (
                <TableRow key={candidato.id}>
                  <TableCell className="font-medium">{candidato.nome}</TableCell>
                  <TableCell>{candidato.email}</TableCell>
                  <TableCell>{candidato.telefone}</TableCell>
                  <TableCell>{candidato.vaga}</TableCell>
                  <TableCell>{candidato.experiencia}</TableCell>
                  <TableCell>{getStatusBadge(candidato.status)}</TableCell>
                  <TableCell>{new Date(candidato.dataAplicacao).toLocaleDateString('pt-BR')}</TableCell>
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