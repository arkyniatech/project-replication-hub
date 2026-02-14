import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarIcon, Filter, RotateCcw, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { toast } from "sonner";

export function FaturamentoFilters() {
  const { 
    filtros, 
    setFiltros, 
    salvarFiltrosPadrao, 
    recuperarFiltrosPadrao 
  } = useFaturamentoStore();
  
  const { lojaAtual, lojas } = useMultiunidade();
  
  // Garantir que sempre tenha uma loja válida selecionada
  const lojasValidas = lojas.filter(loja => loja.id);
  const unidadeIdValida = filtros.unidadeId || lojaAtual?.id || lojasValidas[0]?.id || 'loja1';
  
  const [localFiltros, setLocalFiltros] = useState({
    ...filtros,
    unidadeId: unidadeIdValida
  });

  const handleAplicar = () => {
    setFiltros(localFiltros);
    toast.success("Filtros aplicados com sucesso");
  };

  const handleSalvarPadrao = () => {
    salvarFiltrosPadrao(localFiltros);
    toast.success("Filtros salvos como padrão");
  };

  const handleRestaurarPadrao = () => {
    const padrao = recuperarFiltrosPadrao();
    if (padrao) {
      setLocalFiltros(padrao);
      toast.success("Filtros padrão restaurados");
    } else {
      toast.info("Nenhum filtro padrão salvo");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAplicar();
    }
  };

  return (
    <div className="space-y-4">
      {/* Linha 1: Filtros principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Unidade/Loja */}
        <div className="space-y-2">
          <Label htmlFor="filtro-unidade">Unidade</Label>
          <Select
            value={localFiltros.unidadeId || unidadeIdValida}
            onValueChange={(value) => setLocalFiltros(prev => ({ ...prev, unidadeId: value }))}
          >
            <SelectTrigger id="filtro-unidade">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {lojasValidas.map(loja => (
                <SelectItem key={loja.id} value={loja.id}>
                  {loja.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        <div className="space-y-2">
          <Label htmlFor="filtro-cliente">Cliente</Label>
          <Input
            id="filtro-cliente"
            placeholder="Nome ou documento..."
            value={localFiltros.clienteId || ""}
            onChange={(e) => setLocalFiltros(prev => ({ ...prev, clienteId: e.target.value || undefined }))}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Data Início */}
        <div className="space-y-2">
          <Label>Data Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localFiltros.dtIni && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFiltros.dtIni ? format(new Date(localFiltros.dtIni), "dd/MM/yyyy") : "Selecione..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localFiltros.dtIni ? new Date(localFiltros.dtIni) : undefined}
                onSelect={(date) => setLocalFiltros(prev => ({ 
                  ...prev, 
                  dtIni: date ? format(date, 'yyyy-MM-dd') : prev.dtIni 
                }))}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Data Fim */}
        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localFiltros.dtFim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFiltros.dtFim ? format(new Date(localFiltros.dtFim), "dd/MM/yyyy") : "Selecione..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localFiltros.dtFim ? new Date(localFiltros.dtFim) : undefined}
                onSelect={(date) => setLocalFiltros(prev => ({ 
                  ...prev, 
                  dtFim: date ? format(date, 'yyyy-MM-dd') : prev.dtFim 
                }))}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="filtro-status">Status</Label>
          <Select
            value={localFiltros.status || "TODOS"}
            onValueChange={(value) => setLocalFiltros(prev => ({ 
              ...prev, 
              status: value === "TODOS" ? undefined : value as any
            }))}
          >
            <SelectTrigger id="filtro-status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="A_FATURAR">A Faturar</SelectItem>
              <SelectItem value="JA_FATURADO">Já Faturado</SelectItem>
              <SelectItem value="DIVERGENTE">Divergente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Centro de Custo */}
        <div className="space-y-2">
          <Label htmlFor="filtro-cc">Centro de Custo</Label>
          <Select
            value={localFiltros.centroCusto || "TODOS"}
            onValueChange={(value) => setLocalFiltros(prev => ({ 
              ...prev, 
              centroCusto: value === "TODOS" ? undefined : value
            }))}
          >
            <SelectTrigger id="filtro-cc">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="OBRAS">Obras</SelectItem>
              <SelectItem value="VENDAS">Vendas</SelectItem>
              <SelectItem value="ADMIN">Administrativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 2: Ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleAplicar} size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Aplicar
          </Button>
          
          <Button onClick={handleSalvarPadrao} variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Salvar como padrão
          </Button>
          
          <Button onClick={handleRestaurarPadrao} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar padrão
          </Button>
        </div>

        {/* Badges de filtros ativos */}
        <div className="flex items-center gap-1">
          {localFiltros.status && (
            <Badge variant="secondary" className="text-xs">
              Status: {localFiltros.status.replace('_', ' ')}
            </Badge>
          )}
          {localFiltros.clienteId && (
            <Badge variant="secondary" className="text-xs">
              Cliente filtrado
            </Badge>
          )}
          {localFiltros.centroCusto && (
            <Badge variant="secondary" className="text-xs">
              CC: {localFiltros.centroCusto}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}