import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowLeft,
  Package,
  Edit,
  History,
  Calendar,
  User,
  Building2,
  Settings,
  ArrowRightLeft,
  Package2,
  FileDown,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabaseEquipamentos } from '@/hooks/useSupabaseEquipamentos';
import { useSupabaseGrupos } from '@/hooks/useSupabaseGrupos';
import { useSupabaseModelos } from '@/hooks/useSupabaseModelos';
import { useSupabaseTransferencias } from '@/hooks/useSupabaseTransferencias';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useRbac } from '@/hooks/useRbac';
import { StatusEquipamento, TimelineEventEquipamento } from '@/types/equipamentos';
import { DetalheTransferenciaModal } from '@/components/transferencias/DetalheTransferenciaModal';
import { TimelineEventDetails } from '@/components/equipamentos/TimelineEventDetails';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const STATUS_COLORS: Record<StatusEquipamento, string> = {
  DISPONIVEL: "bg-green-100 text-green-800",
  RESERVADO: "bg-blue-100 text-blue-800",
  LOCADO: "bg-yellow-100 text-yellow-800",
  EM_REVISAO: "bg-orange-100 text-orange-800",
  MANUTENCAO: "bg-red-100 text-red-800",
  EM_TRANSPORTE: "bg-purple-100 text-purple-800",
  INATIVO: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<StatusEquipamento, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  LOCADO: "Locado",
  EM_REVISAO: "Em Revisão",
  MANUTENCAO: "Manutenção",
  EM_TRANSPORTE: "Em Transporte",
  INATIVO: "Inativo",
};

