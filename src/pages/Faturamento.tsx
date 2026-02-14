import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FaturamentoFilters } from "@/components/faturamento/FaturamentoFilters";
import { FaturamentoGrid } from "@/components/faturamento/FaturamentoGrid";
import { FaturamentoCarrinho } from "@/components/faturamento/FaturamentoCarrinho";
import { FaturamentoKPIs } from "@/components/faturamento/FaturamentoKPIs";
import { FaturamentoExceptions } from "@/components/faturamento/FaturamentoExceptions";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

export default function Faturamento() {
  const { clearExceptions } = useFaturamentoStore();

  // Clear exceptions on mount
  useEffect(() => {
    clearExceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcut("/", () => {
    const searchInput = document.getElementById("filtro-cliente");
    searchInput?.focus();
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header fixo */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Faturamento</h1>
            <span className="text-sm text-muted-foreground">
              Consolidação de cobrança mensal
            </span>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="border-t px-6 py-4">
          <FaturamentoFilters />
        </div>
        
        {/* KPIs */}
        <div className="border-t px-6 py-3">
          <FaturamentoKPIs />
        </div>
      </div>

      {/* Exceptions */}
      <FaturamentoExceptions />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid Principal */}
        <div className="flex-1 overflow-auto">
          <FaturamentoGrid />
        </div>
        
        {/* Separador */}
        <Separator orientation="vertical" className="mx-0" />
        
        {/* Carrinho/Resumo Lateral */}
        <div className="w-80 border-l bg-muted/20">
          <FaturamentoCarrinho />
        </div>
      </div>
    </div>
  );
}