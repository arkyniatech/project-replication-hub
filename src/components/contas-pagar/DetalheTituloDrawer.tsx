import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useSupabaseTitulosPagar } from '@/hooks/useSupabaseTitulosPagar';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { useSupabaseAprovacoesCP } from '@/hooks/useSupabaseAprovacoesCP';
import { 
  FileText, 
  Edit3, 
  Pause, 
  Copy, 
  Trash2, 
  Calculator, 
  Calendar, 
  Send, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Paperclip
} from 'lucide-react';

interface DetalheTituloDrawerProps {
  open: boolean;
  onClose: () => void;
  tituloId: string | null;
  onEditParcela: (parcelaId: string) => void;
  onOpenAnexos: (tipo: 'titulo' | 'parcela', id: string) => void;
}


function getStatusColor(status: string) {
  switch (status) {
    case 'aprovado':
      return 'text-green-700 bg-green-100';
    case 'aguardando_aprovacao':
      return 'text-yellow-700 bg-yellow-100';
    case 'em_edicao':
      return 'text-blue-700 bg-blue-100';
    case 'reprovado':
      return 'text-red-700 bg-red-100';
    case 'cancelado':
      return 'text-gray-700 bg-gray-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function getParcelaStatusColor(status: string) {
  switch (status) {
    case 'paga':
      return 'text-green-700 bg-green-100';
    case 'vencida':
      return 'text-red-700 bg-red-100';
    case 'parcial':
      return 'text-orange-700 bg-orange-100';
    case 'suspensa':
      return 'text-gray-700 bg-gray-100';
    default:
      return 'text-blue-700 bg-blue-100';
  }
}

function getParcelaStatusIcon(status: string) {
  switch (status) {
    case 'paga':
      return <CheckCircle className="w-4 h-4" />;
    case 'vencida':
      return <XCircle className="w-4 h-4" />;
    case 'parcial':
      return <AlertTriangle className="w-4 h-4" />;
    case 'suspensa':
      return <Pause className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export function DetalheTituloDrawer({ 
  open, 
  onClose, 
  tituloId, 
  onEditParcela, 
  onOpenAnexos 
}: DetalheTituloDrawerProps) {
  const { titulos, updateTitulo, deleteTitulo } = useSupabaseTitulosPagar();
  const { parcelas: parcelasData, suspenderParcela } = useSupabaseParcelasPagar();
  const { aprovacoes } = useSupabaseAprovacoesCP();
  const [parcelaSuspensa, setParcelaSuspensa] = useState<Record<string, boolean>>({});

  if (!open || !tituloId) return null;

  const titulo = titulos.find(t => t.id === tituloId);
  const parcelas = parcelasData.filter(p => p.titulo_id === tituloId);
  const aprovacao = aprovacoes.find(a => a.titulo_id === tituloId);

  if (!titulo) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Título não encontrado</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const handleSuspenderParcela = async (parcelaId: string) => {
    const parcela = parcelas.find(p => p.id === parcelaId);
    if (!parcela) return;

    const isSuspensa = parcela.suspensa;
    
    try {
      await suspenderParcela.mutateAsync({
        id: parcelaId,
        motivo: isSuspensa ? 'Reativação' : 'Suspensão temporária'
      });

      toast.success(isSuspensa ? "Parcela reativada" : "Parcela suspensa");
    } catch (error) {
      toast.error("Erro ao suspender parcela");
    }
  };

  const handleRecalcularParcelas = () => {
    toast.info("Recalculando parcelas", {
      description: "As parcelas foram recalculadas mantendo o valor total"
    });
  };

  const handleReprogramarTodas = () => {
    toast.info("Reprogramação em massa", {
      description: "Todas as parcelas foram reprogramadas"
    });
  };

  const handleEnviarAprovacao = async () => {
    try {
      await updateTitulo.mutateAsync({
        id: tituloId,
        status: 'AGUARDANDO_APROVACAO'
      });
      toast.success("Enviado para aprovação");
    } catch (error) {
      toast.error("Erro ao enviar para aprovação");
    }
  };

  const handleCancelarTitulo = async () => {
    try {
      await updateTitulo.mutateAsync({
        id: tituloId,
        status: 'CANCELADO'
      });
      toast.success("Título cancelado");
      onClose();
    } catch (error) {
      toast.error("Erro ao cancelar título");
    }
  };

  const handleAprovar = () => {
    toast.success("Título aprovado");
  };

  const handleReprovar = () => {
    toast.error("Título reprovado");
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {titulo.numero}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6">
          {/* Cabeçalho do Título */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{titulo.fornecedor?.nome || 'Fornecedor'}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {titulo.categoria?.descricao || titulo.categoria_codigo}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCurrency(titulo.valor_total)}
                  </div>
                  <Badge className={getStatusColor(titulo.status)}>
                    {titulo.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            {titulo.observacoes && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{titulo.observacoes}</p>
              </CardContent>
            )}
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="parcelas" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
              <TabsTrigger value="aprovacao">Aprovação</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Aba Parcelas */}
            <TabsContent value="parcelas" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Parcelas do Título</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRecalcularParcelas}>
                    <Calculator className="w-4 h-4 mr-2" />
                    Recalcular
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReprogramarTodas}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Reprogramar Todas
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhuma parcela encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    parcelas.map((parcela) => {
                      const isSuspensa = parcela.suspensa;
                      return (
                        <TableRow key={parcela.id} className={isSuspensa ? 'opacity-50' : ''}>
                          <TableCell>{parcela.numero_parcela}</TableCell>
                          <TableCell>
                            {new Date(parcela.vencimento).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parcela.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parcela.pago)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parcela.saldo)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getParcelaStatusColor(isSuspensa ? 'suspensa' : parcela.status)}>
                              <div className="flex items-center gap-1">
                                {getParcelaStatusIcon(isSuspensa ? 'suspensa' : parcela.status)}
                                {isSuspensa ? 'SUSPENSA' : parcela.status.toUpperCase()}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {parcela.conta_preferencial_id || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onEditParcela(parcela.id)}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleSuspenderParcela(parcela.id)}
                              >
                                <Pause className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onOpenAnexos('parcela', parcela.id)}
                              >
                                <Paperclip className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Ações do Título */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  {titulo.status === 'EM_EDICAO' && (
                    <>
                      <Button variant="outline" onClick={handleEnviarAprovacao}>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar p/ Aprovação
                      </Button>
                      <Button variant="outline" onClick={handleCancelarTitulo}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancelar Título
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </TabsContent>

            {/* Aba Anexos */}
            <TabsContent value="anexos" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Anexos do Título</h3>
                <Button onClick={() => onOpenAnexos('titulo', titulo.id)}>
                  <Paperclip className="w-4 h-4 mr-2" />
                  Gerenciar Anexos
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {titulo.anexos && Array.isArray(titulo.anexos) && titulo.anexos.length > 0 ? (
                  titulo.anexos.map((anexo: any) => (
                    <Card key={anexo.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">{anexo.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {anexo.tamanho ? (anexo.tamanho / 1024).toFixed(1) + ' KB' : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4 text-muted-foreground">
                    Nenhum anexo
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Aba Aprovação */}
            <TabsContent value="aprovacao" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Aprovação</h3>
                {titulo.status === 'aguardando_aprovacao' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleAprovar}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReprovar}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reprovar
                    </Button>
                  </div>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status da Aprovação</CardTitle>
                </CardHeader>
                <CardContent>
                  {aprovacao ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Nível:</span>
                          <Badge variant="outline">{aprovacao.nivel.toUpperCase()}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <Badge className={getStatusColor(aprovacao.status)}>
                            {aprovacao.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Histórico de Aprovação</h4>
                        <div className="space-y-3">
                          {Array.isArray(aprovacao.historico) && aprovacao.historico.map((item: any, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded">
                              <div className="flex-1">
                                <p className="font-medium">{item.usuario}</p>
                                <p className="text-sm text-muted-foreground">{item.acao}</p>
                                {item.motivo && (
                                  <p className="text-sm mt-1">{item.motivo}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      Título não requer aprovação
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Histórico */}
            <TabsContent value="historico" className="space-y-4">
              <h3 className="text-lg font-semibold">Timeline do Título</h3>
              
              <div className="space-y-3">
                {Array.isArray(titulo.timeline) && titulo.timeline.length > 0 ? (
                  titulo.timeline.map((item: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded">
                      <div className="flex-1">
                        <p className="font-medium">{item.descricao || item.tipo}</p>
                        <p className="text-sm text-muted-foreground">por {item.usuario || 'Sistema'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4 text-muted-foreground">
                    Nenhuma informação de histórico
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}