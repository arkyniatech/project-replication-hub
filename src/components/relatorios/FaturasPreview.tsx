import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { FileText, AlertCircle, Loader2 } from "lucide-react";

interface Fatura {
  id: string;
  numero: string;
  emissao: string;
  tipo: string;
  forma_preferida: string;
  total: number;
  clientes?: {
    nome?: string;
    razao_social?: string;
  };
  contratos?: {
    numero: string;
  };
}

interface FaturasPreviewProps {
  faturas: Fatura[];
  totalFaturas: number;
  totalValor: number;
  isLoading: boolean;
  onGeneratePDF: () => void;
  onGenerateExcel: () => void;
  isGeneratingPDF?: boolean;
  isGeneratingExcel?: boolean;
}

export function FaturasPreview({
  faturas,
  totalFaturas,
  totalValor,
  isLoading,
  onGeneratePDF,
  onGenerateExcel,
  isGeneratingPDF = false,
  isGeneratingExcel = false,
}: FaturasPreviewProps) {
  // Estado inicial: aguardando primeira carga
  if (!faturas) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Carregando faturas...</h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto buscamos os dados iniciais
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Buscando faturas...</h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto carregamos os dados
          </p>
        </div>
      </div>
    );
  }

  if (faturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h3 className="font-semibold text-lg mb-2">Nenhuma fatura encontrada</h3>
        <p className="text-sm text-center">
          Nenhuma fatura foi encontrada no período selecionado.
          <br />
          Ajuste os filtros e tente novamente.
        </p>
      </div>
    );
  }

  const preview = faturas.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Badge com total */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-sm">
          <FileText className="mr-2 h-4 w-4" />
          Exibindo {preview.length} de {totalFaturas} faturas
        </Badge>
        <Badge variant="outline" className="text-sm font-semibold">
          Total: R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Badge>
      </div>

      {/* Tabela de Preview */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Fatura</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((fatura) => (
              <TableRow key={fatura.id}>
                <TableCell className="font-medium">{fatura.numero}</TableCell>
                <TableCell>
                  {format(new Date(fatura.emissao), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  {fatura.clientes?.nome || fatura.clientes?.razao_social || '-'}
                </TableCell>
                <TableCell>{fatura.contratos?.numero || '-'}</TableCell>
                <TableCell>
                  <Badge variant={fatura.tipo === 'FISCAL_MOCK' ? 'default' : 'secondary'}>
                    {fatura.tipo === 'FISCAL_MOCK' ? 'Fiscal' : 'Demo'}
                  </Badge>
                </TableCell>
                <TableCell>{fatura.forma_preferida}</TableCell>
                <TableCell className="text-right font-medium">
                  R$ {fatura.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Rodapé com resumo */}
      <div className="text-sm text-muted-foreground text-center">
        {totalFaturas > 5 && (
          <p>
            + {totalFaturas - 5} faturas adicionais serão incluídas na exportação completa
          </p>
        )}
      </div>

      {/* Botões de Exportação */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onGeneratePDF}
          disabled={!faturas || faturas.length === 0 || isGeneratingPDF || isGeneratingExcel}
          className="transition-all duration-200 hover:scale-105"
        >
          {isGeneratingPDF ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Gerar PDF
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onGenerateExcel}
          disabled={!faturas || faturas.length === 0 || isGeneratingPDF || isGeneratingExcel}
          className="transition-all duration-200 hover:scale-105"
        >
          {isGeneratingExcel ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Gerando Excel...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Gerar Excel
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
