import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { 
  Clock, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle,
  User,
  TrendingUp,
  Download
} from 'lucide-react';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';

interface PontoMarcacao {
  id: string;
  pessoaId: string;
  pessoa: string;
  data: string;
  horaIn?: string;
  horaOut?: string;
  horasRegistradas: number;
  horasPrevistas: number;
  status: 'presente' | 'falta' | 'atraso' | 'parcial';
}

interface AjustePonto {
  id: string;
  pessoa: string;
  data: string;
  motivo: string;
  horas: number;
  status: 'pendente' | 'aprovado' | 'recusado';
  solicitadoEm: string;
}

const mockPontoData: PontoMarcacao[] = [
  {
    id: '1',
    pessoaId: '1',
    pessoa: 'João Silva',
    data: '2024-01-15',
    horaIn: '08:00',
    horaOut: '17:00',
    horasRegistradas: 8,
    horasPrevistas: 8,
    status: 'presente'
  },
  {
    id: '2',
    pessoaId: '1',
    pessoa: 'João Silva',
    data: '2024-01-16',
    horaIn: '08:15',
    horaOut: '17:00',
    horasRegistradas: 7.75,
    horasPrevistas: 8,
    status: 'atraso'
  },
  {
    id: '3',
    pessoaId: '2',
    pessoa: 'Maria Santos',
    data: '2024-01-15',
    horasRegistradas: 0,
    horasPrevistas: 8,
    status: 'falta'
  }
];

const mockAjustes: AjustePonto[] = [
  {
    id: '1',
    pessoa: 'João Silva',
    data: '2024-01-16',
    motivo: 'Saída para consulta médica',
    horas: 0.25,
    status: 'pendente',
    solicitadoEm: '2024-01-16T14:30:00'
  },
  {
    id: '2',
    pessoa: 'Maria Santos',
    data: '2024-01-15',
    motivo: 'Trabalho em casa por problema familiar',
    horas: 8,
    status: 'aprovado',
    solicitadoEm: '2024-01-15T09:00:00'
  }
];

export default function Ponto() {
  const { can } = useRbacPermissions();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPessoa, setSelectedPessoa] = useState('all');
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showAprovacao, setShowAprovacao] = useState<AjustePonto | null>(null);

  const getStatusBadge = (status: string) => {
    const configs = {
      presente: { variant: 'default', className: 'bg-green-50 text-green-700', label: 'Presente' },
      falta: { variant: 'destructive', className: 'bg-red-50 text-red-700', label: 'Falta' },
      atraso: { variant: 'secondary', className: 'bg-amber-50 text-amber-700', label: 'Atraso' },
      parcial: { variant: 'outline', className: 'bg-blue-50 text-blue-700', label: 'Parcial' }
    } as const;

    const config = configs[status as keyof typeof configs];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getAjusteStatusBadge = (status: string) => {
    const configs = {
      pendente: { className: 'bg-amber-50 text-amber-700', label: 'Pendente' },
      aprovado: { className: 'bg-green-50 text-green-700', label: 'Aprovado' },
      recusado: { className: 'bg-red-50 text-red-700', label: 'Recusado' }
    };

    const config = configs[status as keyof typeof configs];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredData = mockPontoData.filter(item => 
    selectedPessoa === 'all' || item.pessoaId === selectedPessoa
  );

  const ajustesPendentes = mockAjustes.filter(a => a.status === 'pendente').length;
  const ajustesAprovados = mockAjustes.filter(a => a.status === 'aprovado').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Ponto</h1>
          <p className="text-muted-foreground">Controle de ponto e jornada</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => setShowAjusteModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajuste de Ponto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Presenças</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-muted-foreground">Faltas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{ajustesPendentes}</p>
                <p className="text-sm text-muted-foreground">Ajustes Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">94.2%</p>
                <p className="text-sm text-muted-foreground">Taxa Presença</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Filters and Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Colaborador</label>
              <Select value={selectedPessoa} onValueChange={setSelectedPessoa}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">João Silva</SelectItem>
                  <SelectItem value="2">Maria Santos</SelectItem>
                  <SelectItem value="3">Pedro Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês/Ano</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>

        {/* Marcações List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Marcações de Ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredData.map((marcacao) => (
                  <div key={marcacao.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{marcacao.pessoa}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(marcacao.data).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-sm">
                        {marcacao.horaIn && marcacao.horaOut ? (
                          <p>{marcacao.horaIn} - {marcacao.horaOut}</p>
                        ) : (
                          <p className="text-muted-foreground">Sem registro</p>
                        )}
                        <p className="text-muted-foreground">
                          {marcacao.horasRegistradas}h / {marcacao.horasPrevistas}h
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(marcacao.status)}
                      {marcacao.status !== 'presente' && (
                        <Button variant="outline" size="sm">
                          Ajustar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ajustes Pendentes */}
          {can('rh:ponto_aprovar') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ajustes Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAjustes.filter(a => a.status === 'pendente').map((ajuste) => (
                    <div key={ajuste.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{ajuste.pessoa}</p>
                        <p className="text-sm text-muted-foreground">{ajuste.motivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ajuste.data).toLocaleDateString('pt-BR')} • 
                          {ajuste.horas > 0 ? '+' : ''}{ajuste.horas}h
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAprovacao(ajuste)}
                        >
                          Analisar
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {mockAjustes.filter(a => a.status === 'pendente').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum ajuste pendente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Ajuste de Ponto */}
      {showAjusteModal && (
        <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ajuste de Ponto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Horas (+/-)</label>
                <Input type="number" step="0.25" placeholder="Ex: 1.5 ou -0.5" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo</label>
                <Textarea placeholder="Descreva o motivo do ajuste..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAjusteModal(false)}>
                  Cancelar
                </Button>
                <Button>Solicitar Ajuste</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Aprovação */}
      {showAprovacao && (
        <Dialog open={!!showAprovacao} onOpenChange={() => setShowAprovacao(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analisar Ajuste de Ponto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p><span className="font-medium">Colaborador:</span> {showAprovacao.pessoa}</p>
                <p><span className="font-medium">Data:</span> {new Date(showAprovacao.data).toLocaleDateString('pt-BR')}</p>
                <p><span className="font-medium">Horas:</span> {showAprovacao.horas > 0 ? '+' : ''}{showAprovacao.horas}h</p>
                <p><span className="font-medium">Motivo:</span> {showAprovacao.motivo}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observações (opcional)</label>
                <Textarea placeholder="Adicione observações sobre a decisão..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAprovacao(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive">
                  Recusar
                </Button>
                <Button>
                  Aprovar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}