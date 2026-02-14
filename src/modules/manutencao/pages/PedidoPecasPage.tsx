import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useManutencaoStore } from "../stores/manutencaoStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  FileText,
  Calendar,
  Upload
} from "lucide-react";
import { PedidoItem, ClassDefeito, StatusPedido } from "../types";

export default function PedidoPecasPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [fornecedor, setFornecedor] = useState("");
  const [nf, setNf] = useState("");
  const [dtPrevista, setDtPrevista] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [classificacao, setClassificacao] = useState<ClassDefeito>("DESGASTE");

  const {
    ordens,
    criarPedidoPecas,
    atualizarPedidoPecas,
    finalizarPedido,
    receberPecas
  } = useManutencaoStore();

  const os = ordens.find(o => o.id === id);
  const pedido = os?.pedido;

  useEffect(() => {
    if (pedido) {
      setItens(pedido.itens);
      setFornecedor(pedido.fornecedor || "");
      setNf(pedido.nf || "");
      setDtPrevista(pedido.dtPrevista || "");
      setJustificativa(pedido.justificativa || "");
      setClassificacao(pedido.classificacao || "DESGASTE");
    }
  }, [pedido]);

  if (!os) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">OS não encontrada</h1>
          <Button onClick={() => navigate('/manutencao')} className="mt-4">
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  const adicionarItem = () => {
    setItens([...itens, { cod: "", descr: "", qtd: 1, custo: 0 }]);
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, campo: keyof PedidoItem, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItens(novosItens);
  };

  const salvarRascunho = () => {
    const dadosPedido = {
      itens,
      fornecedor,
      nf,
      dtPrevista,
      justificativa,
      classificacao,
      status: 'RASCUNHO' as StatusPedido
    };

    if (pedido) {
      atualizarPedidoPecas(os.id, dadosPedido);
    } else {
      criarPedidoPecas(os.id, dadosPedido);
    }
  };

  const finalizar = () => {
    salvarRascunho();
    finalizarPedido(os.id);
  };

  const marcarComoRecebido = (tipo: 'PARCIAL' | 'TOTAL') => {
    receberPecas(os.id, tipo);
  };

  const totalCusto = itens.reduce((acc, item) => acc + (item.custo || 0) * item.qtd, 0);

  const STATUS_CONFIG = {
    RASCUNHO: { color: "bg-gray-500", label: "Rascunho" },
    FINALIZADO: { color: "bg-blue-500", label: "Finalizado" },
    COMPRADO: { color: "bg-yellow-500", label: "Comprado" },
    PARCIAL: { color: "bg-orange-500", label: "Parcial" },
    TOTAL: { color: "bg-green-500", label: "Recebido" }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/manutencao/os/${os.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para OS
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pedido de Peças</h1>
            <p className="text-muted-foreground">
              OS {os.id} - {os.equipamentoId}
            </p>
          </div>
        </div>
        
        {pedido && (
          <Badge className={`text-white ${STATUS_CONFIG[pedido.status].color}`}>
            {STATUS_CONFIG[pedido.status].label}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens Solicitados
                </CardTitle>
                <Button onClick={adicionarItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {itens.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="text-sm font-medium">Código</label>
                      <Input
                        value={item.cod}
                        onChange={(e) => atualizarItem(index, 'cod', e.target.value)}
                        placeholder="Código da peça"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-sm font-medium">Descrição</label>
                      <Input
                        value={item.descr}
                        onChange={(e) => atualizarItem(index, 'descr', e.target.value)}
                        placeholder="Descrição"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Qtd</label>
                      <Input
                        type="number"
                        value={item.qtd}
                        onChange={(e) => atualizarItem(index, 'qtd', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Custo Un.</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.custo || ''}
                        onChange={(e) => atualizarItem(index, 'custo', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removerItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {itens.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item adicionado ainda</p>
                  </div>
                )}
                
                {itens.length > 0 && (
                  <Separator />
                )}
                
                <div className="flex justify-between items-center font-medium">
                  <span>Total Estimado:</span>
                  <span>R$ {totalCusto.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações Complementares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Classificação</label>
                  <Select 
                    value={classificacao} 
                    onValueChange={(value: ClassDefeito) => setClassificacao(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DESGASTE">Desgaste Normal</SelectItem>
                      <SelectItem value="MAU_USO">Mau Uso</SelectItem>
                      <SelectItem value="NA">Não se Aplica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Fornecedor</label>
                  <Input
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Nome do fornecedor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Justificativa</label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Descreva o motivo da solicitação das peças..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!pedido || pedido.status === 'RASCUNHO' ? (
                <>
                  <Button onClick={salvarRascunho} variant="outline" className="w-full">
                    Salvar Rascunho
                  </Button>
                  <Button onClick={finalizar} className="w-full">
                    Finalizar Pedido
                  </Button>
                </>
              ) : (
                <>
                  {pedido.status === 'FINALIZADO' && (
                    <Button onClick={() => atualizarPedidoPecas(os.id, { status: 'COMPRADO' })} className="w-full">
                      Marcar como Comprado
                    </Button>
                  )}
                  
                  {pedido.status === 'COMPRADO' && (
                    <>
                      <Button onClick={() => marcarComoRecebido('PARCIAL')} variant="outline" className="w-full">
                        Recebimento Parcial
                      </Button>
                      <Button onClick={() => marcarComoRecebido('TOTAL')} className="w-full">
                        Recebimento Total
                      </Button>
                    </>
                  )}
                  
                  {pedido.status === 'PARCIAL' && (
                    <Button onClick={() => marcarComoRecebido('TOTAL')} className="w-full">
                      Completar Recebimento
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Purchase Info */}
          {pedido && pedido.status !== 'RASCUNHO' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Info da Compra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nota Fiscal</label>
                  <Input
                    value={nf}
                    onChange={(e) => setNf(e.target.value)}
                    placeholder="Número da NF"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Data Prevista</label>
                  <Input
                    type="date"
                    value={dtPrevista}
                    onChange={(e) => setDtPrevista(e.target.value)}
                  />
                </div>
                
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Anexar Documentos
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}