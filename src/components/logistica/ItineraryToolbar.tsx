import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Printer, FileDown, Download, Settings } from "lucide-react";
import { ItineraryLayoutOptions } from "./ItineraryLayoutOptions";
import type { TarefaLogistica, LayoutOptions } from "@/types";

interface ItineraryToolbarProps {
  tarefas: TarefaLogistica[];
  selectedDate: string;
  selectedLoja?: string;
  selectedMotorista?: string;
  selectedVeiculo?: string;
  layoutOptions: LayoutOptions;
  onLayoutChange: (options: LayoutOptions) => void;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
}

export function ItineraryToolbar({
  tarefas,
  selectedDate,
  selectedLoja = "Loja Principal",
  selectedMotorista,
  selectedVeiculo,
  layoutOptions,
  onLayoutChange,
  onPrint,
  onExportPDF,
  onExportCSV
}: ItineraryToolbarProps) {
  // Filtrar apenas tarefas válidas para impressão
  const tarefasValidas = tarefas.filter(t => 
    ['PROGRAMADO', 'EM_ROTA', 'REAGENDADO'].includes(t.status)
  );

  const totalTarefas = tarefasValidas.length;
  const entregas = tarefasValidas.filter(t => t.tipo === 'ENTREGA').length;
  const retiradas = tarefasValidas.filter(t => t.tipo === 'RETIRADA').length;
  const suportes = tarefasValidas.filter(t => t.tipo === 'SUPORTE').length;

  return (
    <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{totalTarefas}</span> tarefas •{" "}
          <span className="text-green-600">{entregas} entregas</span> •{" "}
          <span className="text-blue-600">{retiradas} retiradas</span> •{" "}
          <span className="text-orange-600">{suportes} suportes</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrint}
          className="flex items-center gap-2"
          disabled={totalTarefas === 0}
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          className="flex items-center gap-2"
          disabled={totalTarefas === 0}
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          className="flex items-center gap-2"
          disabled={totalTarefas === 0}
        >
          <Download className="h-4 w-4" />
          CSV
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Layout
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <ItineraryLayoutOptions
              options={layoutOptions}
              onChange={onLayoutChange}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}