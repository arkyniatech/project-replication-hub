import { useState, useEffect } from "react";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  ArrowUp, 
  ArrowDown, 
  CreditCard, 
  Smartphone, 
  Banknote,
  FileText,
  Download,
  X,
  Plus,
  Clock,
  Filter
} from "lucide-react";
import { caixaStorage } from "@/lib/storage";
import { CaixaDoDia, MovimentoCaixa } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CaixaDoDiaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceberClick: () => void;
  onDespesaClick: () => void;
}

const currentUser = { id: "user-1", nome: "Admin" };

const formasPagamento = [
  { value: 'PIX', label: 'PIX', icon: Smartphone, color: 'bg-green-500' },
  { value: 'Cartão', label: 'Cartão', icon: CreditCard, color: 'bg-blue-500' },
  { value: 'Dinheiro', label: 'Dinheiro', icon: Banknote, color: 'bg-amber-500' },
  { value: 'Boleto', label: 'Boleto', icon: FileText, color: 'bg-purple-500' },
  { value: 'Transferência', label: 'Transferência', icon: ArrowUp, color: 'bg-indigo-500' },
];

export default function CaixaDoDiaDrawer({ 
  open, 
  onOpenChange, 
  onReceberClick, 
  onDespesaClick 
}: CaixaDoDiaDrawerProps) {
  const { toast } = useToast();
  const [caixa, setCaixa] = useState<CaixaDoDia | null>(null);
  const [filtroForma, setFiltroForma] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [fechandoCaixa, setFechandoCaixa] = useState(false);
  const [apurado, setApurado] = useState({
    pix: 0,
    cartao: 0,
    dinheiro: 0,
    boleto: 0,
    transferencia: 0
  });
  const [observacaoFechamento, setObservacaoFechamento] = useState("");

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open) {
      carregarCaixa();
    }
  }, [open]);

  const carregarCaixa = () => {
    const caixaAtual = caixaStorage.getCaixaUsuarioData(currentUser.id, hoje);
    setCaixa(caixaAtual || null);
  };

  const calcularTotaisPorForma = () => {
    if (!caixa) return {};
    
    const totais: Record<string, { entradas: number; saidas: number; saldo: number }> = {};
    
    formasPagamento.forEach(forma => {
      totais[forma.value.toLowerCase()] = { entradas: 0, saidas: 0, saldo: 0 };
    });

    caixa.movimentos.forEach(mov => {
      const forma = mov.forma.toLowerCase();
      if (totais[forma]) {
        if (mov.tipo === 'Entrada') {
          totais[forma].entradas += mov.valorLiquido;
        } else {
          totais[forma].saidas += mov.valorLiquido;
        }
        totais[forma].saldo = totais[forma].entradas - totais[forma].saidas;
      }
    });

    return totais;
  };

  const filtrarMovimentos = () => {
    if (!caixa) return [];
    
    let movimentosFiltrados = [...caixa.movimentos];
    
    if (filtroForma !== 'todos') {
      movimentosFiltrados = movimentosFiltrados.filter(m => 
        m.forma.toLowerCase() === filtroForma
      );
    }
    
    if (filtroTipo !== 'todos') {
      movimentosFiltrados = movimentosFiltrados.filter(m => m.tipo === filtroTipo);
    }
    
    return movimentosFiltrados.sort((a, b) => b.ts - a.ts);
  };

  const iniciarFechamento = () => {
    if (!caixa) return;
    
    const totais = calcularTotaisPorForma();
    
    // Preencher valores esperados
    setApurado({
      pix: totais.pix?.saldo || 0,
      cartao: totais.cartao?.saldo || 0,
      dinheiro: totais.dinheiro?.saldo || 0,
      boleto: totais.boleto?.saldo || 0,
      transferencia: totais.transferência?.saldo || 0
    });
    
    setFechandoCaixa(true);
  };

  const confirmarFechamento = () => {
    if (!caixa) return;
    
    const totais = calcularTotaisPorForma();
    
    const esperado = {
      pix: totais.pix?.saldo || 0,
      cartao: totais.cartao?.saldo || 0,
      dinheiro: totais.dinheiro?.saldo || 0,
      boleto: totais.boleto?.saldo || 0,
      transferencia: totais.transferência?.saldo || 0
    };
    
    const diferencas = {
      pix: apurado.pix - esperado.pix,
      cartao: apurado.cartao - esperado.cartao,
      dinheiro: apurado.dinheiro - esperado.dinheiro,
      boleto: apurado.boleto - esperado.boleto,
      transferencia: apurado.transferencia - esperado.transferencia
    };
    
    const fechamento = {
      apurado,
      esperado,
      diferencas,
      observacao: observacaoFechamento,
      fechadoEm: Date.now()
    };
    
    caixaStorage.update(caixa.id, {
      status: 'Fechado',
      fechamento
    });
    
    carregarCaixa();
    setFechandoCaixa(false);
    setObservacaoFechamento("");
    
    toast({
      title: "Caixa Fechado",
      description: "Caixa do dia fechado com sucesso"
    });
  };

  const gerarRelatorioPDF = () => {
    toast({
      title: "Relatório Gerado",
      description: "Relatório do caixa (PDF mock) foi gerado com sucesso"
    });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarHorario = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  };

  const getIconeForma = (forma: string) => {
    const formaPagamento = formasPagamento.find(f => f.value === forma);
    return formaPagamento?.icon || FileText;
  };

  const getCorForma = (forma: string) => {
    const formaPagamento = formasPagamento.find(f => f.value === forma);
    return formaPagamento?.color || 'bg-gray-500';
  };

  const calcularDiferenca = (forma: string) => {
    if (!caixa?.fechamento) return 0;
    const key = forma.toLowerCase() as keyof typeof caixa.fechamento.diferencas;
    return caixa.fechamento.diferencas[key] || 0;
  };

  const totais = calcularTotaisPorForma();
  const movimentosFiltrados = filtrarMovimentos();

  if (!caixa) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-w-4xl mx-auto">
          <DrawerHeader>
            <DrawerTitle>Caixa do Dia</DrawerTitle>
            <DrawerClose />
          </DrawerHeader>
          <div className="p-6">
            <div className="text-center py-8">
              <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum caixa aberto</h3>
              <p className="text-muted-foreground mb-4">
                Não há caixa aberto para hoje. Abra o caixa no painel principal.
              </p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-6xl mx-auto max-h-[90vh]">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <div>
            <DrawerTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Caixa do Dia - {format(new Date(caixa.dataISO), 'dd/MM/yyyy', { locale: ptBR })}
            </DrawerTitle>
            <p className="text-sm text-muted-foreground">
              Responsável: {caixa.usuarioNome} • Status: {' '}
              <Badge variant={caixa.status === 'Aberto' ? 'default' : 'secondary'}>
                {caixa.status}
              </Badge>
            </p>
          </div>
          <DrawerClose />
        </DrawerHeader>

        <div className="px-6">
          <Tabs defaultValue={caixa.status === 'Fechado' ? 'resumo' : 'resumo'} className="space-y-4">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              {caixa.status === 'Aberto' && <TabsTrigger value="movimentos">Movimentos</TabsTrigger>}
              {caixa.status === 'Aberto' && <TabsTrigger value="conferencia">Conferência</TabsTrigger>}
            </TabsList>

            <TabsContent value="resumo" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {formasPagamento.map((forma) => {
                  const IconeForma = forma.icon;
                  const totalForma = totais[forma.value.toLowerCase()];
                  const diferenca = calcularDiferenca(forma.value);
                  
                  return (
                    <Card key={forma.value}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${forma.color}`} />
                          {forma.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600">Entradas:</span>
                            <span>{formatarMoeda(totalForma?.entradas || 0)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-red-600">Saídas:</span>
                            <span>{formatarMoeda(totalForma?.saidas || 0)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium">
                            <span>Saldo:</span>
                            <span>{formatarMoeda(totalForma?.saldo || 0)}</span>
                          </div>
                          {caixa.status === 'Fechado' && diferenca !== 0 && (
                            <div className={`flex justify-between text-xs ${diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <span>Diferença:</span>
                              <span>{formatarMoeda(diferenca)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {caixa.status === 'Aberto' && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={onReceberClick} className="flex-1 max-w-xs">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Receber Pagamento
                  </Button>
                  <Button onClick={onDespesaClick} variant="outline" className="flex-1 max-w-xs">
                    <ArrowDown className="w-4 h-4 mr-2" />
                    Lançar Despesa
                  </Button>
                </div>
              )}

              {caixa.status === 'Fechado' && (
                <div className="flex justify-center">
                  <Button onClick={gerarRelatorioPDF} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Relatório (PDF)
                  </Button>
                </div>
              )}
            </TabsContent>

            {caixa.status === 'Aberto' && (
              <TabsContent value="movimentos" className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <Select value={filtroForma} onValueChange={setFiltroForma}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Forma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as formas</SelectItem>
                        {formasPagamento.map(forma => (
                          <SelectItem key={forma.value} value={forma.value.toLowerCase()}>
                            {forma.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="Entrada">Entradas</SelectItem>
                      <SelectItem value="Saída">Saídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {movimentosFiltrados.length > 0 ? (
                    movimentosFiltrados.map((movimento) => {
                      const IconeForma = getIconeForma(movimento.forma);
                      const corForma = getCorForma(movimento.forma);
                      
                      return (
                        <Card key={movimento.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${corForma} flex items-center justify-center`}>
                                <IconeForma className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={movimento.tipo === 'Entrada' ? 'default' : 'destructive'}>
                                    {movimento.tipo === 'Entrada' ? (
                                      <ArrowUp className="w-3 h-3 mr-1" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3 mr-1" />
                                    )}
                                    {movimento.tipo}
                                  </Badge>
                                  <span className="text-sm font-medium">{movimento.forma}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{movimento.origem}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatarMoeda(movimento.valorLiquido)}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatarHorario(movimento.ts)}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p>Nenhum movimento encontrado</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {caixa.status === 'Aberto' && (
              <TabsContent value="conferencia" className="space-y-4">
                {!fechandoCaixa ? (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">Fechar Caixa</h3>
                    <p className="text-muted-foreground mb-4">
                      Confira os valores antes de fechar o caixa do dia
                    </p>
                    <Button onClick={iniciarFechamento}>
                      Iniciar Conferência
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {formasPagamento.map((forma) => {
                        const totalForma = totais[forma.value.toLowerCase()];
                        const valorEsperado = totalForma?.saldo || 0;
                        const key = forma.value.toLowerCase() as keyof typeof apurado;
                        const valorApurado = apurado[key];
                        const diferenca = valorApurado - valorEsperado;
                        
                        return (
                          <Card key={forma.value}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${forma.color}`} />
                                {forma.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Esperado:</Label>
                                <p className="font-medium">{formatarMoeda(valorEsperado)}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <Label htmlFor={`apurado-${forma.value}`} className="text-xs">
                                  Apurado:
                                </Label>
                                <Input
                                  id={`apurado-${forma.value}`}
                                  type="number"
                                  step="0.01"
                                  value={valorApurado}
                                  onChange={(e) => setApurado(prev => ({
                                    ...prev,
                                    [key]: parseFloat(e.target.value) || 0
                                  }))}
                                  className="text-center"
                                />
                              </div>
                              
                              {diferenca !== 0 && (
                                <div className={`text-center text-sm ${diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {diferenca > 0 ? '+' : ''}{formatarMoeda(diferenca)}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="observacao-fechamento">Observação de Fechamento</Label>
                      <Input
                        id="observacao-fechamento"
                        value={observacaoFechamento}
                        onChange={(e) => setObservacaoFechamento(e.target.value)}
                        placeholder="Observações sobre o fechamento..."
                      />
                    </div>

                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={() => setFechandoCaixa(false)} 
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                      <Button onClick={confirmarFechamento}>
                        Confirmar Fechamento
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
        
        <div className="p-6 border-t">
          <div className="text-center text-sm text-muted-foreground">
            Pressione <Badge variant="outline">X</Badge> para fechar
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}