import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertTriangle, FileText, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { useAlmoxStore } from "@/modules/almox/store/almoxStore";
import { useRbac } from "@/hooks/useRbac";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EstoqueUnificado() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [controleFilter, setControleFilter] = useState<string>("all");
  const [grupoFilter, setGrupoFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("saldos");
  const [itemFilter, setItemFilter] = useState("");
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [ajusteForm, setAjusteForm] = useState({
    novoSaldo: "",
    justificativa: "",
    tipo: "AJUSTE_POSITIVO" as "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO"
  });

  const { catalogoItens, estoque, movimentos, ajustarSaldo } = useAlmoxStore();
  const { can } = useRbac();
  const { lojaAtual } = useMultiunidade();

  // Filtrar itens baseado nos filtros
  const filteredItens = catalogoItens.filter(item => {
    if (tipoFilter !== "all" && item.tipo !== tipoFilter) return false;
    if (controleFilter !== "all" && item.controle !== controleFilter) return false;
    if (!can('almox:patrimonial') && item.tipo === 'PATRIMONIAL') return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.sku.toLowerCase().includes(searchLower) ||
      item.descricao.toLowerCase().includes(searchLower) ||
      item.grupo.toLowerCase().includes(searchLower) ||
      (item.modelo && item.modelo.toLowerCase().includes(searchLower));
    
    const matchesGrupo = grupoFilter === "all" || !grupoFilter || item.grupo.toLowerCase().includes(grupoFilter.toLowerCase());
    
    return matchesSearch && matchesGrupo;
  });

  // Filtrar movimentos
  const filteredMovimentos = movimentos.filter(movimento => {
    if (movimento.lojaId !== lojaAtual?.id) return false;
    
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
    
    return matchesSearch;
  });

  // Obter saldo do item para a loja ativa
  const getSaldoItem = (itemId: string) => {
    return estoque.find(e => e.itemId === itemId && e.lojaId === lojaAtual?.id) || 
           { saldo: 0, controle: 'SALDO', series: [] };
  };

  // Verificar se o item está com estoque crítico
  const isEstoqueCritico = (item: any, saldoAtual: number) => {
    return item.min && saldoAtual <= item.min;
  };

  const handleAjustarSaldo = (item: any) => {
    if (!can('almox:ajustar')) {
      toast({
        title: "Permissão negada",
        description: "Você não tem permissão para ajustar saldos.",
        variant: "destructive"
      });
      return;
    }

    setSelectedItem(item);
    const saldoAtual = getSaldoItem(item.id);
    setAjusteForm({
      novoSaldo: saldoAtual.saldo.toString(),
      justificativa: "",
      tipo: "AJUSTE_POSITIVO"
    });
    setShowAjusteModal(true);
  };

  const handleConfirmarAjuste = () => {
    if (!selectedItem || !lojaAtual) return;

    const novoSaldo = parseInt(ajusteForm.novoSaldo);
    const saldoAtual = getSaldoItem(selectedItem.id).saldo;
    const diferenca = novoSaldo - saldoAtual;

    if (diferenca === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "O saldo informado é igual ao atual.",
        variant: "destructive"
      });
      return;
    }

    if (!ajusteForm.justificativa.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Informe o motivo do ajuste de saldo.",
        variant: "destructive"
      });
      return;
    }

    ajustarSaldo(selectedItem.id, lojaAtual.id, diferenca, ajusteForm.justificativa);

    toast({
      title: "Ajuste realizado",
      description: `Saldo do item ${selectedItem.sku} ajustado com sucesso.`
    });

    setShowAjusteModal(false);
    setSelectedItem(null);
  };

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

  const grupos = [...new Set(catalogoItens.map(item => item.grupo))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Controle de Estoque</h1>
        <p className="text-muted-foreground">
          Gestão unificada de saldos e movimentações de estoque
        </p>
      </div>

      {/* Filtros */}
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
              <Label>Buscar</Label>
              <Input
                placeholder="SKU, descrição, grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {can('almox:patrimonial') && <SelectItem value="PATRIMONIAL">Patrimonial</SelectItem>}
                  <SelectItem value="PECA">Peças</SelectItem>
                  <SelectItem value="CONSUMIVEL">Consumíveis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Controle</Label>
              <Select value={controleFilter} onValueChange={setControleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SERIE">Série</SelectItem>
                  <SelectItem value="SALDO">Saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grupo</Label>
              <Select value={grupoFilter} onValueChange={setGrupoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {grupos.map(grupo => (
                    <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="saldos">Saldos por Item</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="saldos">
          <Card>
            <CardHeader>
              <CardTitle>Saldos de Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Controle</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Mín/Máx</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItens.map((item) => {
                    const saldoData = getSaldoItem(item.id);
                    const critico = isEstoqueCritico(item, saldoData.saldo);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.descricao}</div>
                            <div className="text-sm text-muted-foreground">{item.unidade}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.tipo === 'PATRIMONIAL' ? 'default' :
                            item.tipo === 'PECA' ? 'secondary' : 'outline'
                          }>
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.grupo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.controle}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {saldoData.saldo}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.estoqueMinimo && item.estoqueMaximo ? `${item.estoqueMinimo}/${item.estoqueMaximo}` : '--'}
                        </TableCell>
                        <TableCell>
                          {critico ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Crítico
                            </Badge>
                          ) : (
                            <Badge variant="outline">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {can('almox:ajustar') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAjustarSaldo(item)}
                            >
                              Ajustar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItens.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentos">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações de Estoque</CardTitle>
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
        </TabsContent>
      </Tabs>

      {/* Modal de Ajuste de Saldo */}
      <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <Label>Item</Label>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">{selectedItem.sku} - {selectedItem.descricao}</div>
                  <div className="text-sm text-muted-foreground">
                    Saldo atual: {getSaldoItem(selectedItem.id).saldo} {selectedItem.unidade}
                  </div>
                </div>
              </div>

              <div>
                <Label>Novo Saldo</Label>
                <Input
                  type="number"
                  min="0"
                  value={ajusteForm.novoSaldo}
                  onChange={(e) => setAjusteForm(prev => ({ ...prev, novoSaldo: e.target.value }))}
                />
              </div>

              <div>
                <Label>Justificativa *</Label>
                <Textarea
                  placeholder="Motivo do ajuste de saldo..."
                  value={ajusteForm.justificativa}
                  onChange={(e) => setAjusteForm(prev => ({ ...prev, justificativa: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAjusteModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmarAjuste}>
                  Confirmar Ajuste
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}