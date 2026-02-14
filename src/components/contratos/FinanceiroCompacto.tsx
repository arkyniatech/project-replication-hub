import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CreditCard, FileText, ChevronUp, ChevronDown, AlertCircle, Circle } from "lucide-react";
import { useState, useMemo } from "react";

interface Recebimento {
  valor: number;
  payment_date: string;
  meio: 'Pix' | 'Boleto' | 'Dinheiro' | 'TED';
}

interface Aditivo {
  motivo?: string;
  valor: number;
  data: string;
}

interface ParcelaDTO {
  id: string;
  codigo: string;
  valor: number;
  vencimento: string;
  status: 'ABERTA' | 'ATRASADA' | 'PAGA' | 'CANCELADA';
  issue_date: string;
  period_start: string;
  period_end: string;
  nfse_number?: string;
  emitido_por?: string;
  recebimentos?: Recebimento[];
  has_aditivo?: boolean;
  aditivos?: Aditivo[];
  is_proportional?: boolean;
}

interface PrevisaoDTO {
  id: string;
  numero: string;
  tipo: string;
  descricao: string;
  valor: number;
  periodoInicio?: string;
  periodoFim?: string;
  contratoId: string;
}

interface FinanceiroCompactoProps {
  parcelas: ParcelaDTO[];
  previsoesNaoFaturadas?: PrevisaoDTO[];
  saldoAtraso: number;
  totalPrevisoes?: number;
  onSegundaVia: (id: string) => void;
  onReceber: (id: string) => void;
  onFaturarPrevisao?: (aditivoId: string) => void;
  onAbrirNfse?: (nf: number) => void;
  onAbrirFinanceiroCompleto: () => void;
}

type FilterType = 'TODAS' | 'ABERTAS' | 'ATRASADAS' | 'PAGAS';
type SortField = 'vencimento' | 'emissao' | 'pago_em';
type SortDirection = 'asc' | 'desc';

