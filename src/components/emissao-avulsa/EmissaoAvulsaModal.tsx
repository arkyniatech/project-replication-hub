import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { faturaStorage, tituloStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { usePermissions } from "@/hooks/usePermissions";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { supabaseClienteToLegacy } from "@/lib/cliente-adapter";
import { generateNumber } from "@/lib/numeracao";
import type { 
  ItemAvulso, 
  FaturaAvulsa, 
  EmissaoAvulsaFormaPagamento,
  EmissaoAvulsaEvent 
} from "@/types/emissao-avulsa";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Mail, 
  MessageSquare, 
  CreditCard,
  Info,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast as sonnerToast } from "sonner";

interface EmissaoAvulsaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteIdInicial?: string;
  contratoIdInicial?: string;
}

export function EmissaoAvulsaModal({
  open,
  onOpenChange,
  clienteIdInicial,
  contratoIdInicial
}: EmissaoAvulsaModalProps) {
  const { can } = usePermissions();
  const { toast } = useToast();
  const { addEmissaoAvulsaEvent, config } = useFaturamentoStore();
  const { lojaAtual } = useMultiunidade();
  
  const { clientes: clientesSupabase, isLoading: loadingClientes } = useSupabaseClientes(lojaAtual?.id);
  const { contratos: contratosSupabase, isLoading: loadingContratos } = useSupabaseContratos(lojaAtual?.id);

  // Estados principais
  const [clienteId, setClienteId] = useState(clienteIdInicial || '');
  const [contratoId, setContratoId] = useState(contratoIdInicial || '');
  const [vencimento, setVencimento] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [formaPagamento, setFormaPagamento] = useState<EmissaoAvulsaFormaPagamento>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [instrucoesCobranca, setInstrucoesCobranca] = useState('');
  const [itens, setItens] = useState<ItemAvulso[]>([]);
  
  // Estados de carregamento e UI
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [contratoSelecionado, setContratoSelecionado] = useState<any>(null);

  // Verificações de permissão
  const podeEmitir = can('financeiro', 'emitirFatura');
  const podeCobrar = can('financeiro', 'cobrar');

  // Carregar dados iniciais do Supabase
  useEffect(() => {
    if (open && clientesSupabase.length > 0) {
      const clientesLegacy = clientesSupabase.map(supabaseClienteToLegacy);
      setClientes(clientesLegacy);
    }
  }, [open, clientesSupabase]);

  useEffect(() => {
    if (open && contratosSupabase.length > 0) {
      // Adaptar contratos para formato esperado
      const contratosAdaptados = contratosSupabase.map(c => ({
        id: c.id,
        numero: c.numero,
        clienteId: c.cliente_id,
        status: c.status,
        dataInicio: c.data_inicio,
        dataFim: c.data_fim
      }));
      setContratos(contratosAdaptados);
    }
  }, [open, contratosSupabase]);

  useEffect(() => {
    if (open && itens.length === 0) {
      adicionarItemInicial();
    }
  }, [open]);

  useEffect(() => {
    if (clienteId) {
      const cliente = clientes.find(c => c.id === clienteId);
      setClienteSelecionado(cliente);
      
      // Filtrar contratos do cliente
      const contratosCliente = contratos.filter(c => c.clienteId === clienteId);
      if (contratosCliente.length > 0 && !contratoId) {
        setContratoId(contratosCliente[0].id);
      }
    }
  }, [clienteId, clientes, contratos]);

  useEffect(() => {
    if (contratoId) {
      const contrato = contratos.find(c => c.id === contratoId);
      setContratoSelecionado(contrato);
    }
  }, [contratoId, contratos]);

  const carregarClientes = () => {
    // Já carregado via useEffect com useSupabaseClientes
  };

  const carregarContratos = () => {
    // Já carregado via useEffect com useSupabaseContratos
  };

  const adicionarItemInicial = () => {
    if (itens.length === 0) {
      const item: ItemAvulso = {
        id: Date.now().toString(),
        descricao: '',
        quantidade: 1,
        valor: 0,
        subtotal: 0,
        tipo: 'OUTRO'
      };
      setItens([item]);
    }
  };

  const adicionarItem = () => {
    if (itens.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Máximo de 10 itens por fatura avulsa.",
        variant: "destructive"
      });
      return;
    }

    const novoItem: ItemAvulso = {
      id: Date.now().toString(),
      descricao: '',
      quantidade: 1,
      valor: 0,
      subtotal: 0,
      tipo: 'OUTRO'
    };
    setItens([...itens, novoItem]);
  };

  const removerItem = (id: string) => {
    if (itens.length === 1) {
      toast({
        title: "Ação não permitida",
        description: "É necessário pelo menos um item.",
        variant: "destructive"
      });
      return;
    }
    setItens(itens.filter(item => item.id !== id));
  };

  const atualizarItem = (id: string, campo: keyof ItemAvulso, valor: any) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        const itemAtualizado = { ...item, [campo]: valor };
        if (campo === 'quantidade' || campo === 'valor') {
          itemAtualizado.subtotal = itemAtualizado.quantidade * itemAtualizado.valor;
        }
        return itemAtualizado;
      }
      return item;
    }));
  };

  const calcularTotais = () => {
    const subtotal = itens.reduce((total, item) => total + item.subtotal, 0);
    const acrescimos = 0; // placeholder
    const descontos = 0; // placeholder
    const total = subtotal + acrescimos - descontos;
    
    return { subtotal, acrescimos, descontos, total };
  };

  const handlePreviewPDF = () => {
    if (!validarFormulario()) return;

    const event: EmissaoAvulsaEvent = {
      tipo: 'PREVIEW',
      timestamp: new Date().toISOString(),
      usuario: 'admin'
    };

    addEmissaoAvulsaEvent(event);
    
    sonnerToast.success("Preview PDF", {
      description: "Documento gerado",
      action: {
        label: "Baixar",
        onClick: () => console.log("Download PDF mock")
      }
    });
  };

  const handleGerarFatura = async () => {
    if (!validarFormulario()) return;

    setLoading(true);

    try {
      const totais = calcularTotais();
      const numeroFatura = generateNumber('fatura', '1'); // TODO: usar loja ativa
      const faturaId = `fav_${Date.now()}`;

      // Criar fatura avulsa
      const novaFatura: FaturaAvulsa = {
        id: faturaId,
        numero: numeroFatura,
        tipo: 'AVULSA',
        serie: `FAV-1-${numeroFatura.split('-').pop()}`,
        clienteId,
        clienteNome: clienteSelecionado?.nomeRazao || 'Cliente',
        contratoId: contratoId || undefined,
        contratoNumero: contratoSelecionado?.numero || undefined,
        emissao: format(new Date(), 'yyyy-MM-dd'),
        vencimento,
        itens,
        subtotal: totais.subtotal,
        acrescimos: totais.acrescimos,
        descontos: totais.descontos,
        total: totais.total,
        formaPagamento,
        observacoes,
        instrucoesCobranca,
        status: 'EMITIDA',
        origem: 'EMISSAO_AVULSA',
        emitidaEm: new Date().toISOString(),
        emitidaPor: 'admin',
        timeline: [{
          tipo: 'GERADA',
          timestamp: new Date().toISOString(),
          usuario: 'admin',
          faturaId,
          valor: totais.total
        }]
      };

      // Salvar fatura (compatibilidade com sistema existente)
      const faturaCompativel = {
        id: faturaId,
        numero: numeroFatura,
        contratoId: contratoId || '',
        contrato: contratoSelecionado,
        clienteId,
        cliente: clienteSelecionado,
        emissao: format(new Date(), 'yyyy-MM-dd'),
        vencimento,
        itens: itens.map(item => ({
          id: item.id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          periodo: 'Avulso',
          preco: item.valor,
          subtotal: item.subtotal
        })),
        subtotal: totais.subtotal,
        acrescimos: totais.acrescimos,
        descontos: totais.descontos,
        valor: totais.total,
        valorFiscal: false,
        formaPreferida: (formaPagamento === 'BOLETO' ? 'Boleto' : formaPagamento) as 'PIX' | 'Boleto' | 'Cartão',
        observacoes,
        dataVencimento: vencimento,
        status: 'Em aberto' as const,
        valorPago: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      faturaStorage.add(faturaCompativel);

      // Criar título vinculado
      const numeroTitulo = generateNumber('titulo', '1');
      const titulo = {
        id: Date.now().toString(),
        numero: numeroTitulo,
        contratoId: contratoId || faturaId,
        contrato: contratoSelecionado,
        clienteId,
        cliente: clienteSelecionado,
        lojaId: '1',
        categoria: 'Locação',
        subcategoria: 'Cobrança Avulsa',
        origem: 'CONTRATO' as const,
        emissao: format(new Date(), 'yyyy-MM-dd'),
        vencimento,
        valor: totais.total,
        pago: 0,
        saldo: totais.total,
        forma: formaPagamento === 'BOLETO' ? 'Boleto' : formaPagamento as any,
        status: 'Em aberto' as const,
        timeline: [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          tipo: 'criacao' as const,
          descricao: `Fatura avulsa ${numeroFatura} emitida`,
          usuario: 'admin'
        }],
        observacoes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      tituloStorage.add(titulo);

      // Registrar telemetria
      addEmissaoAvulsaEvent({
        tipo: 'GERADA',
        timestamp: new Date().toISOString(),
        usuario: 'admin',
        faturaId,
        valor: totais.total
      });

      sonnerToast.success("Fatura emitida com sucesso!", {
        description: `${numeroFatura} - R$ ${totais.total.toLocaleString('pt-BR')}`,
        action: {
          label: "Ver Timeline",
          onClick: () => console.log("Abrir timeline")
        }
      });

      limparFormulario();
      onOpenChange(false);

    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível emitir a fatura avulsa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarCobranca = async () => {
    if (!podeCobrar) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para gerar cobranças.",
        variant: "destructive"
      });
      return;
    }

    // Mock da geração de cobrança
    sonnerToast.success("Cobrança gerada!", {
      description: "PIX/Boleto disponível",
      action: {
        label: "Copiar PIX",
        onClick: () => console.log("Copiar código PIX")
      }
    });

    addEmissaoAvulsaEvent({
      tipo: 'COBRANCA',
      timestamp: new Date().toISOString(),
      usuario: 'admin'
    });
  };

  const handleEnviar = (canal: 'EMAIL' | 'WHATSAPP') => {
    sonnerToast.success(`Enviado via ${canal}`, {
      description: "Documento enviado com sucesso"
    });

    addEmissaoAvulsaEvent({
      tipo: 'ENVIADA',
      timestamp: new Date().toISOString(),
      usuario: 'admin',
      canal
    });
  };

  const validarFormulario = () => {
    if (!clienteId) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente para emitir a fatura.",
        variant: "destructive"
      });
      return false;
    }

    if (!vencimento) {
      toast({
        title: "Vencimento obrigatório",
        description: "Informe a data de vencimento.",
        variant: "destructive"
      });
      return false;
    }

    if (itens.length === 0 || itens.every(item => !item.descricao || item.valor === 0)) {
      toast({
        title: "Itens obrigatórios",
        description: "Adicione pelo menos um item com descrição e valor.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const limparFormulario = () => {
    setClienteId('');
    setContratoId('');
    setVencimento(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setFormaPagamento('PIX');
    setObservacoes('');
    setInstrucoesCobranca('');
    setItens([]);
    adicionarItemInicial();
  };

  const totais = calcularTotais();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            Emissão Rápida (avulsa)
            <Badge variant="secondary" className="text-xs">
              Em transição
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Banner informativo */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Para faturamento mensal consolidado, use a tela{" "}
            <strong>Faturamento</strong>. Esta é para cobranças avulsas e ajustes pontuais.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              {loadingClientes ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger id="cliente">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nomeRazao} - {cliente.documento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrato">Contrato (opcional)</Label>
              {loadingContratos ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <Select value={contratoId} onValueChange={setContratoId}>
                  <SelectTrigger id="contrato">
                    <SelectValue placeholder="Selecione o contrato..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum contrato</SelectItem>
                    {contratos
                      .filter(c => !clienteId || c.clienteId === clienteId)
                      .map(contrato => (
                        <SelectItem key={contrato.id} value={contrato.id}>
                          {contrato.numero}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Dados da Fatura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emissao">Data do documento avulso</Label>
              <Input
                id="emissao"
                type="date"
                value={format(new Date(), 'yyyy-MM-dd')}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forma">Forma Preferida</Label>
              <Select 
                value={formaPagamento} 
                onValueChange={(v: EmissaoAvulsaFormaPagamento) => setFormaPagamento(v)}
              >
                <SelectTrigger id="forma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Itens da Fatura</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarItem}
                disabled={itens.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-3">
              {itens.map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-1">
                      <Label className="text-xs text-muted-foreground">
                        #{index + 1}
                      </Label>
                    </div>

                    <div className="col-span-4">
                      <Label className="text-xs">Descrição *</Label>
                      <Input
                        value={item.descricao}
                        onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                        placeholder="Frete, ajuste, taxa administrativa..."
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={item.tipo}
                        onValueChange={(v) => atualizarItem(item.id, 'tipo', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FRETE">Frete</SelectItem>
                          <SelectItem value="AJUSTE">Ajuste</SelectItem>
                          <SelectItem value="TAXA_ADMIN">Taxa Admin</SelectItem>
                          <SelectItem value="DIFERENCA">Diferença</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs">Qtde</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(item.id, 'quantidade', parseFloat(e.target.value) || 1)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Valor Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.valor}
                        onChange={(e) => atualizarItem(item.id, 'valor', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="text-sm font-medium py-2 text-right">
                        {item.subtotal.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </div>
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerItem(item.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={itens.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Totalização */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-mono">
                        {totais.subtotal.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Acréscimos:</span>
                      <span className="font-mono">
                        {totais.acrescimos.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Descontos:</span>
                      <span className="font-mono">
                        -{totais.descontos.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-l pl-4">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg text-primary">
                      {totais.total.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Visível ao cliente no documento"
              />
            </div>

            {formaPagamento !== 'OUTRO' && (
              <div className="space-y-2">
                <Label htmlFor="instrucoes">Instruções de Cobrança</Label>
                <Textarea
                  id="instrucoes"
                  value={instrucoesCobranca}
                  onChange={(e) => setInstrucoesCobranca(e.target.value)}
                  rows={3}
                  placeholder="Instruções específicas para o boleto/PIX..."
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Linha 1: Ações de documento */}
          <div className="flex flex-wrap gap-2 mr-auto">
            <Button variant="outline" size="sm" onClick={handlePreviewPDF}>
              <FileText className="h-4 w-4 mr-1" />
              Preview PDF
            </Button>

            <Button variant="outline" size="sm" onClick={() => console.log("2ª via")}>
              <Download className="h-4 w-4 mr-1" />
              2ª Via
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleEnviar('EMAIL')}>
              <Mail className="h-4 w-4 mr-1" />
              E-mail
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleEnviar('WHATSAPP')}>
              <MessageSquare className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>

            {podeCobrar && formaPagamento !== 'OUTRO' && (
              <Button variant="outline" size="sm" onClick={handleGerarCobranca}>
                <CreditCard className="h-4 w-4 mr-1" />
                Gerar Boleto/PIX
              </Button>
            )}
          </div>

          {/* Linha 2: Ações principais */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            
            <Button 
              onClick={handleGerarFatura}
              disabled={loading || !podeEmitir || totais.total === 0}
            >
              {loading ? "Gerando..." : "Gerar Documento"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}