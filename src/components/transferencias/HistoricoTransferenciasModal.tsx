import { useState, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APP_CONFIG } from '@/config/app';
import {
  Calendar,
  Download,
  Filter,
  FileText,
  Search,
  X,
  Eye,
  Link
} from 'lucide-react';
// Remove DateRangePicker import for now - will use basic inputs
// import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useTransferenciasStore } from '@/stores/transferenciasStore';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useRbac } from '@/hooks/useRbac';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TransferStatus } from '@/types/transferencias';

interface HistoricoTransferenciasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerEquipamento?: (equipamentoId: string, transferenciaId: string) => void;
  onVerDetalhe?: (transferencia: any) => void;
}

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string }> = {
  CRIADA: { label: 'Criada', color: 'bg-orange-100 text-orange-800' },
  EM_TRANSITO: { label: 'Em Trânsito', color: 'bg-blue-100 text-blue-800' },
  RECEBIDA: { label: 'Recebida', color: 'bg-green-100 text-green-800' },
  RECUSADA: { label: 'Recusada', color: 'bg-red-100 text-red-800' },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

export function HistoricoTransferenciasModal({ 
  open, 
  onOpenChange, 
  onVerEquipamento,
  onVerDetalhe 
}: HistoricoTransferenciasModalProps) {
  const { can } = useRbac();
  const { lojaAtual, lojas } = useMultiunidade();
  const { getHistorico, filtros, setFiltros, clearFiltros } = useTransferenciasStore();
  const printRef = useRef<HTMLDivElement>(null);

  // Filtros locais (não persistidos)
  const [localFiltros, setLocalFiltros] = useState({
    dataInicio: startOfMonth(new Date()),
    dataFim: endOfMonth(new Date()),
    origemLojaIds: [] as string[],
    destinoLojaIds: [] as string[],
    status: '' as TransferStatus | '',
    tipo: '' as 'SERIAL' | 'SALDO' | '',
    texto: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Aplicar filtros e obter dados
  const historicoFiltrado = useMemo(() => {
    const filtrosAplicados = {
      ...filtros,
      dataInicio: localFiltros.dataInicio?.toISOString(),
      dataFim: localFiltros.dataFim?.toISOString(),
      origemLojaIds: localFiltros.origemLojaIds.length > 0 ? localFiltros.origemLojaIds : undefined,
      destinoLojaIds: localFiltros.destinoLojaIds.length > 0 ? localFiltros.destinoLojaIds : undefined,
      status: localFiltros.status ? [localFiltros.status] : undefined, // Convert single status to array
      tipo: localFiltros.tipo || undefined,
      texto: localFiltros.texto || undefined,
    };

    return getHistorico(filtrosAplicados);
  }, [getHistorico, filtros, localFiltros]);

  // Paginação
  const totalPages = Math.ceil(historicoFiltrado.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const transferenciasAtual = historicoFiltrado.slice(startIndex, endIndex);

  // KPIs do período
  const kpisPeriodo = useMemo(() => {
    const recebidas = historicoFiltrado.filter(t => t.status === 'RECEBIDA').length;
    const enviadas = historicoFiltrado.filter(t => 
      t.origemLojaId === lojaAtual?.id
    ).length;
    const recusadas = historicoFiltrado.filter(t => t.status === 'RECUSADA').length;
    const canceladas = historicoFiltrado.filter(t => t.status === 'CANCELADA').length;

    return { recebidas, enviadas, recusadas, canceladas, total: historicoFiltrado.length };
  }, [historicoFiltrado, lojaAtual]);

  const handleClearFiltros = () => {
    setLocalFiltros({
      dataInicio: startOfMonth(new Date()),
      dataFim: endOfMonth(new Date()),
      origemLojaIds: [],
      destinoLojaIds: [],
      status: '',
      tipo: '',
      texto: '',
    });
    setCurrentPage(1);
  };

  const handleGerarPDF = async () => {
    if (!can('equipamentos:view')) {
      toast.error('Sem permissão para gerar relatórios');
      return;
    }

    if (!printRef.current) return;

    try {
      toast.loading('Gerando PDF...', { id: 'pdf-gen' });
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `historico-transferencias-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF gerado com sucesso!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF', { id: 'pdf-gen' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de Transferências</DialogTitle>
          <DialogDescription>
            Consulte e gere relatórios de todas as transferências realizadas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Data Range - Simple inputs for now */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Início</label>
                  <Input
                    type="date"
                    value={localFiltros.dataInicio ? format(localFiltros.dataInicio, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      setLocalFiltros(prev => ({
                        ...prev,
                        dataInicio: e.target.value ? new Date(e.target.value) : startOfMonth(new Date()),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Fim</label>
                  <Input
                    type="date"
                    value={localFiltros.dataFim ? format(localFiltros.dataFim, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      setLocalFiltros(prev => ({
                        ...prev,
                        dataFim: e.target.value ? new Date(e.target.value) : endOfMonth(new Date()),
                      }));
                    }}
                  />
                </div>

                {/* Origem */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loja Origem</label>
                  <Select
                    value={localFiltros.origemLojaIds.length > 0 ? localFiltros.origemLojaIds[0] : undefined}
                    onValueChange={(value) => {
                      setLocalFiltros(prev => ({
                        ...prev,
                        origemLojaIds: value ? [value] : [],
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as origens" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas.map(loja => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destino */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loja Destino</label>
                  <Select
                    value={localFiltros.destinoLojaIds.length > 0 ? localFiltros.destinoLojaIds[0] : undefined}
                    onValueChange={(value) => {
                      setLocalFiltros(prev => ({
                        ...prev,
                        destinoLojaIds: value ? [value] : [],
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os destinos" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas.map(loja => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={localFiltros.status || undefined}
                    onValueChange={(value) => {
                      setLocalFiltros(prev => ({
                        ...prev,
                        status: value as TransferStatus | '',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Busca por texto */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, modelo, ID transferência..."
                    value={localFiltros.texto}
                    onChange={(e) => setLocalFiltros(prev => ({ ...prev, texto: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={handleClearFiltros}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{kpisPeriodo.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{kpisPeriodo.recebidas}</div>
                <div className="text-xs text-muted-foreground">Recebidas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{kpisPeriodo.enviadas}</div>
                <div className="text-xs text-muted-foreground">Enviadas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{kpisPeriodo.recusadas}</div>
                <div className="text-xs text-muted-foreground">Recusadas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{kpisPeriodo.canceladas}</div>
                <div className="text-xs text-muted-foreground">Canceladas</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Transferências ({historicoFiltrado.length})
              </CardTitle>
              <div className="flex gap-2">
                {can('equipamentos:view') && (
                  <Button variant="outline" onClick={handleGerarPDF} disabled={historicoFiltrado.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar PDF
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Área para impressão (invisível) */}
            <div className="absolute -top-[9999px] left-0">
              <div ref={printRef} className="w-[794px] bg-white p-8">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">Histórico de Transferências</h1>
                  <p className="text-muted-foreground">
                    Período: {format(localFiltros.dataInicio || new Date(), 'dd/MM/yyyy', { locale: ptBR })} a {format(localFiltros.dataFim || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: {historicoFiltrado.length} transferências
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-6 text-center">
                  <div>
                    <div className="text-xl font-bold">{kpisPeriodo.total}</div>
                    <div className="text-xs">Total</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{kpisPeriodo.recebidas}</div>
                    <div className="text-xs">Recebidas</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">{kpisPeriodo.enviadas}</div>
                    <div className="text-xs">Enviadas</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">{kpisPeriodo.recusadas}</div>
                    <div className="text-xs">Recusadas</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-600">{kpisPeriodo.canceladas}</div>
                    <div className="text-xs">Canceladas</div>
                  </div>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1">Nº</th>
                      <th className="text-left p-1">Origem → Destino</th>
                      <th className="text-left p-1">Itens</th>
                      <th className="text-left p-1">Status</th>
                      <th className="text-left p-1">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoFiltrado.map((transferencia) => (
                      <tr key={transferencia.id} className="border-b">
                        <td className="p-1">#{transferencia.numero}</td>
                        <td className="p-1">
                          {transferencia.origemLojaNome} → {transferencia.destinoLojaNome}
                        </td>
                        <td className="p-1">
                          {transferencia.itens.map((item, index) => 
                            item.tipo === 'SERIAL' 
                              ? item.codigoInterno 
                              : `${item.quantidade}x ${item.descricao.substring(0, 15)}...`
                          ).join(', ')}
                        </td>
                        <td className="p-1">{STATUS_CONFIG[transferencia.status].label}</td>
                        <td className="p-1">
                          {format(new Date(transferencia.criadoEm), 'dd/MM/yy', { locale: ptBR })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 text-xs text-muted-foreground text-center">
                  Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} • {APP_CONFIG.system.name}
                </div>
              </div>
            </div>

            <CardContent className="flex-1 min-h-0 overflow-auto p-0">
              {transferenciasAtual.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Origem → Destino</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferenciasAtual.map((transferencia) => (
                      <TableRow key={transferencia.id}>
                        <TableCell className="font-mono">
                          #{transferencia.numero}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {transferencia.origemLojaNome} →<br />
                            {transferencia.destinoLojaNome}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {transferencia.itens.map((item, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {item.tipo === 'SERIAL' 
                                  ? item.codigoInterno 
                                  : `${item.quantidade}x SALDO`
                                }
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[transferencia.status].color}>
                            {STATUS_CONFIG[transferencia.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(transferencia.criadoEm), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(transferencia.atualizadoEm), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onVerDetalhe?.(transferencia)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {onVerEquipamento && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  const primeiroItem = transferencia.itens[0];
                                  if (primeiroItem) {
                                    onVerEquipamento(
                                      primeiroItem.codigoInterno || primeiroItem.modeloId,
                                      transferencia.id
                                    );
                                  }
                                }}
                              >
                                <Link className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma transferência encontrada no período selecionado
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tente ajustar os filtros ou selecionar um período maior
                  </p>
                </div>
              )}
            </CardContent>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages} ({historicoFiltrado.length} transferências)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}