export function FinanceiroCompacto({
  parcelas,
  previsoesNaoFaturadas = [],
  saldoAtraso,
  totalPrevisoes = 0,
  onSegundaVia,
  onReceber,
  onFaturarPrevisao,
  onAbrirNfse,
  onAbrirFinanceiroCompleto
}: FinanceiroCompactoProps) {
  const [filter, setFilter] = useState<FilterType>('TODAS');
  const [sortField, setSortField] = useState<SortField>('vencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getSituacaoBadge = (status: ParcelaDTO['status']) => {
    const variants = {
      PAGA: "bg-emerald-100 text-emerald-700",
      ABERTA: "bg-slate-100 text-slate-700", 
      ATRASADA: "bg-rose-100 text-rose-700",
      CANCELADA: "bg-zinc-100 text-zinc-700"
    };
    return variants[status];
  };

  const formatDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateISO: string) => {
    return new Date(dateISO).toLocaleString('pt-BR');
  };

  const getValorPago = (parcela: ParcelaDTO) => {
    if (!parcela.recebimentos || parcela.recebimentos.length === 0) return 0;
    return parcela.recebimentos.reduce((total, rec) => total + rec.valor, 0);
  };

  const getPercentualPago = (parcela: ParcelaDTO) => {
    const valorPago = getValorPago(parcela);
    return Math.round((valorPago / parcela.valor) * 100);
  };

  const parcelasFiltradas = useMemo(() => {
    let filtered = parcelas;

    // Aplicar filtros
    switch (filter) {
      case 'ABERTAS':
        filtered = parcelas.filter(p => p.status === 'ABERTA');
        break;
      case 'ATRASADAS':
        filtered = parcelas.filter(p => p.status === 'ATRASADA');
        break;
      case 'PAGAS':
        filtered = parcelas.filter(p => p.status === 'PAGA');
        break;
      default:
        break;
    }

    // Aplicar ordenação
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'vencimento':
          aValue = new Date(a.vencimento);
          bValue = new Date(b.vencimento);
          break;
        case 'emissao':
          aValue = new Date(a.issue_date);
          bValue = new Date(b.issue_date);
          break;
        case 'pago_em':
          const aLastPayment = a.recebimentos?.[a.recebimentos.length - 1]?.payment_date;
          const bLastPayment = b.recebimentos?.[b.recebimentos.length - 1]?.payment_date;
          aValue = aLastPayment ? new Date(aLastPayment) : new Date(0);
          bValue = bLastPayment ? new Date(bLastPayment) : new Date(0);
          break;
        default:
          return 0;
      }

      if (sortDirection === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });
  }, [parcelas, filter, sortField, sortDirection]);

  const parcelasVisiveis = parcelasFiltradas.slice(0, 6);
  const hasMore = parcelasFiltradas.length > 6;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1" /> : 
      <ChevronDown className="h-3 w-3 ml-1" />;
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Financeiro</CardTitle>
            <Button 
              onClick={onAbrirFinanceiroCompleto} 
              variant="outline" 
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Gerar Cobrança
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seção de Previsões de Faturamento */}
          {previsoesNaoFaturadas.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-sm font-semibold text-blue-900">Previsões de Faturamento</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {previsoesNaoFaturadas.length}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-blue-900">
                  Total: R$ {totalPrevisoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-2">
                {previsoesNaoFaturadas.map((previsao) => (
                  <div
                    key={previsao.id}
                    className="flex items-center justify-between p-3 rounded-md bg-white border border-blue-100"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          Aditivo {previsao.numero}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {previsao.tipo}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {previsao.descricao}
                      </p>
                      {previsao.periodoInicio && previsao.periodoFim && (
                        <p className="text-xs text-muted-foreground">
                          Período: {formatDate(previsao.periodoInicio)} - {formatDate(previsao.periodoFim)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        R$ {previsao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {onFaturarPrevisao && (
                        <Button
                          size="sm"
                          onClick={() => onFaturarPrevisao(previsao.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Faturar Agora
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-blue-700">
                💡 Valores pendentes de faturamento. Clique em "Faturar Agora" para gerar a cobrança.
              </p>
            </div>
          )}

          {saldoAtraso > 0 && (
            <div 
              className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 text-rose-700 cursor-pointer hover:bg-rose-100 transition-colors"
              onClick={onAbrirFinanceiroCompleto}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Há parcelas vencidas — clique para regularizar
              </span>
            </div>
          )}

          {parcelas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma parcela gerada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Filtros rápidos */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                {(['TODAS', 'ABERTAS', 'ATRASADAS', 'PAGAS'] as FilterType[]).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filter === filterType
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filterType === 'TODAS' ? 'Todas' : 
                     filterType === 'ABERTAS' ? 'Abertas' :
                     filterType === 'ATRASADAS' ? 'Atrasadas' : 'Pagas'}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[96px]">Parcela</TableHead>
                      <TableHead 
                        className="min-w-[120px] cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('emissao')}
                      >
                        <div className="flex items-center">
                          Emissão
                          {renderSortIcon('emissao')}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[176px]">Período (de–até)</TableHead>
                      <TableHead 
                        className="min-w-[120px] cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('vencimento')}
                      >
                        <div className="flex items-center">
                          Vencimento
                          {renderSortIcon('vencimento')}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[120px] text-right">Valor</TableHead>
                      <TableHead className="min-w-[120px]">Situação</TableHead>
                      <TableHead 
                        className="min-w-[140px] cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('pago_em')}
                      >
                        <div className="flex items-center">
                          Pago em
                          {renderSortIcon('pago_em')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelasVisiveis.map((parcela) => {
                      const valorPago = getValorPago(parcela);
                      const percentualPago = getPercentualPago(parcela);
                      const isParcial = valorPago > 0 && parcela.status !== 'PAGA';
                      const ultimoPagamento = parcela.recebimentos?.[parcela.recebimentos.length - 1];

                      return (
                        <TableRow key={parcela.id}>
                          <TableCell className="font-medium">{parcela.codigo}</TableCell>
                          
                          {/* Emissão */}
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  {formatDate(parcela.issue_date)}
                                  {parcela.nfse_number && onAbrirNfse && (
                                    <div>
                                      <button
                                        onClick={() => onAbrirNfse(Number(parcela.nfse_number))}
                                        className="text-xs text-primary hover:underline"
                                      >
                                        NF {parcela.nfse_number}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>emitido por {parcela.emitido_por || 'Sistema'} · {formatDateTime(parcela.issue_date)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Período */}
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  {formatDate(parcela.period_start)} – {formatDate(parcela.period_end)}
                                  {parcela.has_aditivo && (
                                    <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                                  )}
                                  {parcela.is_proportional && (
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p>Regra: mensal · Itens: 1</p>
                                  {parcela.has_aditivo && parcela.aditivos && (
                                    <div>
                                      {parcela.aditivos.map((aditivo, idx) => (
                                        <p key={idx}>
                                          Aditivo: R$ {aditivo.valor.toLocaleString('pt-BR')} — {formatDate(aditivo.data)} ({aditivo.motivo || 'Sem motivo'})
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {parcela.is_proportional && <p>Período proporcional</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Vencimento */}
                          <TableCell>{formatDate(parcela.vencimento)}</TableCell>

                          {/* Valor */}
                          <TableCell className="text-right font-medium">
                            R$ {parcela.valor.toLocaleString('pt-BR')}
                          </TableCell>

                          {/* Situação */}
                          <TableCell>
                            <Badge className={getSituacaoBadge(parcela.status)}>
                              {parcela.status}
                            </Badge>
                          </TableCell>

                          {/* Pago em */}
                          <TableCell>
                            {parcela.status === 'PAGA' && ultimoPagamento ? (
                              formatDate(ultimoPagamento.payment_date)
                            ) : isParcial ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <span className="text-xs">Parcial</span>
                                    <Badge variant="outline" className="text-xs">
                                      {percentualPago}%
                                    </Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div>
                                    {parcela.recebimentos?.map((rec, idx) => (
                                      <p key={idx}>
                                        {rec.meio} R$ {rec.valor.toLocaleString('pt-BR')} ({formatDate(rec.payment_date)})
                                      </p>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSegundaVia(parcela.id)}
                                className="h-8 px-2 text-xs"
                              >
                                2ª via
                              </Button>
                              {parcela.status !== 'PAGA' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onReceber(parcela.id)}
                                  className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                                >
                                  Receber
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {hasMore && (
                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAbrirFinanceiroCompleto}
                    className="text-primary hover:text-primary/80"
                  >
                    Ver todas ({parcelasFiltradas.length} parcelas)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}