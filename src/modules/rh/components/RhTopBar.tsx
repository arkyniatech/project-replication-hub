import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Calendar, Building, Target } from 'lucide-react';
import { useRhModule } from '../providers/RhModuleProvider';

export function RhTopBar() {
  const { scope, updateScope, devProfile } = useRhModule();

  return (
    <div className="bg-card border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Recursos Humanos (RH)
            </h1>
            <Badge variant="outline" className="text-xs">
              {devProfile}
            </Badge>
          </div>
          
          {/* Filtros visuais globais */}
          <div className="flex items-center gap-4">
            {/* Filtro de Unidade */}
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <Select
                value={scope.unidadeAtiva || "CONSOLIDADO"}
                onValueChange={(value) => 
                  updateScope({ unidadeAtiva: value === "CONSOLIDADO" ? undefined : value })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSOLIDADO">Consolidado</SelectItem>
                  <SelectItem value="unidade-1">Matriz</SelectItem>
                  <SelectItem value="unidade-2">Filial SP</SelectItem>
                  <SelectItem value="unidade-3">Filial RJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Centro de Custo */}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Select
                value={scope.ccAtivo || "TODOS_CC"}
                onValueChange={(value) => 
                  updateScope({ ccAtivo: value === "TODOS_CC" ? undefined : value })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Centro de Custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS_CC">Todos</SelectItem>
                  <SelectItem value="cc-1">Administrativo</SelectItem>
                  <SelectItem value="cc-2">Comercial</SelectItem>
                  <SelectItem value="cc-3">Operacional</SelectItem>
                  <SelectItem value="cc-4">TI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Período */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Button variant="outline" size="sm" className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
                {new Date(scope.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(scope.periodo.fim).toLocaleDateString('pt-BR')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}