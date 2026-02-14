import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ExternalLink, MessageSquare } from "lucide-react";
import { useState } from "react";

interface Contrato {
  id: string;
  numero: string;
  periodo: { inicio: string; fim: string };
  valorTotal: number;
  situacao: 'ATIVO' | 'ENCERRADO';
  itensQtde: number;
  atraso?: number;
  temAtraso?: boolean;
}

interface ContratosBlockProps {
  contratos: Contrato[];
  onAbrirContrato: (id: string) => void;
  onPDFContrato: (id: string) => void;
  onWhatsAppContrato: (id: string) => void;
}

type FilterType = 'TODOS' | 'ATIVOS' | 'ENCERRADOS';

export function ContratosBlock({
  contratos,
  onAbrirContrato,
  onPDFContrato,
  onWhatsAppContrato
}: ContratosBlockProps) {
  const [filter, setFilter] = useState<FilterType>('ATIVOS');

  const contratosFiltrados = contratos.filter(contrato => {
    if (filter === 'TODOS') return true;
    return contrato.situacao === filter.replace('S', '');
  });

  const contratosVisiveis = contratosFiltrados.slice(0, 5);
  const hasMore = contratosFiltrados.length > 5;

  const getSituacaoBadge = (situacao: string) => {
    const variants = {
      ATIVO: "bg-emerald-100 text-emerald-700",
      ENCERRADO: "bg-slate-100 text-slate-700"
    };
    return variants[situacao as keyof typeof variants];
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contratos ({contratosFiltrados.length})
          </CardTitle>
          
          {hasMore && (
            <Button variant="ghost" size="sm" className="text-xs">
              Ver todos
            </Button>
          )}
        </div>
        
        {/* Filtros rápidos */}
        <div className="flex items-center gap-1 mt-3">
          {(['TODOS', 'ATIVOS', 'ENCERRADOS'] as FilterType[]).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {filterType === 'TODOS' ? 'Todos' : 
               filterType === 'ATIVOS' ? 'Ativos' : 'Encerrados'}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {contratosVisiveis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum contrato encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Contrato</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratosVisiveis.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell className="font-medium">
                      {contrato.numero}
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {formatDate(contrato.periodo.inicio)} –<br />
                      {formatDate(contrato.periodo.fim)}
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {formatCurrency(contrato.valorTotal)}
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getSituacaoBadge(contrato.situacao)}>
                        {contrato.situacao}
                      </Badge>
                      {contrato.temAtraso && (
                        <Badge className="bg-rose-100 text-rose-700 ml-1 text-xs">
                          Tem cobrança em atraso
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {contrato.itensQtde}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {contrato.atraso && contrato.atraso > 0 ? (
                        <Badge className="bg-rose-100 text-rose-700">
                          {contrato.atraso} dias
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAbrirContrato(contrato.id)}
                          className="h-8 px-2 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPDFContrato(contrato.id)}
                          className="h-8 px-2 text-xs"
                        >
                          PDF
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWhatsAppContrato(contrato.id)}
                          className="h-8 px-2 text-xs text-green-600 hover:text-green-700"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}