import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, Search, Filter } from "lucide-react";
import { useEquipamentosStore } from "@/stores/equipamentosStore";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";

interface HistoricoPrecosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modeloId: string;
}

export function HistoricoPrecos({ open, onOpenChange, modeloId }: HistoricoPrecosProps) {
  const { modelos, historicoPrecos = [] } = useEquipamentosStore();
  const { lojas } = useEquipamentosStore();
  const { toast } = useToast();

  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [searchText, setSearchText] = useState("");

  const modelo = modelos.find(m => m.id === modeloId);
  const systemLojas = lojas;

  const historicoFiltrado = useMemo(() => {
    if (!modeloId) return [];

    let historico = historicoPrecos.filter(h => h.modeloId === modeloId);

    if (filtroLoja) {
      historico = historico.filter(h => h.lojaId === filtroLoja);
    }

    if (filtroPeriodo) {
      historico = historico.filter(h => h.periodo === filtroPeriodo);
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      historico = historico.filter(h => 
        h.descricao?.toLowerCase().includes(searchLower) ||
        h.usuario.toLowerCase().includes(searchLower)
      );
    }

    return historico.sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
  }, [modeloId, historicoPrecos, filtroLoja, filtroPeriodo, searchText]);

  const handleExportCSV = () => {
    const headers = ["Data", "Loja", "Período", "Valor Anterior", "Valor Novo", "Usuário", "Descrição"];
    const rows = historicoFiltrado.map(h => [
      format(new Date(h.dataISO), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      systemLojas.find(l => l.id === h.lojaId)?.nome || h.lojaId,
      h.periodo,
      h.valorAnterior?.toFixed(2) || "-",
      h.valorNovo?.toFixed(2) || "-",
      h.usuario,
      h.descricao || "-"
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-precos-${modelo?.nomeComercial || modeloId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
    toast({
      title: "Export realizado",
      description: "Histórico de preços exportado em CSV.",
    });
  };

  const getLojaName = (lojaId: string) => {
    return systemLojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getPeriodoLabel = (periodo: string) => {
    const labels: Record<string, string> = {
      'DIARIA': 'Diária',
      'SEMANA': '7 dias',
      'QUINZENA': '14 dias',
      'D21': '21 dias',
      'MES': '28 dias',
    };
    return labels[periodo] || periodo;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Preços
          </DrawerTitle>
          <DrawerDescription>
            {modelo ? `Alterações de preço para ${modelo.nomeComercial}` : "Histórico de alterações"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por descrição ou usuário..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="min-w-40">
                  <label className="text-sm font-medium mb-2 block">Loja</label>
                  <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as lojas</SelectItem>
                      {systemLojas.map(loja => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-32">
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="DIARIA">Diária</SelectItem>
                      <SelectItem value="SEMANA">7 dias</SelectItem>
                      <SelectItem value="QUINZENA">14 dias</SelectItem>
                      <SelectItem value="D21">21 dias</SelectItem>
                      <SelectItem value="MES">28 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={historicoFiltrado.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <div className="space-y-3">
            {historicoFiltrado.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>Nenhum registro de alteração encontrado</p>
                  <p className="text-sm mt-1">
                    Alterações de preço aparecerão aqui automaticamente
                  </p>
                </CardContent>
              </Card>
            ) : (
              historicoFiltrado.map((item) => (
                <Card key={item.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {getLojaName(item.lojaId || "")}
                          </Badge>
                          <Badge variant="secondary">
                            {getPeriodoLabel(item.periodo || "")}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            por {item.usuario}
                          </span>
                        </div>
                        
                        {item.valorAnterior !== undefined && item.valorNovo !== undefined && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">De:</span>
                            <span className="font-medium text-red-600">
                              R$ {item.valorAnterior.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-green-600">
                              R$ {item.valorNovo.toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        {item.descricao && (
                          <p className="text-sm text-muted-foreground">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-muted-foreground">
                        {format(new Date(item.dataISO), "dd/MM/yyyy", { locale: ptBR })}
                        <br />
                        {format(new Date(item.dataISO), "HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary */}
          {historicoFiltrado.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                {historicoFiltrado.length} registro(s) encontrado(s)
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}