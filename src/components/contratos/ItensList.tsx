import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, ArrowLeftRight, RotateCcw } from "lucide-react";

interface Item {
  id: string;
  nome: string;
  patrimonioOuSerie: string;
  statusItem: 'ENTREGUE' | 'DEVOLVIDO' | 'EM_REVISAO';
  periodo: 'diário' | 'semanal' | 'mensal';
  valor: number;
}

interface ItensListProps {
  itens: Item[];
  onDevolver?: (itemIds: string[]) => void;
  onSubstituir: (itemId: string) => void;
  onRenovar?: (itemIds: string[]) => void;
}

export function ItensList({
  itens,
  onDevolver,
  onSubstituir,
  onRenovar
}: ItensListProps) {
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);

  const handleSelecaoChange = (itemId: string, selecionado: boolean) => {
    if (selecionado) {
      setItensSelecionados([...itensSelecionados, itemId]);
    } else {
      setItensSelecionados(itensSelecionados.filter(id => id !== itemId));
    }
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setItensSelecionados(itens.map(item => item.id));
    } else {
      setItensSelecionados([]);
    }
  };
  const getStatusItemBadge = (status: Item['statusItem']) => {
    const variants = {
      ENTREGUE: "bg-emerald-100 text-emerald-700",
      DEVOLVIDO: "bg-slate-100 text-slate-700",
      EM_REVISAO: "bg-yellow-100 text-yellow-700"
    };
    return variants[status];
  };

  const getPeriodoLabel = (periodo: Item['periodo']) => {
    const labels = {
      'diário': 'Diária',
      'semanal': 'Semanal', 
      'mensal': 'Mensal'
    };
    return labels[periodo];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Itens do Contrato</CardTitle>
          {(onRenovar || onDevolver) && (
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={itensSelecionados.length === itens.length}
                  onCheckedChange={handleSelecionarTodos}
                />
                <label htmlFor="select-all" className="text-sm">Selecionar todos</label>
              </div>
              {onRenovar && (
                <Button 
                  onClick={() => onRenovar(itensSelecionados)}
                  disabled={itensSelecionados.length === 0}
                  size="sm"
                >
                  🔄 Renovar Selecionados
                </Button>
              )}
              {onDevolver && (
                <Button 
                  onClick={() => onDevolver(itensSelecionados)}
                  disabled={itensSelecionados.length === 0}
                  size="sm"
                  variant="outline"
                >
                  📦 Devolver Selecionados
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {itens.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start gap-4 flex-1">
                {(onRenovar || onDevolver) && (
                  <Checkbox
                    checked={itensSelecionados.includes(item.id)}
                    onCheckedChange={(checked) => handleSelecaoChange(item.id, !!checked)}
                  />
                )}
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{item.nome}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.patrimonioOuSerie}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                     <Badge className={getStatusItemBadge(item.statusItem)}>
                       {item.statusItem === 'ENTREGUE' ? 'Entregue' :
                        item.statusItem === 'DEVOLVIDO' ? 'Devolvido' :
                        item.statusItem === 'EM_REVISAO' ? 'Em Revisão' : item.statusItem}
                     </Badge>
                    
                    <span className="text-muted-foreground">
                      {getPeriodoLabel(item.periodo)}
                    </span>
                    
                    <span className="font-medium">
                      R$ {item.valor.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSubstituir(item.id)}
                  className="gap-2"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Substituir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}