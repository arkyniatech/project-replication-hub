import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DoorOpen, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Building2,
  CheckCircle,
  Clock,
  Download,
  Eye
} from 'lucide-react';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';

interface Desligamento {
  id: string;
  colaborador: string;
  cargo: string;
  loja: string;
  cc: string;
  motivo: 'pedido' | 'sem_justa' | 'justa' | 'acordo';
  dataAlvo: string;
  status: 'ABERTO' | 'CONCLUIDO';
  progresso: number;
}

const mockDesligamentos: Desligamento[] = [
  {
    id: '1',
    colaborador: 'João Silva',
    cargo: 'Operador',
    loja: 'Matriz',
    cc: 'Operação', 
    motivo: 'pedido',
    dataAlvo: '2024-01-30',
    status: 'ABERTO',
    progresso: 75
  },
  {
    id: '2',
    colaborador: 'Maria Santos',
    cargo: 'Vendedora',
    loja: 'Filial 1',
    cc: 'Comercial',
    motivo: 'acordo',
    dataAlvo: '2024-02-15',
    status: 'ABERTO',
    progresso: 45
  },
  {
    id: '3',
    colaborador: 'Pedro Costa',
    cargo: 'Mecânico',
    loja: 'Filial 2',
    cc: 'Manutenção',
    motivo: 'sem_justa',
    dataAlvo: '2024-01-25',
    status: 'CONCLUIDO',
    progresso: 100
  }
];

const checklistItems = [
  { id: '1', titulo: 'Comunicação formal do desligamento', obrigatorio: true, status: 'CONCLUIDO' },
  { id: '2', titulo: 'Devolução de EPIs e uniformes', obrigatorio: true, status: 'CONCLUIDO' },
  { id: '3', titulo: 'Devolução de equipamentos da empresa', obrigatorio: true, status: 'CONCLUIDO' },
  { id: '4', titulo: 'Entrevista de desligamento', obrigatorio: false, status: 'EM_ANDAMENTO' },
  { id: '5', titulo: 'Baixa no sistema de ponto', obrigatorio: true, status: 'PENDENTE' },
  { id: '6', titulo: 'Cancelamento de benefícios', obrigatorio: true, status: 'PENDENTE' },
  { id: '7', titulo: 'Revogação de acessos ao sistema', obrigatorio: true, status: 'PENDENTE' },
  { id: '8', titulo: 'Exame médico demissional', obrigatorio: true, status: 'PENDENTE' }
];

export default function Offboarding() {
  const { can } = useRbacPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showChecklist, setShowChecklist] = useState<Desligamento | null>(null);
  const [showNovoDesligamento, setShowNovoDesligamento] = useState(false);

  const getMotivoLabel = (motivo: string) => {
    const labels = {
      pedido: 'Pedido',
      sem_justa: 'Sem Justa Causa',
      justa: 'Justa Causa',
      acordo: 'Acordo'
    };
    return labels[motivo as keyof typeof labels] || motivo;
  };

  const getMotivoColor = (motivo: string) => {
    const colors = {
      pedido: 'bg-blue-50 text-blue-700',
      sem_justa: 'bg-orange-50 text-orange-700',
      justa: 'bg-red-50 text-red-700',
      acordo: 'bg-green-50 text-green-700'
    };
    return colors[motivo as keyof typeof colors] || 'bg-gray-50 text-gray-700';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'CONCLUIDO') {
      return <Badge className="bg-green-50 text-green-700">Concluído</Badge>;
    }
    return <Badge variant="secondary">Em Andamento</Badge>;
  };

  const filteredDesligamentos = mockDesligamentos.filter(d => {
    const matchesSearch = d.colaborador.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.cargo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Offboarding</h1>
          <p className="text-muted-foreground">Processo de desligamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {can('rh:pessoas_edit') && (
            <Button size="sm" onClick={() => setShowNovoDesligamento(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Desligamento
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por colaborador ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberto">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Vencendo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">8.5</p>
                <p className="text-sm text-muted-foreground">Dias médios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desligamentos List */}
      <Card>
        <CardHeader>
          <CardTitle>Desligamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDesligamentos.map((desligamento) => (
              <div key={desligamento.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{desligamento.colaborador}</h3>
                    <Badge variant="outline" className="text-xs">{desligamento.cargo}</Badge>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getMotivoColor(desligamento.motivo)}`}
                    >
                      {getMotivoLabel(desligamento.motivo)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {desligamento.loja} • {desligamento.cc}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(desligamento.dataAlvo).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(desligamento.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${desligamento.progresso}%`}} 
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{desligamento.progresso}%</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowChecklist(desligamento)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Dialog */}
      {showChecklist && (
        <Dialog open={!!showChecklist} onOpenChange={() => setShowChecklist(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Checklist - {showChecklist.colaborador}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Colaborador</p>
                  <p className="text-sm text-muted-foreground">{showChecklist.colaborador}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Data Alvo</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(showChecklist.dataAlvo).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Motivo</p>
                  <p className="text-sm text-muted-foreground">{getMotivoLabel(showChecklist.motivo)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Progresso</p>
                  <p className="text-sm text-muted-foreground">{showChecklist.progresso}% concluído</p>
                </div>
              </div>

              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border rounded">
                    <Checkbox 
                      checked={item.status === 'CONCLUIDO'}
                      disabled={!can('rh:pessoas_edit')}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.obrigatorio && (
                          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                        )}
                        {item.status === 'EM_ANDAMENTO' && (
                          <Badge variant="outline" className="text-xs text-blue-600">Em Andamento</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowChecklist(null)}>
                  Fechar
                </Button>
                {can('rh:pessoas_edit') && showChecklist.status === 'ABERTO' && (
                  <Button>Finalizar Desligamento</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Novo Desligamento Dialog */}
      {showNovoDesligamento && (
        <Dialog open={showNovoDesligamento} onOpenChange={setShowNovoDesligamento}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Desligamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Colaborador</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">João Silva</SelectItem>
                    <SelectItem value="2">Maria Santos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pedido">Pedido</SelectItem>
                    <SelectItem value="sem_justa">Sem Justa Causa</SelectItem>
                    <SelectItem value="justa">Justa Causa</SelectItem>
                    <SelectItem value="acordo">Acordo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data Alvo</label>
                <Input type="date" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Textarea placeholder="Observações sobre o desligamento..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNovoDesligamento(false)}>
                  Cancelar
                </Button>
                <Button>Criar Desligamento</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}