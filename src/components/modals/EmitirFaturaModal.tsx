import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useSupabaseFaturas } from "@/hooks/useSupabaseFaturas";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useToast } from "@/hooks/use-toast";
import { Contrato, ItemFatura } from "@/types";
import { FaturaPreviewDrawer } from "@/components/faturamento/FaturamentoTimelineDrawer";
import { useNumeracao } from "@/hooks/useNumeracao";

interface EmitirFaturaModalProps {
  contrato?: Contrato;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EmitirFaturaModal({
  contrato: contratoInicial,
  open,
  onOpenChange,
  onSuccess,
}: EmitirFaturaModalProps) {
  const [contrato, setContrato] = useState<Contrato | null>(contratoInicial || null);
  const [tipoFatura, setTipoFatura] = useState<'fiscal' | 'demonstrativo'>('demonstrativo');
  const [itens, setItens] = useState<ItemFatura[]>([]);
  const [vencimento, setVencimento] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formaPreferida, setFormaPreferida] = useState<'Boleto' | 'PIX' | 'Cartão' | 'Dinheiro'>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [faturaEmitida, setFaturaEmitida] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const { createFatura } = useSupabaseFaturas();
  const { createTitulo } = useSupabaseTitulos();
  const { gerarNumero } = useNumeracao();

  // Buscar títulos pendentes (não faturados) do contrato
  const { titulos: titulosContrato } = useSupabaseTitulos(contrato?.lojaId, contrato?.clienteId);
  
  // Inicializar itens com dados dos títulos pendentes quando disponível
  // PRIORIDADE 1: Títulos de Renovação pendentes
  // PRIORIDADE 2: Outros títulos pendentes não faturados
  // FALLBACK: Itens do contrato
  React.useEffect(() => {
    if (contrato && itens.length === 0 && titulosContrato) {
      console.log('[EmitirFatura] Carregando itens para contrato:', contrato.id);
      
      // PRIORIDADE 1: Buscar títulos de RENOVAÇÃO pendentes (não faturados)
      const titulosRenovacao = titulosContrato.filter(t => 
        t.contratoId === contrato.id && 
        t.status === 'EM_ABERTO' &&
        t.subcategoria === 'Renovação' &&
        !(t as any).fatura_id
      );

      console.log('[EmitirFatura] Títulos de Renovação encontrados:', titulosRenovacao.length);

      if (titulosRenovacao.length > 0) {
        const itensIniciais: ItemFatura[] = titulosRenovacao.map((titulo) => {
          // Extrair informações do período da subcategoria
          const periodoDetalhado = titulo.subcategoria || 'Renovação';
          
          // Tentar extrair número da renovação do título (formato esperado: "LOC-22-01")
          const numeroRenovacao = (titulo as any).numero || contrato.numero;
          
          return {
            id: titulo.id,
            descricao: `${titulo.categoria || 'Locação'} - ${titulo.subcategoria || 'Renovação'}`,
            quantidade: 1,
            periodo: periodoDetalhado,
            numeroContrato: numeroRenovacao,
            periodoInicio: (titulo as any).periodo_inicio || contrato.dataInicio,
            periodoFim: (titulo as any).periodo_fim || contrato.dataFim,
            preco: titulo.saldo,
            subtotal: titulo.saldo
          };
        });
        console.log('[EmitirFatura] Usando títulos de Renovação:', itensIniciais);
        setItens(itensIniciais);
        return;
      }

      // PRIORIDADE 2: Buscar outros títulos EM_ABERTO não faturados
      const titulosPendentes = titulosContrato.filter(t => 
        t.contratoId === contrato.id && 
        t.status === 'EM_ABERTO' &&
        !(t as any).fatura_id
      );

      console.log('[EmitirFatura] Outros títulos pendentes encontrados:', titulosPendentes.length);

      if (titulosPendentes.length > 0) {
        const itensIniciais: ItemFatura[] = titulosPendentes.map((titulo) => {
          // Formatar a subcategoria de forma mais clara
          const subcatDetalhada = titulo.subcategoria || 'Período inicial';
          
          return {
            id: titulo.id,
            descricao: `${titulo.categoria || 'Locação'} - ${titulo.subcategoria || 'Período'}`,
            quantidade: 1,
            periodo: subcatDetalhada,
            numeroContrato: (titulo as any).numero || contrato.numero,
            periodoInicio: (titulo as any).periodo_inicio || contrato.dataInicio,
            periodoFim: (titulo as any).periodo_fim || contrato.dataFim,
            preco: titulo.saldo,
            subtotal: titulo.saldo
          };
        });
        console.log('[EmitirFatura] Usando títulos gerais:', itensIniciais);
        setItens(itensIniciais);
        return;
      }

      // FALLBACK: Se não há títulos pendentes, usar os itens do contrato (caso inicial)
      console.log('[EmitirFatura] Nenhum título pendente, usando itens do contrato');
      const itensIniciais: ItemFatura[] = contrato.itens?.map(item => {
        const itemComModelo = item as any;
        const nomeModelo = itemComModelo.modelo?.nome;
        
        // Formatar período com datas se disponível
        const periodoFormatado = (() => {
          if (contrato.dataInicio && contrato.dataFim) {
            const dataInicio = new Date(contrato.dataInicio).toLocaleDateString('pt-BR');
            const dataFim = new Date(contrato.dataFim).toLocaleDateString('pt-BR');
            return `${dataInicio} a ${dataFim}`;
          }
          return item.periodo === 'mensal' ? 'Mensal' : item.periodo === 'semanal' ? 'Semanal' : 'Diário';
        })();
        
        return {
          id: item.id,
          descricao: nomeModelo || item.equipamento?.descricao || item.equipamento?.nome || 'Item de locação',
          quantidade: item.quantidade || 1,
          periodo: periodoFormatado,
          numeroContrato: contrato.numero,
          periodoInicio: contrato.dataInicio,
          periodoFim: contrato.dataFim,
          preco: item.valorUnitario || 0,
          subtotal: item.valorTotal || 0
        };
      }) || [];
      setItens(itensIniciais);
    }
  }, [contrato, titulosContrato]);

