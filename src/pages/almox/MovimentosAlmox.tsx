import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useAlmoxStore } from "@/modules/almox/store/almoxStore";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
// import { DateRangePicker } from "@/components/ui/date-range-picker";

export default function MovimentosAlmox() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { movimentos, catalogoItens } = useAlmoxStore();
  const { lojaAtual } = useMultiunidade();

  // Filtrar movimentos baseado nos filtros
  const filteredMovimentos = movimentos.filter(movimento => {
    if (movimento.lojaId !== lojaAtual?.id) return false;
    if (tipoFilter !== "all" && movimento.tipo !== tipoFilter) return false;
    
    const item = catalogoItens.find(i => i.id === movimento.itemId);
    if (!item) return false;
    
    if (itemFilter && !item.sku.toLowerCase().includes(itemFilter.toLowerCase()) && 
        !item.descricao.toLowerCase().includes(itemFilter.toLowerCase())) {
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.sku.toLowerCase().includes(searchLower) ||
      item.descricao.toLowerCase().includes(searchLower) ||
      movimento.referencia?.toLowerCase().includes(searchLower) ||
      '';

    // Filtro por data
    if (dateRange?.from && dateRange?.to) {
      const movDate = new Date(movimento.createdAt);
      if (movDate < dateRange.from || movDate > dateRange.to) return false;
    }
    
    return matchesSearch;
  });

  const getMovimentoIcon = (tipo: string) => {
    const isEntrada = ['ENTRADA_PO', 'AJUSTE_POSITIVO', 'DEVOLUCAO_FORNECEDOR'].includes(tipo);
    return isEntrada ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getMovimentoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'ENTRADA_PO': 'Entrada PO',
      'AJUSTE_POSITIVO': 'Ajuste +',
      'AJUSTE_NEGATIVO': 'Ajuste -',
      'CONSUMO': 'Consumo',
      'TRANSFERENCIA_SAIDA': 'Transfer. Saída',
      'TRANSFERENCIA_ENTRADA': 'Transfer. Entrada',
      'BAIXA_PATRIMONIAL': 'Baixa Patrim.',
      'DEVOLUCAO_FORNECEDOR': 'Dev. Fornecedor'
    };
    return labels[tipo] || tipo;
  };

  const getMovimentoVariant = (tipo: string) => {
    const isEntrada = ['ENTRADA_PO', 'AJUSTE_POSITIVO', 'DEVOLUCAO_FORNECEDOR', 'TRANSFERENCIA_ENTRADA'].includes(tipo);
    return isEntrada ? 'default' : 'secondary';
  };

  const tiposMovimento = [
    'ENTRADA_PO',
    'AJUSTE_POSITIVO', 
    'AJUSTE_NEGATIVO',
    'CONSUMO',
    'TRANSFERENCIA_SAIDA',
    'TRANSFERENCIA_ENTRADA',
    'BAIXA_PATRIMONIAL',
    'DEVOLUCAO_FORNECEDOR'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movimentações</h1>
        <p className="text-muted-foreground">
          Histórico de movimentações de estoque
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="SKU, descrição, referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposMovimento.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {getMovimentoLabel(tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Item</label>
              <Input
                placeholder="Filtrar por item..."
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Período</label>
              <Input
                type="date"
                placeholder="Data inicial"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Extrato PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovimentos.map((movimento) => {
                const item = catalogoItens.find(i => i.id === movimento.itemId);
                if (!item) return null;
                
                return (
                  <TableRow key={movimento.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(movimento.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(movimento.createdAt), 'HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMovimentoVariant(movimento.tipo)} className="gap-1">
                        {getMovimentoIcon(movimento.tipo)}
                        {getMovimentoLabel(movimento.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{item.sku}</div>
                        <div className="text-sm text-muted-foreground">{item.descricao}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      <span className={
                        ['ENTRADA_PO', 'AJUSTE_POSITIVO', 'DEVOLUCAO_FORNECEDOR', 'TRANSFERENCIA_ENTRADA'].includes(movimento.tipo)
                          ? 'text-green-600' : 'text-red-600'
                      }>
                        {['ENTRADA_PO', 'AJUSTE_POSITIVO', 'DEVOLUCAO_FORNECEDOR', 'TRANSFERENCIA_ENTRADA'].includes(movimento.tipo) ? '+' : '-'}
                        {Math.abs(movimento.quantidade)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {movimento.custoUnitario ? (
                        `R$ ${movimento.custoUnitario.toFixed(2)}`
                      ) : '--'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {movimento.custoUnitario ? (
                        `R$ ${(movimento.custoUnitario * Math.abs(movimento.quantidade)).toFixed(2)}`
                      ) : '--'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {movimento.referencia && (
                          <Button variant="link" size="sm" className="h-auto p-0">
                            {movimento.referencia}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {movimento.createdBy || 'Sistema'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMovimentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}