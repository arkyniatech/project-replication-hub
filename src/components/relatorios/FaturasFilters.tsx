import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Search, Filter, CheckCircle2 } from "lucide-react";

interface FaturasFiltersProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  lojaId?: string;
  onLojaChange: (lojaId: string) => void;
  clienteId?: string;
  onClienteChange: (clienteId: string) => void;
  tipo?: string;
  onTipoChange: (tipo: string) => void;
  formaPagamento?: string;
  onFormaPagamentoChange: (forma: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isApplying?: boolean; // ✅ NOVO - estado de loading
}

export function FaturasFilters({
  dateRange,
  onDateRangeChange,
  lojaId,
  onLojaChange,
  clienteId,
  onClienteChange,
  tipo,
  onTipoChange,
  formaPagamento,
  onFormaPagamentoChange,
  onApplyFilters,
  onClearFilters,
  isApplying = false, // ✅ NOVO com default
}: FaturasFiltersProps) {
  const { lojasPermitidas, lojaAtual } = useMultiunidade();
  const lojaAtivaId = lojaAtual?.id || lojasPermitidas[0]?.id;
  const { clientes } = useSupabaseClientes(lojaId || lojaAtivaId);

  return (
    <div className="space-y-4">
      {/* Badge de Status dos Filtros */}
      <div className="flex items-center gap-2">
        {!dateRange && (!clienteId || clienteId === 'todos') && 
         (!tipo || tipo === 'todos') && (!formaPagamento || formaPagamento === 'todas') ? (
          <Badge variant="outline" className="text-muted-foreground">
            <Filter className="mr-1 h-3 w-3" />
            Nenhum filtro aplicado
          </Badge>
        ) : (
          <Badge variant="default" className="bg-primary">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Filtros configurados - Clique em "Aplicar Filtros"
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Período de Emissão */}
        <div className="space-y-2 w-full">
          <Label>Período de Emissão</Label>
          <DatePickerWithRange
            date={dateRange}
            onDateChange={onDateRangeChange}
            className="w-full"
          />
        </div>

        {/* Unidade/Loja */}
        {lojasPermitidas.length > 1 && (
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={lojaId || lojaAtivaId} onValueChange={onLojaChange}>
              <SelectTrigger className={lojaId && lojaId !== 'todas' ? 'border-primary' : ''}>
                <SelectValue placeholder="Selecione uma unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {lojasPermitidas.map((loja) => (
                  <SelectItem key={loja.id} value={loja.id}>
                    {loja.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Cliente */}
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={clienteId || "todos"} onValueChange={onClienteChange}>
            <SelectTrigger className={clienteId && clienteId !== 'todos' ? 'border-primary' : ''}>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome || cliente.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label>Tipo de Fatura</Label>
          <Select value={tipo || "todos"} onValueChange={onTipoChange}>
            <SelectTrigger className={tipo && tipo !== 'todos' ? 'border-primary' : ''}>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="FISCAL_MOCK">Fiscal Mock</SelectItem>
              <SelectItem value="DEMONSTRATIVO">Demonstrativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Forma de Pagamento */}
        <div className="space-y-2">
          <Label>Forma de Pagamento</Label>
          <Select
            value={formaPagamento || "todas"}
            onValueChange={onFormaPagamentoChange}
          >
            <SelectTrigger className={formaPagamento && formaPagamento !== 'todas' ? 'border-primary' : ''}>
              <SelectValue placeholder="Selecione a forma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as formas</SelectItem>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="BOLETO">Boleto</SelectItem>
              <SelectItem value="CARTAO">Cartão</SelectItem>
              <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
              <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClearFilters} disabled={isApplying}>
          Limpar Filtros
        </Button>
        <Button 
          onClick={onApplyFilters} 
          disabled={isApplying}
          className="transition-all duration-200 hover:scale-105"
        >
          {isApplying ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Buscando faturas...
            </>
          ) : (
            <>
              <Filter className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
