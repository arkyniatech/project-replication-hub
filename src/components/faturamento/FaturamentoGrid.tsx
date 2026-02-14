import { useState, useEffect, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  MoreHorizontal, 
  ExternalLink, 
  Edit, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2
} from "lucide-react";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseFaturas } from "@/hooks/useSupabaseFaturas";
import { formatCurrency, cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { LancamentoFaturavel } from "@/types/faturamento";

export function FaturamentoGrid() {
  const { filtros } = useFaturamentoStore();
  
  // Destructure filtros to avoid infinite loop in useEffect
  const { dtIni, dtFim, unidadeId, clienteId } = filtros;
  
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Use local state for lancamentos to avoid infinite loop
  const [lancamentosFaturaveis, setLancamentosFaturaveis] = useState<LancamentoFaturavel[]>([]);
  
  // Buscar contratos ativos do Supabase
  const { contratos = [], isLoading } = useSupabaseContratos(unidadeId);
  
  // Buscar faturas já emitidas no período
  const { faturas = [] } = useSupabaseFaturas(unidadeId);
  
  // Transformar contratos em lançamentos faturáveis
  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      setLancamentosFaturaveis([]);
      return;
    }
    
    const lancamentos: LancamentoFaturavel[] = [];
    const filtroIni = parseISO(dtIni);
    const filtroFim = parseISO(dtFim);
    
    // IDs de contratos que já foram faturados neste período
    const contratosFaturados = new Set(
      faturas
        .filter(f => {
          const emissao = parseISO(f.emissao);
          return emissao >= filtroIni && emissao <= filtroFim;
        })
        .map(f => f.contrato_id)
    );
    
    contratos.forEach(contrato => {
      // Só processar contratos ATIVOS
      if (contrato.status !== 'ATIVO') return;
      
      // Pular contratos que já foram faturados neste período
      if (contratosFaturados.has(contrato.id)) return;
      
      // Verificar se está no período dos filtros
      const dataFim = contrato.data_fim ? parseISO(contrato.data_fim) : null;
      const dataInicio = contrato.data_inicio ? parseISO(contrato.data_inicio) : null;
      
      if (!dataFim || !dataInicio) return;
      
      // Verificar se o período do contrato intersecta com o filtro
      const intersecta = dataFim >= filtroIni && dataInicio <= filtroFim;
      if (!intersecta) return;
      
      // Filtrar por cliente se especificado
      if (clienteId) {
        const cliente = contrato.clientes;
        const nomeCliente = cliente?.nome || cliente?.razao_social || '';
        const docCliente = cliente?.cpf || cliente?.cnpj || '';
        const buscaCliente = clienteId.toLowerCase();
        
        if (
          !nomeCliente.toLowerCase().includes(buscaCliente) &&
          !docCliente.toLowerCase().includes(buscaCliente)
        ) {
          return;
        }
      }
      
      // Calcular período de faturamento (interseção entre período do contrato e filtro)
      const periodoInicio = dataInicio > filtroIni ? dataInicio : filtroIni;
      const periodoFim = dataFim < filtroFim ? dataFim : filtroFim;
      
      // Calcular dias no período
      const diasNoPeriodo = Math.ceil((periodoFim.getTime() - periodoInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Para cada item do contrato
      (contrato.contrato_itens || []).forEach(item => {
        // Obter descrição do item
        let descricao = 'Item';
        if (item.modelos_equipamentos?.nome_comercial) {
          descricao = item.modelos_equipamentos.nome_comercial;
        } else if (item.grupos_equipamentos?.nome) {
          descricao = item.grupos_equipamentos.nome;
        } else if (item.equipamentos?.codigo_interno) {
          descricao = item.equipamentos.codigo_interno;
        }
        
        // Calcular valor proporcional ao período
        const precoUnitario = Number(item.preco_unitario) || 0;
        const quantidade = item.quantidade || 1;
        const subtotal = (precoUnitario * quantidade * diasNoPeriodo) / 30; // Assumindo base mensal
        
        lancamentos.push({
          id: `${contrato.id}_${item.id}`,
          contratoId: contrato.id,
          contratoNumero: contrato.numero,
          clienteId: contrato.cliente_id,
          clienteNome: contrato.clientes?.nome || contrato.clientes?.razao_social || 'Cliente',
          itemDescricao: descricao,
          periodo: {
            inicio: format(periodoInicio, 'yyyy-MM-dd'),
            fim: format(periodoFim, 'yyyy-MM-dd')
          },
          quantidade,
          precoUnitario,
          subtotal,
          situacao: 'OK',
          origem: 'CONTRATO',
          selecionado: false
        });
      });
    });
    
    // Update only local state - don't sync to store to avoid infinite loop
    setLancamentosFaturaveis(lancamentos);
  }, [contratos, faturas, dtIni, dtFim, clienteId]);

  const todosSelecionados = lancamentosFaturaveis.length > 0 && 
    lancamentosFaturaveis.every(l => l.selecionado);
  
  const algunsSelecionados = lancamentosFaturaveis.some(l => l.selecionado);

  // Local selection handlers that work on local state
  const handleToggleSelecionado = (lancamentoId: string) => {
    setLancamentosFaturaveis(prev => 
      prev.map(l => l.id === lancamentoId ? { ...l, selecionado: !l.selecionado } : l)
    );
  };

  const handleSelecionarTodos = (checked: boolean) => {
    setLancamentosFaturaveis(prev => 
      prev.map(l => ({ ...l, selecionado: checked }))
    );
  };

  const handleExcluirDaSelecao = (lancamentoId: string) => {
    setLancamentosFaturaveis(prev =>
      prev.map(l => l.id === lancamentoId ? { ...l, selecionado: false } : l)
    );
    
    // Clear previous timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    // Show undo option
    const timeout = setTimeout(() => {
      setUndoTimeout(null);
    }, 5000);
    
    setUndoTimeout(timeout);
    
    toast.success("Item excluído da seleção", {
      action: {
        label: "Desfazer",
        onClick: () => {
          handleToggleSelecionado(lancamentoId);
          if (undoTimeout) {
            clearTimeout(undoTimeout);
            setUndoTimeout(null);
          }
        }
      }
    });
  };

  const getSituacaoIcon = (situacao: string) => {
    switch (situacao) {
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'DIVERGENTE':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSituacaoBadge = (situacao: string, motivo?: string) => {
    const props = situacao === 'OK' 
      ? { variant: "default" as const, children: "OK", className: "bg-success text-success-foreground" }
      : { variant: "secondary" as const, children: "Divergente", className: "bg-warning text-warning-foreground" };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
        <Badge {...props} className={cn("cursor-help", props.className)}>
          {getSituacaoIcon(situacao)}
          {props.children}
        </Badge>
          </TooltipTrigger>
          {motivo && (
            <TooltipContent>
              <p className="text-xs max-w-64">{motivo}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const formatPeriodo = (periodo: { inicio: string; fim: string }) => {
    const inicio = format(new Date(periodo.inicio), "dd/MM", { locale: ptBR });
    const fim = format(new Date(periodo.fim), "dd/MM", { locale: ptBR });
    return `${inicio} – ${fim}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando contratos...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lancamentosFaturaveis.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-muted-foreground">
              Nenhum lançamento encontrado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Nada a faturar no período selecionado.<br />
              Ajuste o corte ou revise os contratos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lançamentos A Faturar</CardTitle>
            <div className="text-sm text-muted-foreground">
              {lancamentosFaturaveis.filter(l => l.selecionado).length} de{' '}
              {lancamentosFaturaveis.length} selecionados
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={todosSelecionados}
                      onCheckedChange={handleSelecionarTodos}
                      className={cn(
                        algunsSelecionados && !todosSelecionados && 
                        "data-[state=unchecked]:bg-muted data-[state=unchecked]:opacity-50"
                      )}
                    />
                  </TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Item/Descrição</TableHead>
                  <TableHead className="sticky left-0 bg-background z-10 border-r">
                    Período
                  </TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFaturaveis.map((lancamento) => (
                  <TableRow 
                    key={lancamento.id} 
                    className={cn(
                      "transition-colors",
                      lancamento.selecionado && "bg-muted/50"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={lancamento.selecionado}
                        onCheckedChange={() => handleToggleSelecionado(lancamento.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-mono text-sm">{lancamento.contratoNumero}</div>
                        <div className="text-xs text-muted-foreground">
                          {lancamento.clienteNome}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lancamento.itemDescricao}</div>
                        {lancamento.observacaoImpressao && (
                          <div className="text-xs text-muted-foreground mt-1">
                            📝 {lancamento.observacaoImpressao}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="sticky left-0 bg-background z-10 border-r font-mono text-sm">
                      {formatPeriodo(lancamento.periodo)}
                    </TableCell>
                    <TableCell className="text-right">
                      {lancamento.quantidade}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(lancamento.precoUnitario)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(lancamento.subtotal)}
                    </TableCell>
                    <TableCell>
                      {getSituacaoBadge(lancamento.situacao, lancamento.motivoDivergencia)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lancamento.origem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir contrato
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Observação
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleExcluirDaSelecao(lancamento.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir da seleção
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}