  // Itens são fixos do contrato, não podem ser removidos

  const atualizarItem = (id: string, campo: keyof ItemFatura, valor: any) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        const itemAtualizado = { ...item, [campo]: valor };
        if (campo === 'quantidade' || campo === 'preco') {
          itemAtualizado.subtotal = itemAtualizado.quantidade * itemAtualizado.preco;
        }
        return itemAtualizado;
      }
      return item;
    }));
  };

  const calcularTotal = () => {
    return itens.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleSubmit = async () => {
    if (!contrato) {
      toast({
        title: "Erro",
        description: "Nenhum contrato selecionado.",
        variant: "destructive"
      });
      return;
    }

    if (itens.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item à fatura.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const valorTotal = calcularTotal();
      
      // Gerar números usando o sistema de numeração configurado
      const numeroFatura = gerarNumero('fatura');
      const numeroTitulo = gerarNumero('titulo');

      // Criar fatura no Supabase
      const faturaData = await createFatura.mutateAsync({
        loja_id: contrato.lojaId,
        cliente_id: contrato.clienteId,
        contrato_id: contrato.id,
        numero: numeroFatura,
        tipo: tipoFatura === 'fiscal' ? 'FISCAL_MOCK' : 'DEMONSTRATIVO',
        emissao: new Date().toISOString(),
        vencimento: new Date(vencimento).toISOString(),
        itens: itens.map(i => ({
          descricao: i.descricao,
          quantidade: i.quantidade,
          periodo: i.periodo,
          preco: i.preco,
          subtotal: i.subtotal
        })),
        forma_preferida: formaPreferida,
        observacoes: observacoes,
        total: valorTotal
      });

      // Criar título vinculado no Supabase
      await createTitulo.mutateAsync({
        loja_id: contrato.lojaId,
        cliente_id: contrato.clienteId,
        contrato_id: contrato.id,
        fatura_id: faturaData.id,
        numero: numeroTitulo,
        categoria: 'Locação',
        subcategoria: 'Adicional de Locação',
        descricao: `Fatura ${numeroFatura} - ${contrato.cliente.nomeRazao}`,
        valor: valorTotal,
        pago: 0,
        saldo: valorTotal,
        emissao: new Date().toISOString(),
        vencimento: new Date(vencimento).toISOString(),
        status: 'EM_ABERTO',
        forma: formaPreferida,
        origem: 'CONTRATO',
        timeline: [{
          timestamp: new Date().toISOString(),
          tipo: 'criacao',
          descricao: `Fatura ${numeroFatura} emitida${tipoFatura === 'fiscal' ? ' (com valor fiscal)' : ' (demonstrativo)'}`,
          usuario: 'Admin',
        }]
      });

      // Sucesso - preparar preview da fatura
      toast({
        title: "Fatura emitida",
        description: `Fatura ${numeroFatura} emitida com sucesso! Valor: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        duration: 2000
      });
      
      setFaturaEmitida({
        numero: numeroFatura,
        cliente: contrato.cliente.nomeRazao,
        emissao: new Date().toISOString(),
        vencimento: vencimento,
        total: valorTotal,
        itens: itens.map(item => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          precoUnitario: item.preco,
          subtotal: item.subtotal,
          numeroContrato: item.numeroContrato || contrato.numero,
          periodoInicio: item.periodoInicio || contrato.dataInicio,
          periodoFim: item.periodoFim || contrato.dataFim
        }))
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Fechar modal de emissão e abrir preview
      onOpenChange(false);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Erro ao emitir fatura:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível emitir a fatura.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🧾 Emitir Fatura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {contrato && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Contrato:</p>
                    <p>{contrato.numero}</p>
                  </div>
                  <div>
                    <p className="font-medium">Cliente:</p>
                    <p>{contrato.cliente.nomeRazao}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Fatura *</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="demonstrativo"
                    name="tipoFatura"
                    value="demonstrativo"
                    checked={tipoFatura === 'demonstrativo'}
                    onChange={(e) => setTipoFatura(e.target.value as any)}
                  />
                  <Label htmlFor="demonstrativo">Sem valor fiscal (demonstrativo)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="fiscal"
                    name="tipoFatura"
                    value="fiscal"
                    checked={tipoFatura === 'fiscal'}
                    onChange={(e) => setTipoFatura(e.target.value as any)}
                  />
                  <Label htmlFor="fiscal">Com valor fiscal</Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <div className="mb-4">
              <Label>Itens da Fatura</Label>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              {/* Cabeçalho da tabela */}
              <div className="grid grid-cols-12 gap-3 bg-muted px-4 py-2 font-medium text-sm border-b">
                <div className="col-span-4">Descrição</div>
                <div className="col-span-1 text-center">Qtde</div>
                <div className="col-span-3">Período</div>
                <div className="col-span-2 text-right">Preço Unit.</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>

              {/* Linhas da tabela */}
              <div className="divide-y">
                {itens.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-muted/50 transition-colors">
                    <div className="col-span-4 text-sm">
                      {item.descricao}
                    </div>
                    <div className="col-span-1 text-center text-sm font-medium">
                      {item.quantidade}
                    </div>
                    <div className="col-span-3">
                      <div className="text-sm text-muted-foreground" title={item.periodo}>
                        {item.periodo}
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-sm">
                      R$ {item.preco.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium">
                      R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {itens.length > 0 && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg text-primary">
                      R$ {calcularTotal().toLocaleString('pt-BR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="formaPreferida">Forma Preferida *</Label>
              <select
                id="formaPreferida"
                value={formaPreferida}
                onChange={(e) => setFormaPreferida(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 bg-input border border-input-border rounded-md text-foreground"
              >
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações/Instruções</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Observações ou instruções especiais..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !contrato || itens.length === 0}>
            {loading ? "Emitindo..." : "Emitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <FaturaPreviewDrawer
      open={showPreview}
      onOpenChange={setShowPreview}
      fatura={faturaEmitida}
    />
  </>
  );
}