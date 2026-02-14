import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Eye, Edit, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const mockVagas = [
  {
    id: '1',
    titulo: 'Analista Comercial',
    unidade: 'Matriz',
    area: 'Comercial',
    status: 'ABERTA',
    candidatos: 12,
    dataAbertura: '2024-01-15',
    descricao: 'Vaga para analista comercial com experiência em vendas'
  },
  {
    id: '2',
    titulo: 'Desenvolvedor Frontend',
    unidade: 'Filial SP',
    area: 'TI',
    status: 'EM_ANALISE',
    candidatos: 28,
    dataAbertura: '2024-01-10',
    descricao: 'Desenvolvedor React/TypeScript'
  },
  {
    id: '3',
    titulo: 'Operador de Equipamentos',
    unidade: 'Filial RJ',
    area: 'Operacional',
    status: 'FECHADA',
    candidatos: 45,
    dataAbertura: '2023-12-20',
    descricao: 'Operador com experiência em equipamentos pesados'
  }
];

const statusColors = {
  'ABERTA': 'bg-green-100 text-green-800 border-green-200',
  'EM_ANALISE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'FECHADA': 'bg-gray-100 text-gray-800 border-gray-200',
  'CANCELADA': 'bg-red-100 text-red-800 border-red-200'
};

export default function Vagas() {
  const getStatusBadge = (status: string) => {
    return (
      <Badge 
        variant="outline" 
        className={statusColors[status as keyof typeof statusColors]}
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
          <h1 className="text-2xl font-bold">Vagas</h1>
          <p className="text-muted-foreground">Gestão de vagas abertas e processo seletivo</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Vaga
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vagas Abertas</p>
                <p className="text-2xl font-bold">8</p>
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
                <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
                <p className="text-2xl font-bold">3</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Candidatos</p>
                <p className="text-2xl font-bold">85</p>
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
                <p className="text-sm font-medium text-muted-foreground">Fechadas (Mês)</p>
                <p className="text-2xl font-bold">12</p>
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
                  placeholder="Buscar vagas..."
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
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                <SelectItem value="FECHADA">Fechada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="TODAS_AREAS">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS_AREAS">Todas as Áreas</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="ti">TI</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Vagas - Kanban Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockVagas.map((vaga) => (
          <Card key={vaga.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{vaga.titulo}</CardTitle>
                  <p className="text-sm text-muted-foreground">{vaga.unidade} • {vaga.area}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(vaga.status)}
                <Badge variant="outline">{vaga.candidatos} candidatos</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {vaga.descricao}
              </p>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Aberta em {new Date(vaga.dataAbertura).toLocaleDateString('pt-BR')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}