import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, ChevronDown, ChevronRight, Download, CheckCircle, DollarSign, Send, FileText, QrCode } from "lucide-react";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";
import RegistrarRecebimentoModal from "./RegistrarRecebimentoModal";
import { AgruparFaturaModal } from "./AgruparFaturaModal";
import { EmitirBolePixModal } from "@/components/bolepix/EmitirBolePixModal";
import { useSupabaseCobrancasInter } from "@/hooks/useSupabaseCobrancasInter";

export default function TitulosTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterChip, setFilterChip] = useState("Todos");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedTitulo, setSelectedTitulo] = useState<any>(null);
  const [selectedTitulos, setSelectedTitulos] = useState<string[]>([]);
  const [showAgruparModal, setShowAgruparModal] = useState(false);
  const [showRecebimentoModal, setShowRecebimentoModal] = useState(false);
  const [showBolePixModal, setShowBolePixModal] = useState(false);
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
  const { titulos = [], updateTitulo, isLoading, error } = useSupabaseTitulos(lojaAtual?.id);
  const { createCobranca } = useSupabaseCobrancasInter(lojaAtual?.id);

  console.log('[TitulosTab] Loja atual:', lojaAtual?.id);
  console.log('[TitulosTab] Total de títulos:', titulos.length);
  console.log('[TitulosTab] Loading:', isLoading);
  console.log('[TitulosTab] Error:', error);

  const filteredTitulos = useMemo(() => {
    // Primeiro, excluir títulos quitados (a aba "Títulos" mostra apenas os a receber)
    let filtered = titulos.filter(t => t.status !== 'QUITADO' && t.saldo > 0);

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter((titulo) => 
        titulo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (titulo.contrato?.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (titulo.cliente?.nome || titulo.cliente?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter) {
      filtered = filtered.filter(titulo => titulo.status === statusFilter);
    }

    // Filtro por chip
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (filterChip) {
      case "Atrasados":
        filtered = filtered.filter(t => {
          const vencimento = new Date(t.vencimento);
          return vencimento < hoje && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
        });
        break;
      case "Hoje":
        filtered = filtered.filter(t => {
          const vencimento = new Date(t.vencimento);
          return vencimento.toDateString() === hoje.toDateString() && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
        });
        break;
      case "Próximos 7":
        filtered = filtered.filter(t => {
          const vencimento = new Date(t.vencimento);
          return vencimento > hoje && vencimento <= em7Dias && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
        });
        break;
      case "Futuros":
        filtered = filtered.filter(t => {
          const vencimento = new Date(t.vencimento);
          return vencimento > em7Dias && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [titulos, searchTerm, statusFilter, filterChip]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'EM_ABERTO': { label: 'Em Aberto', value: 'EM_ABERTO', color: 'warning' as const },
      'PARCIAL': { label: 'Parcial', value: 'PARCIAL', color: 'info' as const },
      'QUITADO': { label: 'Quitado', value: 'QUITADO', color: 'success' as const },
      'VENCIDO': { label: 'Vencido', value: 'VENCIDO', color: 'destructive' as const },
    };
    return statusMap[status] || { label: status, value: status, color: 'secondary' as const };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const calcularDiasVencimento = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const toggleRowExpansion = (tituloId: string) => {
    setExpandedRows(prev => 
      prev.includes(tituloId) 
        ? prev.filter(id => id !== tituloId)
        : [...prev, tituloId]
    );
  };

  const handleRegistrarRecebimento = (titulo: any) => {
    setSelectedTitulo(titulo);
    setShowRecebimentoModal(true);
  };

  const handleGerarSegundaVia = async (titulo: any) => {
    const novoEvento = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      tipo: 'segunda_via' as const,
      descricao: '2ª via gerada',
      usuario: 'Admin'
    };

    const timelineAtualizada = [...(titulo.timeline || []), novoEvento];

    await updateTitulo.mutateAsync({
      id: titulo.id,
      timeline: timelineAtualizada,
      updated_at: new Date().toISOString()
    });

    toast({
      title: "2ª Via gerada",
      description: `Segunda via do título ${titulo.numero} foi gerada.`,
    });
  };

  const handleNotificar = async (titulo: any) => {
    const novoEvento = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      tipo: 'notificacao' as const,
      descricao: 'Notificação enviada por e-mail e WhatsApp',
      usuario: 'Admin'
    };

    const timelineAtualizada = [...(titulo.timeline || []), novoEvento];

    await updateTitulo.mutateAsync({
      id: titulo.id,
      timeline: timelineAtualizada,
      updated_at: new Date().toISOString()
    });

    toast({
      title: "Notificação enviada",
      description: `Cliente ${titulo.cliente?.nome || titulo.cliente?.razao_social || 'N/A'} foi notificado sobre o título ${titulo.numero}.`,
    });
  };

  const onRecebimentoSuccess = () => {
    setShowRecebimentoModal(false);
    setSelectedTitulo(null);
  };

  const handleEmitirBolePix = (titulo: any) => {
    setSelectedTitulo(titulo);
    setShowBolePixModal(true);
  };

  const onBolePixSuccess = async (cobrancaData: any) => {
    try {
      // Salvar cobrança no Supabase
      await createCobranca.mutateAsync({
        titulo_id: selectedTitulo.id,
        loja_id: lojaAtual?.id || '',
        status: cobrancaData.status,
        idempotency_key: cobrancaData.idempotencyKey,
        codigo_solicitacao: cobrancaData.codigoSolicitacao,
        linha_digitavel: cobrancaData.linhaDigitavel,
        codigo_barras: cobrancaData.codigoBarras,
        pix_copia_cola: cobrancaData.pixCopiaECola,
        qr_code_data_url: cobrancaData.qrCodeDataUrl,
        pdf_url: cobrancaData.pdfUrl,
        history: cobrancaData.history || [],
      });

      // Adicionar evento na timeline do título
      const novoEvento = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        tipo: 'bolepix_emitido' as const,
        descricao: 'BolePix emitido via Banco Inter',
        usuario: 'Admin',
        meta: {
          codigoSolicitacao: cobrancaData.codigoSolicitacao,
          status: cobrancaData.status,
          linhaDigitavel: cobrancaData.linhaDigitavel,
          pixCopiaECola: cobrancaData.pixCopiaECola,
        }
      };

      const timelineAtualizada = [...(selectedTitulo.timeline || []), novoEvento];

      await updateTitulo.mutateAsync({
        id: selectedTitulo.id,
        timeline: timelineAtualizada,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "BolePix emitido com sucesso!",
        description: cobrancaData.pixCopiaECola 
          ? "PIX Copia e Cola copiado para a área de transferência." 
          : "Linha digitável disponível para pagamento.",
      });

      setShowBolePixModal(false);
      setSelectedTitulo(null);
    } catch (error) {
      console.error('Erro ao processar BolePix:', error);
      toast({
        title: "Erro ao salvar BolePix",
        description: "A cobrança foi emitida mas houve erro ao salvar no sistema.",
        variant: "destructive",
      });
    }
  };

  const uniqueStatus = [...new Set(titulos.map(t => t.status))];
  const filterChips = ["Todos", "Atrasados", "Hoje", "Próximos 7", "Futuros"];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Filtros */}
      <div className="space-y-4">
        {/* Chips de filtro rápido */}
        <div className="flex flex-wrap gap-2">
          {filterChips.map(chip => (
            <Badge 
              key={chip}
              variant={filterChip === chip ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilterChip(chip)}
            >
              {chip}
            </Badge>
          ))}
        </div>

        {/* Filtros de busca */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, contrato ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 shadow-input border-input-border"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input"
            >
              <option value="">Todos os Status</option>
            {uniqueStatus.map(status => (
              <option key={String(status)} value={String(status)}>{String(status)}</option>
            ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de títulos */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando títulos...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            Erro ao carregar títulos. Por favor, verifique sua conexão.
          </div>
        ) : filteredTitulos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum título encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTitulos.map((titulo) => {
              const isExpanded = expandedRows.includes(titulo.id);
              const diasVencimento = calcularDiasVencimento(titulo.vencimento);

              return (
                <>
                  <TableRow key={titulo.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(titulo.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{titulo.cliente?.nome || titulo.cliente?.razao_social || 'Cliente não encontrado'}</TableCell>
                    <TableCell>{titulo.numero}</TableCell>
                    <TableCell>{titulo.contrato?.numero || 'N/A'}</TableCell>
                    <TableCell>{formatDate(titulo.emissao)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDate(titulo.vencimento)}</span>
                        {diasVencimento < 0 && titulo.status !== 'QUITADO' && (
                          <Badge variant="destructive" className="text-xs mt-1 w-fit">
                            {Math.abs(diasVencimento)} dias atraso
                          </Badge>
                        )}
                        {diasVencimento === 0 && titulo.status !== 'QUITADO' && (
                          <Badge variant="destructive" className="text-xs mt-1 w-fit">
                            Vence hoje
                          </Badge>
                        )}
                        {diasVencimento > 0 && diasVencimento <= 7 && titulo.status !== 'QUITADO' && (
                          <Badge variant="secondary" className="text-xs mt-1 w-fit">
                            {diasVencimento} dias
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>R$ {(titulo.valor || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>R$ {(titulo.pago || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>R$ {(titulo.saldo || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      <StatusBadge status={getStatusInfo(titulo.status)} />
                    </TableCell>
                    <TableCell>{titulo.forma}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleGerarSegundaVia(titulo)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Gerar 2ª via do documento</p>
                          </TooltipContent>
                        </Tooltip>
                        {titulo.status !== 'QUITADO' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRegistrarRecebimento(titulo)}
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Registrar recebimento/pagamento</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEmitirBolePix(titulo)}
                                  className="text-primary"
                                >
                                  <QrCode className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Emitir BolePix (Boleto + PIX)</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleNotificar(titulo)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enviar notificação ao cliente</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Linha expandida com timeline */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={12} className="bg-muted/20">
                        <div className="p-4">
                          <h4 className="font-semibold mb-3">Timeline do Título</h4>
                          <div className="space-y-2">
                            {Array.isArray(titulo.timeline) && titulo.timeline.map((evento: any) => (
                              <div key={evento.id} className="flex items-start gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{evento.descricao}</p>
                                       {evento.meta && (
                                         <p className="text-muted-foreground">
                                           {evento.meta.valor && `Valor: R$ ${(evento.meta.valor || 0).toLocaleString('pt-BR')}`}
                                           {evento.meta.forma && ` • Forma: ${evento.meta.forma}`}
                                           {evento.meta.valorLiquido && ` • Líquido: R$ ${(evento.meta.valorLiquido || 0).toLocaleString('pt-BR')}`}
                                         </p>
                                       )}
                                    </div>
                                    <div className="text-right text-muted-foreground">
                                      <p>{formatDate(evento.timestamp)}</p>
                                      <p>por {evento.usuario}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal de recebimento */}
      {selectedTitulo && (
        <>
          <RegistrarRecebimentoModal
            titulo={selectedTitulo}
            open={showRecebimentoModal}
            onOpenChange={setShowRecebimentoModal}
            onSuccess={onRecebimentoSuccess}
          />
          <EmitirBolePixModal
            titulo={selectedTitulo}
            open={showBolePixModal}
            onClose={() => setShowBolePixModal(false)}
            onSuccess={onBolePixSuccess}
          />
        </>
      )}
      <AgruparFaturaModal
        open={showAgruparModal}
        onClose={() => setShowAgruparModal(false)}
        titulos={titulos.filter(t => selectedTitulos.includes(t.id))}
      />
      </div>
    </TooltipProvider>
  );
}