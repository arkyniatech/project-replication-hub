import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreditCard, FileText, FileDown } from "lucide-react";
import { useState } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Titulo {
  id: string;
  codigo: string;
  issue_dateISO: string;
  due_dateISO: string;
  valor: number;
  status: 'ABERTO' | 'ATRASADO' | 'PAGO' | 'CANCELADO';
  pagos?: Array<{
    valor: number;
    dateISO: string;
    meio: string;
  }>;
  linkPDF?: string;
}

interface FinanceiroBlockProps {
  titulos: Titulo[];
  kpis: {
    abertos: number;
    emAtraso: number;
    pagos30d: number;
    total12m: number;
  };
  onSegundaVia: (id: string) => void;
  onReceber: (id: string) => void;
}

type FilterType = 'TODAS' | 'EM_ABERTO' | 'ABERTAS' | 'ATRASADAS' | 'PAGAS';

export function FinanceiroBlock({
  titulos,
  kpis,
  onSegundaVia,
  onReceber
}: FinanceiroBlockProps) {
  const [filter, setFilter] = useState<FilterType>('EM_ABERTO');

  const titulosFiltrados = titulos.filter(titulo => {
    switch (filter) {
      case 'EM_ABERTO':
        return titulo.status === 'ABERTO' || titulo.status === 'ATRASADO';
      case 'ABERTAS':
        return titulo.status === 'ABERTO';
      case 'ATRASADAS':
        return titulo.status === 'ATRASADO';
      case 'PAGAS':
        return titulo.status === 'PAGO';
      default:
        return true;
    }
  });

  // Ordenação inteligente: quando filtro for "EM ABERTO", mostrar ATRASADOS primeiro
  const titulosOrdenados = filter === 'EM_ABERTO' 
    ? [...titulosFiltrados].sort((a, b) => {
        if (a.status === 'ATRASADO' && b.status === 'ABERTO') return -1;
        if (a.status === 'ABERTO' && b.status === 'ATRASADO') return 1;
        return new Date(a.due_dateISO).getTime() - new Date(b.due_dateISO).getTime();
      })
    : titulosFiltrados;

  const titulosVisiveis = titulosOrdenados.slice(0, 6);
  const hasMore = titulosOrdenados.length > 6;

  const getStatusBadge = (status: string) => {
    const variants = {
      ABERTO: "bg-slate-100 text-slate-700",
      ATRASADO: "bg-rose-100 text-rose-700",
      PAGO: "bg-emerald-100 text-emerald-700",
      CANCELADO: "bg-zinc-100 text-zinc-700"
    };
    return variants[status as keyof typeof variants];
  };

  const formatDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const getValorPago = (titulo: Titulo) => {
    if (!titulo.pagos || titulo.pagos.length === 0) return 0;
    return titulo.pagos.reduce((total, pago) => total + pago.valor, 0);
  };

  const getPercentualPago = (titulo: Titulo) => {
    const valorPago = getValorPago(titulo);
    return Math.round((valorPago / titulo.valor) * 100);
  };

  const getUltimoPagamento = (titulo: Titulo) => {
    if (!titulo.pagos || titulo.pagos.length === 0) return null;
    return titulo.pagos[titulo.pagos.length - 1];
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho do PDF
    doc.setFontSize(16);
    doc.text('Títulos Financeiros - Cliente', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Filtro aplicado: ${filter === 'TODAS' ? 'Todas' : 
      filter === 'EM_ABERTO' ? 'Em Aberto' :
      filter === 'ABERTAS' ? 'Abertas' :
      filter === 'ATRASADAS' ? 'Atrasadas' : 'Pagas'}`, 14, 22);
    doc.text(`Total de registros: ${titulosOrdenados.length}`, 14, 28);
    doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, 14, 34);
    
    // Preparar dados da tabela
    const tableData = titulosOrdenados.map(titulo => {
      const valorPago = getValorPago(titulo);
      const saldo = titulo.valor - valorPago;
      
      return [
        titulo.codigo,
        formatDate(titulo.issue_dateISO),
        formatDate(titulo.due_dateISO),
        formatCurrency(titulo.valor),
        titulo.status,
        valorPago > 0 ? formatCurrency(valorPago) : '—',
        saldo > 0 ? formatCurrency(saldo) : '—'
      ];
    });
    
    // Gerar tabela
    autoTable(doc, {
      startY: 40,
      head: [['Código', 'Emissão', 'Vencimento', 'Valor', 'Status', 'Pago', 'Saldo']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255 }, // Laranja primário
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        3: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      }
    });
    
    // Adicionar resumo no final
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(10);
    doc.text('Resumo:', 14, finalY + 10);
    doc.setFontSize(9);
    doc.text(`Abertos: ${kpis.abertos}`, 14, finalY + 16);
    doc.text(`Em Atraso: ${kpis.emAtraso}`, 14, finalY + 22);
    doc.text(`Pagos (30d): ${kpis.pagos30d}`, 14, finalY + 28);
    doc.text(`Total 12m: ${formatCurrency(kpis.total12m)}`, 14, finalY + 34);
    
    // Salvar PDF
    const fileName = `titulos-cliente-${filter.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Títulos Recentes
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
          </CardTitle>
          
          {/* Chips-resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-lg font-semibold text-slate-700">
                {kpis.abertos}
              </div>
              <div className="text-xs text-slate-600">Abertos</div>
            </div>
            
            <div className="text-center p-3 bg-rose-50 rounded-lg">
              <div className="text-lg font-semibold text-rose-700">
                {kpis.emAtraso}
              </div>
              <div className="text-xs text-rose-600">Em atraso</div>
            </div>
            
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-lg font-semibold text-emerald-700">
                {kpis.pagos30d}
              </div>
              <div className="text-xs text-emerald-600">Pagos (30d)</div>
            </div>
            
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-lg font-semibold text-primary">
                {formatCurrency(kpis.total12m)}
              </div>
              <div className="text-xs text-primary/70">Total 12m</div>
            </div>
          </div>
          
          {/* Filtros rápidos */}
          <div className="flex items-center gap-1 mt-3">
            {(['TODAS', 'EM_ABERTO', 'ABERTAS', 'ATRASADAS', 'PAGAS'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === filterType
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {filterType === 'TODAS' ? 'Todas' : 
                 filterType === 'EM_ABERTO' ? 'Em Aberto' :
                 filterType === 'ABERTAS' ? 'Abertas' :
                 filterType === 'ATRASADAS' ? 'Atrasadas' : 'Pagas'}
              </button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          {titulosVisiveis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum título encontrado.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {titulosVisiveis.map((titulo) => {
                      const valorPago = getValorPago(titulo);
                      const percentualPago = getPercentualPago(titulo);
                      const isParcial = valorPago > 0 && titulo.status !== 'PAGO';
                      const ultimoPagamento = getUltimoPagamento(titulo);

                      return (
                        <TableRow key={titulo.id}>
                          <TableCell className="font-medium">
                            {titulo.codigo}
                          </TableCell>
                          
                          <TableCell>
                            {formatDate(titulo.issue_dateISO)}
                          </TableCell>
                          
                          <TableCell>
                            {formatDate(titulo.due_dateISO)}
                          </TableCell>
                          
                          <TableCell className="text-right font-medium">
                            {formatCurrency(titulo.valor)}
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={getStatusBadge(titulo.status)}>
                              {titulo.status}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            {titulo.status === 'PAGO' && ultimoPagamento ? (
                              formatDate(ultimoPagamento.dateISO)
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
                                    {titulo.pagos?.map((pago, idx) => (
                                      <p key={idx}>
                                        {pago.meio} {formatCurrency(pago.valor)} ({formatDate(pago.dateISO)})
                                      </p>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSegundaVia(titulo.id)}
                                className="h-8 px-2 text-xs"
                              >
                                2ª via
                              </Button>
                              
                              {titulo.status !== 'PAGO' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onReceber(titulo.id)}
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
                <div className="text-center pt-3">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todos ({titulosOrdenados.length} títulos)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}