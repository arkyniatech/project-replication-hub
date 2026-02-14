import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { LayoutOptions } from "@/types";

interface ItineraryLayoutOptionsProps {
  options: LayoutOptions;
  onChange: (options: LayoutOptions) => void;
}

export function ItineraryLayoutOptions({ options, onChange }: ItineraryLayoutOptionsProps) {
  const updateOptions = (updates: Partial<LayoutOptions>) => {
    onChange({ ...options, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm mb-3">Opções de Layout</h4>
        
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Modo de Exibição</Label>
            <Select
              value={options.modo}
              onValueChange={(value: 'DETALHADO' | 'COMPACTO') => 
                updateOptions({ modo: value })
              }
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DETALHADO">Detalhado</SelectItem>
                <SelectItem value="COMPACTO">Compacto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Ordenação</Label>
            <Select
              value={options.ordenacao}
              onValueChange={(value: 'HORA' | 'TIPO_HORA') => 
                updateOptions({ ordenacao: value })
              }
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HORA">Hora Crescente</SelectItem>
                <SelectItem value="TIPO_HORA">Tipo → Hora</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">Campos a Exibir</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Telefone do Cliente</Label>
            <Switch
              checked={options.mostrarTelefone}
              onCheckedChange={(checked) => updateOptions({ mostrarTelefone: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Observações</Label>
            <Switch
              checked={options.mostrarObservacoes}
              onCheckedChange={(checked) => updateOptions({ mostrarObservacoes: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Duração</Label>
            <Switch
              checked={options.mostrarDuracao}
              onCheckedChange={(checked) => updateOptions({ mostrarDuracao: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Prioridade</Label>
            <Switch
              checked={options.mostrarPrioridade}
              onCheckedChange={(checked) => updateOptions({ mostrarPrioridade: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">Configurações de Página</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Quebrar por Tipo</Label>
            <Switch
              checked={options.quebrarPorTipo}
              onCheckedChange={(checked) => updateOptions({ quebrarPorTipo: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Cabeçalho em Todas Páginas</Label>
            <Switch
              checked={options.cabecalhoEmTodas}
              onCheckedChange={(checked) => updateOptions({ cabecalhoEmTodas: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Marca d'água</Label>
            <Switch
              checked={options.marcaDagua}
              onCheckedChange={(checked) => updateOptions({ marcaDagua: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}