import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, DollarSign, Users, AlertTriangle, TrendingDown, MessageSquare, Phone, FileText, ChevronDown, ChevronRight, X, Clock, QrCode, Copy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AgingBucket } from "@/types";
import EnviarAvisoModal from "@/components/inadimplencia/EnviarAvisoModal";
import RegistrarContatoModal from "@/components/inadimplencia/RegistrarContatoModal";
import { EmitirBolePixModal } from "@/components/bolepix/EmitirBolePixModal";
import { timelineStore } from "@/stores/timelineStore";
import { StatusBadge } from "@/components/ui/status-badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useSupabaseCobrancasInter } from "@/hooks/useSupabaseCobrancasInter";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { toast } from "sonner";

// Configurações de juros e multa
const CONFIG_COBRANCA = {
  multaPercentual: 2,
  jurosAoDiaPercentual: 0.033,
  valorMinimoParaCobrar: 50,
  diasRefReforcos: [7, 30, 60]
};

export default function Inadimplencia() {
  const { lojaAtual } = useMultiunidade();
  const { titulos = [], updateTitulo } = useSupabaseTitulos(lojaAtual?.id);
  const { clientes = [] } = useSupabaseClientes(lojaAtual?.id);
  const { cobrancas, createCobranca } = useSupabaseCobrancasInter(lojaAtual?.id);

  // BolePix modal state
  const [showBolePixModal, setShowBolePixModal] = useState(false);
  const [selectedTituloForBolePix, setSelectedTituloForBolePix] = useState<any>(null);

  // Map titulo_id → latest cobranca
  const cobrancaByTitulo = useMemo(() => {
    const map = new Map<string, any>();
    (cobrancas || []).forEach(c => {
      const existing = map.get(c.titulo_id);
      if (!existing || new Date(c.created_at) > new Date(existing.created_at)) {
        map.set(c.titulo_id, c);
      }
    });
    return map;
  }, [cobrancas]);

  const handleEmitirBolePixInadimplencia = (titulo: any) => {
    setSelectedTituloForBolePix(titulo);
    setShowBolePixModal(true);
  };

  const onBolePixSuccess = async (cobrancaData: any) => {
    try {
      await createCobranca.mutateAsync({
        titulo_id: selectedTituloForBolePix.id,
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
      toast.success("BolePix emitido para título vencido!");
      setShowBolePixModal(false);
      setSelectedTituloForBolePix(null);
    } catch (error) {
      console.error('Erro ao emitir BolePix:', error);
      toast.error("Erro ao emitir BolePix");
    }
  };

  const handleCopyPix = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    toast.success("PIX Copia e Cola copiado!");
  };

  // Estado dos filtros simplificados com persistência
  const [filtros, setFiltros] = useState(() => {
    const saved = localStorage.getItem('agingFilters');
    const defaultFilters = {
      vendedor: '',
      clienteId: ''
    };
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultFilters, vendedor: parsed.vendedor || '', clienteId: parsed.clienteId || '' };
      } catch {
        return defaultFilters;
      }
    }
    return defaultFilters;
  });

  const [faixaSelecionada, setFaixaSelecionada] = useState<string>('');
  const [clienteBuscaAberto, setClienteBuscaAberto] = useState(false);
  const [clienteBusca, setClienteBusca] = useState('');

  // Salvar filtros no localStorage
  useEffect(() => {
    localStorage.setItem('agingFilters', JSON.stringify(filtros));
  }, [filtros]);

  // Buscar clientes para autocomplete
  const clientesFiltrados = useMemo(() => {
    if (!clienteBusca.trim()) return [];
    const termo = clienteBusca.toLowerCase();
    
    return clientes.filter(cliente => {
      const nome = cliente.nome || cliente.razao_social || '';
      const doc = cliente.cpf || cliente.cnpj || '';
      return nome.toLowerCase().includes(termo) || doc.toLowerCase().includes(termo);
    }).slice(0, 10);
  }, [clienteBusca, clientes]);

  const clienteSelecionado = useMemo(() => {
    if (!filtros.clienteId) return null;
    return clientes.find(c => c.id === filtros.clienteId) || null;
  }, [filtros.clienteId, clientes]);

  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [clientesExpandidos, setClientesExpandidos] = useState<string[]>([]);
  const [modalAviso, setModalAviso] = useState<{ open: boolean; clienteId?: string; tituloId?: string }>({
    open: false
  });
  const [modalContato, setModalContato] = useState<{ open: boolean; clienteId?: string; tituloId?: string }>({
    open: false
  });

  // Timeline store
  const { addEntry, getLastContact, exportTimelineCSV } = timelineStore();

  // Calcular aging buckets - carregar todos os vencidos por padrão
  const agingData = useMemo(() => {
    const hoje = new Date();
    const clientesComVencidos = new Map<string, AgingBucket>();

    // Processar títulos vencidos (saldo > 0 e vencimento < hoje)
    titulos.forEach(titulo => {
      if (!titulo.saldo || titulo.saldo <= 0) return;
      
      const vencimento = new Date(titulo.vencimento);
      if (vencimento >= hoje) return;
      
      const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
      
      const cliente = clientes.find(c => c.id === titulo.clienteId);
      if (!cliente) return;

      // Filtro por cliente selecionado
      if (filtros.clienteId && titulo.clienteId !== filtros.clienteId) return;

      if (!clientesComVencidos.has(titulo.clienteId)) {
        const timelineCliente = getLastContact(titulo.clienteId);
        
        const ultimoContato = timelineCliente ? {
          ts: new Date(timelineCliente.dataISO).getTime(),
          usuarioNome: timelineCliente.user.nome,
          canal: timelineCliente.canal,
          dataFormatada: new Date(timelineCliente.dataISO).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ` — ${timelineCliente.user.nome}`
        } : undefined;

        clientesComVencidos.set(titulo.clienteId, {
          clienteId: titulo.clienteId,
          cliente: cliente as any,
          qtdeTitulosVencidos: 0,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucket90Plus: 0,
          totalVencido: 0,
          ultimoContato,
          titulosVencidos: []
        });
      }

      const bucket = clientesComVencidos.get(titulo.clienteId)!;
      bucket.qtdeTitulosVencidos++;
      bucket.totalVencido += titulo.saldo;
      bucket.titulosVencidos.push(titulo as any);

      // Classificar em buckets
      if (diasAtraso <= 30) bucket.bucket0_30 += titulo.saldo;
      else if (diasAtraso <= 60) bucket.bucket31_60 += titulo.saldo;
      else if (diasAtraso <= 90) bucket.bucket61_90 += titulo.saldo;
      else bucket.bucket90Plus += titulo.saldo;
    });

    return Array.from(clientesComVencidos.values())
      .sort((a, b) => b.totalVencido - a.totalVencido);
  }, [filtros, titulos, clientes, getLastContact]);

  // Calcular KPIs por faixa
  const kpis = useMemo(() => {
    const bucket0_30 = agingData.reduce((acc, bucket) => acc + bucket.bucket0_30, 0);
    const bucket31_60 = agingData.reduce((acc, bucket) => acc + bucket.bucket31_60, 0);
    const bucket61_90 = agingData.reduce((acc, bucket) => acc + bucket.bucket61_90, 0);
    const bucket90Plus = agingData.reduce((acc, bucket) => acc + bucket.bucket90Plus, 0);
    
    const totalEmAberto = bucket0_30 + bucket31_60 + bucket61_90 + bucket90Plus;
    const totalVencido = totalEmAberto; // Todos são vencidos no aging
    const clientesInadimplentes = agingData.length;
    const percentualMaior90 = totalEmAberto > 0 ? (bucket90Plus / totalEmAberto) * 100 : 0;

    return {
      bucket0_30,
      bucket31_60,
      bucket61_90,
      bucket90Plus,
      totalEmAberto,
      totalVencido,
      clientesInadimplentes,
      percentualMaior90
    };
  }, [agingData]);

  // Calcular juros e multa
  const calcularJurosMulta = (titulo: any) => {
    const vencimento = new Date(titulo.vencimento);
    const hoje = new Date();
    const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
    const saldo = titulo.saldo || 0;
    
    const multa = diasAtraso > 0 ? (saldo * CONFIG_COBRANCA.multaPercentual / 100) : 0;
    const juros = diasAtraso > 0 ? (saldo * CONFIG_COBRANCA.jurosAoDiaPercentual / 100 * diasAtraso) : 0;
    
    return {
      diasAtraso,
      multa,
      juros,
      valorComJuros: saldo + multa + juros
    };
  };

  const toggleExpandido = (clienteId: string) => {
    setClientesExpandidos(prev => 
      prev.includes(clienteId) 
        ? prev.filter(id => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  const toggleSelecionado = (clienteId: string) => {
    setClientesSelecionados(prev => 
      prev.includes(clienteId)
        ? prev.filter(id => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  const handleSelecionarTodos = () => {
    if (clientesSelecionados.length === agingData.length) {
      setClientesSelecionados([]);
    } else {
      setClientesSelecionados(agingData.map(bucket => bucket.clienteId));
    }
  };

  const handleKpiClick = (faixa: string) => {
    setFaixaSelecionada(faixa === faixaSelecionada ? '' : faixa);
    // Scroll para o grid
    document.getElementById('aging-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  const limparClienteSelecionado = () => {
    setFiltros(prev => ({ ...prev, clienteId: '' }));
    setClienteBusca('');
  };

  // Handlers para timeline
  const handleEnviarAviso = (clienteId: string, tituloId?: string) => {
    setModalAviso({ open: true, clienteId, tituloId });
  };

  const handleRegistrarContato = (clienteId: string, tituloId?: string) => {
    setModalContato({ open: true, clienteId, tituloId });
  };

  const handleExportTimeline = () => {
    const clienteIds = clientesSelecionados.length > 0 
      ? clientesSelecionados 
      : agingData.map(bucket => bucket.clienteId);
    exportTimelineCSV(clienteIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inadimplência (Aging)</h1>
          <p className="text-muted-foreground">Gestão de clientes em atraso por faixas etárias</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            disabled={clientesSelecionados.length === 0}
            onClick={() => setModalAviso({ open: true })}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Enviar Avisos ({clientesSelecionados.length})
          </Button>
          <Button variant="outline" onClick={handleExportTimeline}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar Timeline
          </Button>
        </div>
      </div>

      {/* KPIs por Faixa */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card 
          className={`shadow-md cursor-pointer transition-all hover:shadow-lg ${faixaSelecionada === '0-30' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => handleKpiClick('0-30')}
          title="Soma dos SALDOS vencidos na faixa 0-30 dias considerando Data de Referência"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">0-30 dias</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.bucket0_30.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`shadow-md cursor-pointer transition-all hover:shadow-lg ${faixaSelecionada === '31-60' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => handleKpiClick('31-60')}
          title="Soma dos SALDOS vencidos na faixa 31-60 dias considerando Data de Referência"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">31-60 dias</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.bucket31_60.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`shadow-md cursor-pointer transition-all hover:shadow-lg ${faixaSelecionada === '61-90' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => handleKpiClick('61-90')}
          title="Soma dos SALDOS vencidos na faixa 61-90 dias considerando Data de Referência"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">61-90 dias</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.bucket61_90.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`shadow-md cursor-pointer transition-all hover:shadow-lg ${faixaSelecionada === '90+' ? 'ring-2 ring-red-900' : ''}`}
          onClick={() => handleKpiClick('90+')}
          title="Soma dos SALDOS vencidos na faixa > 90 dias considerando Data de Referência"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-900/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-900" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">&gt; 90 dias</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.bucket90Plus.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vencido</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {kpis.totalVencido.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Simplificados */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Popover open={clienteBuscaAberto} onOpenChange={setClienteBuscaAberto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteBuscaAberto}
                    className="w-full justify-between"
                  >
                    {clienteSelecionado ? (
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {(clienteSelecionado.nome || clienteSelecionado.razao_social || '').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="font-medium">{clienteSelecionado.nome || clienteSelecionado.razao_social}</span>
                          <span className="text-muted-foreground text-sm ml-2">{clienteSelecionado.cpf || clienteSelecionado.cnpj}</span>
                        </div>
                      </div>
                    ) : (
                      "Selecionar cliente..."
                    )}
                    {clienteSelecionado ? (
                      <X className="ml-2 h-4 w-4 shrink-0 opacity-50" onClick={(e) => {e.stopPropagation(); limparClienteSelecionado();}} />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar por nome ou documento..." 
                      value={clienteBusca}
                      onValueChange={setClienteBusca}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clientesFiltrados.map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            value={cliente.id}
                            onSelect={() => {
                              setFiltros(prev => ({ ...prev, clienteId: cliente.id }));
                              setClienteBuscaAberto(false);
                              setClienteBusca('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {(cliente.nome || cliente.razao_social || '').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{cliente.nome || cliente.razao_social || ''}</p>
                                <p className="text-sm text-muted-foreground">{cliente.cpf || cliente.cnpj || ''}</p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vendedor</label>
              <Select value={filtros.vendedor} onValueChange={(value) => setFiltros(prev => ({ ...prev, vendedor: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os vendedores</SelectItem>
                  <SelectItem value="vendedor1">João Silva</SelectItem>
                  <SelectItem value="vendedor2">Maria Santos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Aging */}
      <Card className="shadow-md" id="aging-grid">
        <CardHeader>
          <CardTitle>
            Aging por Cliente
            {faixaSelecionada && (
              <Badge variant="outline" className="ml-2">
                Filtrado: {faixaSelecionada} dias
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => setFaixaSelecionada('')}
                />
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={clientesSelecionados.length === agingData.length}
                    onCheckedChange={handleSelecionarTodos}
                  />
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Qtde Títulos</TableHead>
                <TableHead className="text-center">0-30 dias</TableHead>
                <TableHead className="text-center">31-60 dias</TableHead>
                <TableHead className="text-center">61-90 dias</TableHead>
                <TableHead className="text-center">&gt; 90 dias</TableHead>
                <TableHead className="text-center">Total Vencido</TableHead>
                <TableHead className="text-center">Último Contato</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingData.filter((bucket) => {
                if (!faixaSelecionada) return true;
                
                switch (faixaSelecionada) {
                  case '0-30': return bucket.bucket0_30 > 0;
                  case '31-60': return bucket.bucket31_60 > 0;
                  case '61-90': return bucket.bucket61_90 > 0;
                  case '90+': return bucket.bucket90Plus > 0;
                  default: return true;
                }
              }).map((bucket) => (
                <>
                  <TableRow key={bucket.clienteId} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={clientesSelecionados.includes(bucket.clienteId)}
                        onCheckedChange={() => toggleSelecionado(bucket.clienteId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpandido(bucket.clienteId)}
                        >
                          {clientesExpandidos.includes(bucket.clienteId) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div>
                          <p className="font-medium">{bucket.cliente.nomeRazao}</p>
                          <p className="text-sm text-muted-foreground">{bucket.cliente.documento}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {bucket.qtdeTitulosVencidos}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bucket.bucket0_30 > 0 ? "destructive" : "secondary"}>
                        R$ {bucket.bucket0_30.toLocaleString('pt-BR')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bucket.bucket31_60 > 0 ? "destructive" : "secondary"}>
                        R$ {bucket.bucket31_60.toLocaleString('pt-BR')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bucket.bucket61_90 > 0 ? "destructive" : "secondary"}>
                        R$ {bucket.bucket61_90.toLocaleString('pt-BR')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bucket.bucket90Plus > 0 ? "destructive" : "secondary"}>
                        R$ {bucket.bucket90Plus.toLocaleString('pt-BR')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      R$ {bucket.totalVencido.toLocaleString('pt-BR')}
                    </TableCell>
                     <TableCell className="text-center">
                       {bucket.ultimoContato ? (
                         <div title={bucket.ultimoContato.dataFormatada} className="flex flex-col items-center">
                           <Badge 
                             variant="outline" 
                             className={`text-xs mb-1 ${
                               bucket.ultimoContato.canal === 'WHATSAPP' ? 'bg-green-50 text-green-700 border-green-200' :
                               bucket.ultimoContato.canal === 'EMAIL' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                               bucket.ultimoContato.canal === 'TELEFONE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                               'bg-gray-50 text-gray-700 border-gray-200'
                             }`}
                           >
                             {bucket.ultimoContato.canal || 'N/A'}
                           </Badge>
                           <div className="text-xs text-muted-foreground">
                             {(() => {
                               const agora = new Date();
                               const contato = new Date(bucket.ultimoContato.ts);
                               const diffMs = agora.getTime() - contato.getTime();
                               const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
                               const diffDias = Math.floor(diffHoras / 24);
                               
                               if (diffHoras < 1) return 'agora';
                               if (diffHoras < 24) return `há ${diffHoras}h`;
                               return `há ${diffDias}d`;
                             })()}
                           </div>
                         </div>
                       ) : (
                         <Badge variant="secondary">Nenhum</Badge>
                       )}
                     </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModalAviso({ open: true, clienteId: bucket.clienteId })}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModalContato({ open: true, clienteId: bucket.clienteId })}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Linha expandida com títulos vencidos */}
                  {clientesExpandidos.includes(bucket.clienteId) && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/20">
                        <div className="p-4">
                          <h4 className="font-medium mb-3">Títulos Vencidos</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead>Contrato</TableHead>
                                <TableHead>Emissão</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Pago</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Dias Atraso</TableHead>
                                <TableHead>Com Juros</TableHead>
                                <TableHead>Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bucket.titulosVencidos.map((titulo) => {
                                const calculoJuros = calcularJurosMulta(titulo);
                                return (
                                  <TableRow key={titulo.id}>
                                    <TableCell className="font-medium">{titulo.numero}</TableCell>
                                    <TableCell>{titulo.contrato?.numero || '-'}</TableCell>
                                    <TableCell>{new Date(titulo.emissao).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{new Date(titulo.vencimento).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>R$ {titulo.valor.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>R$ {titulo.pago.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>R$ {titulo.saldo.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      <Badge variant="destructive">{calculoJuros.diasAtraso} dias</Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      R$ {calculoJuros.valorComJuros.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setModalAviso({ 
                                            open: true, 
                                            clienteId: bucket.clienteId, 
                                            tituloId: titulo.id 
                                          })}
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setModalContato({ 
                                            open: true, 
                                            clienteId: bucket.clienteId, 
                                            tituloId: titulo.id 
                                          })}
                                        >
                                          <Phone className="w-4 h-4" />
                                        </Button>
                                        <Button variant="outline" size="sm">
                                          <FileText className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
          
          {agingData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente inadimplente encontrado com os filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <EnviarAvisoModal 
        open={modalAviso.open} 
        onOpenChange={(open) => setModalAviso({ open })}
        clienteId={modalAviso.clienteId}
        tituloId={modalAviso.tituloId}
        onSuccess={() => {
          // Forçar recálculo do aging data
          window.location.reload();
        }}
      />
      
      <RegistrarContatoModal 
        open={modalContato.open} 
        onOpenChange={(open) => setModalContato({ open })}
        clienteId={modalContato.clienteId}
        tituloId={modalContato.tituloId}
        onSuccess={() => {
          // Forçar recálculo do aging data
          window.location.reload();
        }}
      />
    </div>
  );
}