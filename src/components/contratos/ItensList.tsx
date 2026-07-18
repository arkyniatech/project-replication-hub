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

  // Itens devolvidos ficam em seção separada (#41)
  const itensDevolvidos = itens.filter(i => i.statusItem === 'DEVOLVIDO');
  const itensAtivos = itens.filter(i => i.statusItem !== 'DEVOLVIDO');

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
          {itensAtivos.map((item) => (
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

          {itensAtivos.length === 0 && itensDevolvidos.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Todos os equipamentos deste contrato foram devolvidos.
            </p>
          )}

          {/* Seção de equipamentos devolvidos (#41) */}
          {itensDevolvidos.length > 0 && (
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                📦 Equipamentos Devolvidos ({itensDevolvidos.length})
              </h4>
              <div className="space-y-2">
                {itensDevolvidos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/40 opacity-80"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.patrimonioOuSerie}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">R$ {item.valor.toLocaleString('pt-BR')}</span>
                      <Badge className={getStatusItemBadge('DEVOLVIDO')}>Devolvido</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}