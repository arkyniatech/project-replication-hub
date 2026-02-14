import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  Check, 
  X, 
  FileText, 
  RotateCcw, 
  Plus,
  Filter,
  Search
} from "lucide-react";
import { NovaTransferenciaModal } from "@/components/transferencias/NovaTransferenciaModal";
import { DetalheTransferenciaModal } from "@/components/transferencias/DetalheTransferenciaModal";
import { NegarTransferenciaModal } from "@/components/transferencias/NegarTransferenciaModal";
import { DespachoPDF } from "@/components/transferencias/DespachoPDF";
import { useRbac } from "@/hooks/useRbac";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useSupabaseTransferencias } from "@/hooks/useSupabaseTransferencias";
import { TransferStatus } from "@/types/transferencias";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useMemo } from "react";

const statusConfig = {
  'CRIADA': { label: 'Criada', color: 'bg-blue-500' },
  'EM_TRANSITO': { label: 'Em Trânsito', color: 'bg-orange-500' },
  'RECEBIDA': { label: 'Recebida', color: 'bg-green-500' },
  'RECUSADA': { label: 'Recusada', color: 'bg-red-500' },
  'CANCELADA': { label: 'Cancelada', color: 'bg-gray-500' }
};

export default function Transferencias() {
  const { can } = useRbac();
  const { lojaAtual } = useMultiunidade();
  const lojaAtiva = lojaAtual?.id || '';
  
  const {
    transferencias = [],
    isLoading,
    atualizarStatus,
  } = useSupabaseTransferencias(lojaAtiva);

  const [activeTab, setActiveTab] = useState("recebidas");
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showDetalheModal, setShowDetalheModal] = useState(false);
  const [showNegarModal, setShowNegarModal] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [selectedTransferencia, setSelectedTransferencia] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  // Filtrar transferências com base no status e loja
  const pendentesRecebidas = useMemo(() => {
    return transferencias.filter(t => 
      t.destino_loja_id === lojaAtiva && 
      (t.status === 'EM_TRANSITO' || t.status === 'CRIADA')
    );
  }, [transferencias, lojaAtiva]);

  const pendentesEnviadas = useMemo(() => {
    return transferencias.filter(t => 
      t.origem_loja_id === lojaAtiva && 
      (t.status === 'EM_TRANSITO' || t.status === 'CRIADA' || t.status === 'RECUSADA')
    );
  }, [transferencias, lojaAtiva]);

  const historico = useMemo(() => {
    let filtered = transferencias.filter(t => 
      t.status === 'RECEBIDA' || t.status === 'CANCELADA'
    );

    if (searchText) {
      filtered = filtered.filter(t => 
        t.numero.toString().includes(searchText) ||
        t.motorista?.toLowerCase().includes(searchText.toLowerCase()) ||
        t.veiculo?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  }, [transferencias, searchText]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().toISOString().substring(0, 7);

    return {
      pendenciasRecebidas: pendentesRecebidas.length,
      pendenciasEnviadas: pendentesEnviadas.length,
      recebidasHoje: transferencias.filter(t => 
        t.destino_loja_id === lojaAtiva && 
        t.status === 'RECEBIDA' &&
        t.updated_at?.startsWith(hoje)
      ).length,
      recusadasMes: transferencias.filter(t => 
        t.origem_loja_id === lojaAtiva && 
        t.status === 'RECUSADA' &&
        t.updated_at?.startsWith(mesAtual)
      ).length
    };
  }, [transferencias, lojaAtiva, pendentesRecebidas.length, pendentesEnviadas.length]);

  // Atalho T para nova transferência
  useKeyboardShortcut('t', () => {
    if (can('equipamentos:edit')) {
      setShowNovaModal(true);
    }
  });

  const handleAceitar = async (id: string) => {
    if (!can('equipamentos:edit')) {
      toast.error("Sem permissão para aceitar transferências");
      return;
    }

    try {
      await atualizarStatus.mutateAsync({ id, status: 'RECEBIDA' });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleNegar = (id: string) => {
    if (!can('equipamentos:edit')) {
      toast.error("Sem permissão para negar transferências");
      return;
    }
    setSelectedTransferencia(id);
    setShowNegarModal(true);
  };

  const handleCancelar = async (id: string) => {
    if (!can('equipamentos:edit')) {
      toast.error("Sem permissão para cancelar transferências");
      return;
    }

    try {
      await atualizarStatus.mutateAsync({ id, status: 'CANCELADA' });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleVerDetalhe = (id: string) => {
    setSelectedTransferencia(id);
    setShowDetalheModal(true);
  };

  const handleGerarPDF = (id: string) => {
    setSelectedTransferencia(id);
    setShowPDF(true);
  };

  const StatusBadge = ({ status }: { status: TransferStatus }) => {
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const ActionButtons = ({ transferencia, isRecebida = false, isEnviada = false }) => {
    const canEdit = can('equipamentos:edit');
    
    return (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVerDetalhe(transferencia.id)}
          title="Ver detalhes"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleGerarPDF(transferencia.id)}
          title="Gerar PDF"
        >
          <FileText className="h-4 w-4" />
        </Button>

        {isRecebida && transferencia.status === 'EM_TRANSITO' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAceitar(transferencia.id)}
              disabled={!canEdit || atualizarStatus.isPending || isLoading}
              title="Aceitar"
              className="text-green-600 hover:text-green-700"
            >
              <Check className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNegar(transferencia.id)}
              disabled={!canEdit || atualizarStatus.isPending || isLoading}
              title="Negar"
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        {isEnviada && transferencia.status === 'RECUSADA' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancelar(transferencia.id)}
            disabled={!canEdit || atualizarStatus.isPending || isLoading}
            title="Cancelar"
            className="text-orange-600 hover:text-orange-700"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const TransferenciaRow = ({ transferencia, type }: { transferencia: any, type: 'recebida' | 'enviada' | 'historico' }) => {
    const origemNome = transferencia.origem?.nome || 'N/A';
    const destinoNome = transferencia.destino?.nome || 'N/A';
    
    return (
      <TableRow key={transferencia.id}>
        <TableCell className="font-medium">#{transferencia.numero}</TableCell>
        <TableCell>
          {type === 'recebida' ? origemNome : 
           type === 'enviada' ? destinoNome :
           `${origemNome} → ${destinoNome}`}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            Ver itens
          </Badge>
        </TableCell>
        <TableCell>{transferencia.motorista || '-'}</TableCell>
        <TableCell>{transferencia.veiculo || '-'}</TableCell>
        <TableCell>
          {format(new Date(transferencia.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </TableCell>
        <TableCell>
          <StatusBadge status={transferencia.status} />
        </TableCell>
        <TableCell>
          <ActionButtons 
            transferencia={transferencia} 
            isRecebida={type === 'recebida'}
            isEnviada={type === 'enviada'}
          />
        </TableCell>
      </TableRow>
    );
  };

  if (!can('equipamentos:view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Você não possui as permissões necessárias para acessar as transferências.
        </p>
        <Button onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transferências entre Lojas</h1>
          <p className="text-muted-foreground">
            Gerencie transferências de equipamentos entre as lojas
          </p>
        </div>
        
        {can('equipamentos:edit') && (
          <Button onClick={() => setShowNovaModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transferência (T)
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências Recebidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.pendenciasRecebidas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.pendenciasEnviadas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebidas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.recebidasHoje}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recusadas no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.recusadasMes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recebidas">
            Recebidas ({pendentesRecebidas.length})
          </TabsTrigger>
          <TabsTrigger value="enviadas">
            Enviadas ({pendentesEnviadas.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {activeTab === 'historico' && (
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, código ou descrição..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <TabsContent value="recebidas">
            <Card>
              <CardHeader>
                <CardTitle>Transferências Pendentes para Receber</CardTitle>
              </CardHeader>
              <CardContent>
                {pendentesRecebidas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma transferência pendente para receber
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Solicitado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendentesRecebidas.map(transferencia => (
                        <TransferenciaRow 
                          key={transferencia.id}
                          transferencia={transferencia} 
                          type="recebida" 
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enviadas">
            <Card>
              <CardHeader>
                <CardTitle>Transferências Enviadas (Pendentes)</CardTitle>
              </CardHeader>
              <CardContent>
                {pendentesEnviadas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma transferência enviada pendente
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Gerada em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendentesEnviadas.map(transferencia => (
                        <TransferenciaRow 
                          key={transferencia.id}
                          transferencia={transferencia} 
                          type="enviada" 
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Transferências</CardTitle>
              </CardHeader>
              <CardContent>
                {historico.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma transferência encontrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Rota</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map(transferencia => (
                        <TransferenciaRow 
                          key={transferencia.id}
                          transferencia={transferencia} 
                          type="historico" 
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <NovaTransferenciaModal 
        open={showNovaModal} 
        onOpenChange={setShowNovaModal} 
      />
      
      <DetalheTransferenciaModal 
        open={showDetalheModal} 
        onOpenChange={setShowDetalheModal}
        transferenciaId={selectedTransferencia}
      />
      
      <NegarTransferenciaModal 
        open={showNegarModal} 
        onOpenChange={setShowNegarModal}
        transferenciaId={selectedTransferencia}
        onConfirm={() => setShowNegarModal(false)}
      />

      <DespachoPDF
        open={showPDF}
        onOpenChange={setShowPDF}
        transferenciaId={selectedTransferencia}
      />
    </div>
  );
}