export default function EquipamentoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = useRbac();
  const { lojas } = useMultiunidade();
  
  const { useEquipamento } = useSupabaseEquipamentos();
  const { grupos } = useSupabaseGrupos();
  const { modelos } = useSupabaseModelos();
  
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
  const [selectedTransferencia, setSelectedTransferencia] = useState<any>(null);
  
  // Active tab from URL params
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'detalhes');
  const eventoId = searchParams.get('evento');

  // Timeline filters
  const [searchTimeline, setSearchTimeline] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  
  // Buscar equipamento do Supabase
  const { data: equipamento, isLoading, error } = useEquipamento(id!);
  
  useEffect(() => {
    if (eventoId && activeTab === 'timeline') {
      // Scroll to event after component mounts
      setTimeout(() => {
        const eventElement = document.getElementById(`evento-${eventoId}`);
        if (eventElement) {
          eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          eventElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            eventElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [eventoId, activeTab]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error or not found state
  if (error || !equipamento) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">
          {error ? 'Erro ao carregar equipamento' : 'Equipamento não encontrado'}
        </h2>
        {error && (
          <p className="text-sm text-muted-foreground">{error.message}</p>
        )}
        <Button onClick={() => navigate('/equipamentos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Equipamentos
        </Button>
      </div>
    );
  }

  const grupo = grupos.find(g => g.id === equipamento.grupo_id);
  const modelo = modelos.find(m => m.id === equipamento.modelo_id);
  const loja = lojas.find(l => l.id === equipamento.loja_atual_id);

  const handleVerTransferencia = (transferencia: any) => {
    setSelectedTransferencia(transferencia);
    setShowTransferenciaModal(true);
  };

  const handleExportCSV = () => {
    const historico = (Array.isArray(equipamento.historico) ? equipamento.historico : []) as unknown as TimelineEventEquipamento[];
    
    const timelineEvents = [...historico].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const headers = [
      'Data', 
      'Hora', 
      'Usuário', 
      'Tipo', 
      'Descrição', 
      'Quantidade',
      'Origem',
      'Destino',
      'Status Anterior',
      'Status Novo',
      'Valor Anterior',
      'Valor Novo',
      'Observações'
    ];

    const rows = timelineEvents.map((event) => [
      format(new Date(event.timestamp), 'dd/MM/yyyy', { locale: ptBR }),
      format(new Date(event.timestamp), 'HH:mm', { locale: ptBR }),
      event.usuario,
      event.tipo,
      event.descricao,
      event.meta?.quantidade || '',
      event.meta?.origemLojaNome || '',
      event.meta?.destinoLojaNome || '',
      event.meta?.statusAnterior || '',
      event.meta?.statusNovo || '',
      event.meta?.valorAnterior || '',
      event.meta?.valorNovo || '',
      event.meta?.motivoRecusa?.detalhe || event.meta?.motivoAlteracao || event.meta?.motivoInativacao || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const BOM = '\uFEFF';
    const csvBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const filename = `timeline_${equipamento.codigo_interno}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(csvBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Timeline exportada com sucesso!');
  };

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.text('Timeline do Equipamento', 14, 20);
      doc.setFontSize(10);
      doc.text(`Código: ${equipamento.codigo_interno}`, 14, 28);
      doc.text(`Modelo: ${modelo?.nome_comercial || 'N/A'}`, 14, 34);
      doc.text(`Grupo: ${grupo?.nome || 'N/A'}`, 14, 40);
      doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 46);
      
      // Timeline data
      const historico = (Array.isArray(equipamento.historico) ? equipamento.historico : []) as unknown as TimelineEventEquipamento[];
      
      const timelineEvents = [...historico].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const tableData = timelineEvents.map((event) => [
        format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        event.usuario,
        event.tipo,
        event.descricao,
        event.meta?.quantidade ? `Qtd: ${event.meta.quantidade}` : '',
        [
          event.meta?.origemLojaNome ? `Origem: ${event.meta.origemLojaNome}` : '',
          event.meta?.destinoLojaNome ? `Destino: ${event.meta.destinoLojaNome}` : '',
        ].filter(Boolean).join(' | '),
      ]);

      autoTable(doc, {
        startY: 52,
        head: [['Data/Hora', 'Usuário', 'Tipo', 'Descrição', 'Qtd', 'Lojas']],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [249, 115, 22] }, // Primary color
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { cellWidth: 45 },
          4: { cellWidth: 15 },
          5: { cellWidth: 'auto' },
        },
      });

      const filename = `timeline_${equipamento.codigo_interno}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      doc.save(filename);
      
      toast.success('Timeline exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar Timeline em PDF');
    }
  };

  const renderTimeline = () => {
    // Equipment history
    const historico = (Array.isArray(equipamento.historico) ? equipamento.historico : []) as unknown as TimelineEventEquipamento[];
    
    // Filter and search
    let filteredEvents = historico.filter((event) => {
      // Filter by type
      if (filterTipo !== 'all' && event.tipo !== filterTipo) {
        return false;
      }

      // Search in description, user, and meta
      if (searchTimeline) {
        const searchLower = searchTimeline.toLowerCase();
        const matchesDescription = event.descricao?.toLowerCase().includes(searchLower);
        const matchesUser = event.usuario?.toLowerCase().includes(searchLower);
        const matchesMeta = JSON.stringify(event.meta || {}).toLowerCase().includes(searchLower);
        
        if (!matchesDescription && !matchesUser && !matchesMeta) {
          return false;
        }
      }

      return true;
    });

    // Sort by timestamp (most recent first)
    filteredEvents = filteredEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Check if recent (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Summary stats
    const totalEvents = historico.length;
    const recentEvents = historico.filter((e) => 
      new Date(e.timestamp) > sevenDaysAgo
    ).length;
    const transferencias = historico.filter((e) => 
      e.tipo.includes('TRANSFERENCIA')
    ).length;

    return (
      <div className="space-y-6">
        {/* Summary */}
        {totalEvents > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{totalEvents}</p>
                  <p className="text-sm text-muted-foreground">Total de Eventos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{recentEvents}</p>
                  <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{transferencias}</p>
                  <p className="text-sm text-muted-foreground">Transferências</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search-timeline">Buscar</Label>
            <Input
              id="search-timeline"
              placeholder="Buscar por usuário, descrição, loja..."
              value={searchTimeline}
              onChange={(e) => setSearchTimeline(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-tipo">Filtrar por Tipo</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger id="filter-tipo">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="CRIACAO">Criação</SelectItem>
                <SelectItem value="TRANSFERENCIA_ENVIADA">Transferência Enviada</SelectItem>
                <SelectItem value="TRANSFERENCIA_RECEBIDA">Transferência Recebida</SelectItem>
                <SelectItem value="TRANSFERENCIA_RECUSADA">Transferência Recusada</SelectItem>
                <SelectItem value="ALTERACAO_STATUS">Alteração de Status</SelectItem>
                <SelectItem value="ALTERACAO_PRECO">Alteração de Preço</SelectItem>
                <SelectItem value="INATIVACAO">Inativação</SelectItem>
                <SelectItem value="CONTRATO_CRIADO">Contrato Criado</SelectItem>
                <SelectItem value="CONTRATO_RENOVADO">Contrato Renovado</SelectItem>
                <SelectItem value="CONTRATO_DEVOLVIDO">Contrato Devolvido</SelectItem>
                <SelectItem value="CONTRATO_SUBSTITUIDO">Contrato Substituído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timeline Events */}
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const isRecent = new Date(event.timestamp) > sevenDaysAgo;
              return (
                <div key={event.id} id={`evento-${event.id}`}>
                  <TimelineEventDetails event={event} isRecent={isRecent} />
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                {searchTimeline || filterTipo !== 'all' 
                  ? 'Nenhum evento encontrado com os filtros aplicados'
                  : 'Nenhum evento registrado'
                }
              </p>
              {(searchTimeline || filterTipo !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTimeline('');
                    setFilterTipo('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/equipamentos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {modelo?.nome_comercial || 'Equipamento'}
            </h1>
            <p className="text-muted-foreground">
              {equipamento.codigo_interno} • {grupo?.nome}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {can('equipamentos:edit') && (
            <Button variant="outline" onClick={() => navigate(`/equipamentos/${id}/editar`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {equipamento.status_global === 'DISPONIVEL' && can('equipamentos:edit') && (
            <Button onClick={() => navigate(`/equipamentos/transferir/${id}`)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <Badge className={STATUS_COLORS[equipamento.status_global as StatusEquipamento]} variant="outline">
          {STATUS_LABELS[equipamento.status_global as StatusEquipamento]}
        </Badge>
        <Badge variant="outline">{equipamento.tipo}</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Código Interno</label>
                <p className="font-mono text-lg">{equipamento.codigo_interno}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Grupo</label>
                <p>{grupo?.nome || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                <p>{modelo?.nome_comercial || 'N/A'}</p>
              </div>
              
              {equipamento.numero_serie && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número de Série</label>
                  <p className="font-mono">{equipamento.numero_serie}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Loja Atual</label>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{loja?.nome || 'N/A'}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor de Indenização</label>
                <p className="text-lg font-semibold">
                  R$ {Number(equipamento.valor_indenizacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              {equipamento.tipo === 'SALDO' && equipamento.saldos_por_loja && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantidade por Loja</label>
                  <div className="space-y-1">
                    {Object.entries(equipamento.saldos_por_loja as Record<string, any>).map(([lojaId, saldo]) => {
                      const lojaInfo = lojas.find(l => l.id === lojaId);
                      const qtdTotal = saldo?.qtd || 0;
                      const qtdDisponivel = saldo?.qtdDisponivel ?? qtdTotal;
                      
                      return (
                        <div key={lojaId} className="flex justify-between text-sm">
                          <span>{lojaInfo?.nome || lojaId}:</span>
                          <span className="font-medium">
                            <span className={qtdDisponivel === 0 ? "text-red-600" : "text-green-600"}>
                              Disponível: {qtdDisponivel}
                            </span>
                            <span className="text-muted-foreground ml-2">(Total: {qtdTotal})</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {equipamento.observacoes && (
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium text-muted-foreground">Observações</label>
                  <p className="text-muted-foreground italic">{equipamento.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados Auditoria */}
          <Card>
            <CardHeader>
              <CardTitle>Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                <p>{format(new Date(equipamento.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Atualizado em</label>
                <p>{format(new Date(equipamento.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Timeline do Equipamento</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderTimeline()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Transferência */}
      <DetalheTransferenciaModal
        transferenciaId={selectedTransferencia?.id}
        open={showTransferenciaModal}
        onOpenChange={setShowTransferenciaModal}
      />
    </div>
  );
}