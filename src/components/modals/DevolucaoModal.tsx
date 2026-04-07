import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Contrato, Titulo, ItemContrato, EventoTimeline } from "@/types";
import { generateNumber } from "@/lib/numeracao";
import { calcularEncerramentoSemProrata, precoTabela } from "@/lib/contratos-v2-utils";
import { useContratosStore } from "@/stores/contratosStore";
import { IntegrationAlerts } from "../contratos/IntegrationAlerts";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";

interface ItemDevolucao {
  id: string;
  nome: string;
  patrimonioOuSerie: string;
  quantidadeTotalContrato: number;
  quantidadeDevolver: number;
  selecionado: boolean;
  valorOriginal: number;
}

interface DevolucaoModalProps {
  contrato?: Contrato;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  itensSelecionados?: string[]; // Para devolução parcial específica
  tipo: 'TOTAL' | 'PARCIAL';
}

export default function DevolucaoModal({
  contrato,
  open,
  onOpenChange,
  onSuccess,
  itensSelecionados = [],
  tipo,
}: DevolucaoModalProps) {
  const [itensParaDevolucao, setItensParaDevolucao] = useState<ItemDevolucao[]>([]);
  const [dataDevolucao, setDataDevolucao] = useState('');
  const [horaDevolucao, setHoraDevolucao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [anexosMock, setAnexosMock] = useState<string[]>([]);
  const [acrescimoManual, setAcrescimoManual] = useState<number>(0);
  const [descontoManual, setDescontoManual] = useState<number>(0);
  const [justificativaFinanceira, setJustificativaFinanceira] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { syncFromStorage } = useContratosStore();
  const { devolverContrato } = useSupabaseContratos();

  // Inicializar data/hora atual
  useEffect(() => {
    if (open) {
      const agora = new Date();
      setDataDevolucao(agora.toISOString().split('T')[0]);
      setHoraDevolucao(agora.toTimeString().split(':').slice(0, 2).join(':'));
    }
  }, [open]);

  // Preparar itens para devolução
  useEffect(() => {
    if (contrato && open) {
      const itens = contrato.itens.map(item => ({
        id: item.id,
        nome: item.equipamento.nome,
        patrimonioOuSerie: `${item.equipamento.codigo} • ${item.equipamento.numeroSerie || 'SÉRIE: N/A'}`,
        quantidadeTotalContrato: item.quantidade,
        quantidadeDevolver: tipo === 'TOTAL' ? item.quantidade : 
          (itensSelecionados.includes(item.id) ? item.quantidade : 0),
        selecionado: tipo === 'TOTAL' || itensSelecionados.includes(item.id),
        valorOriginal: item.valorTotal,
      }));
      setItensParaDevolucao(itens);
    }
  }, [contrato, open, tipo, itensSelecionados]);

  const atualizarQuantidadeItem = (itemId: string, quantidade: number) => {
    setItensParaDevolucao(prev => prev.map(item =>
      item.id === itemId 
        ? { ...item, quantidadeDevolver: Math.max(0, Math.min(quantidade, item.quantidadeTotalContrato)) }
        : item
    ));
  };

  const toggleSelecaoItem = (itemId: string) => {
    setItensParaDevolucao(prev => prev.map(item =>
      item.id === itemId 
        ? { ...item, selecionado: !item.selecionado }
        : item
    ));
  };

  const adicionarAnexoMock = () => {
    const nomeArquivo = `foto_devolucao_${Date.now()}.jpg`;
    setAnexosMock(prev => [...prev, nomeArquivo]);
    toast({
      title: "Anexo simulado",
      description: `Arquivo "${nomeArquivo}" anexado (mock)`,
      duration: 1500
    });
  };

  const removerAnexo = (index: number) => {
    setAnexosMock(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Calcula valores financeiros da devolução.
   * 
   * REGRA: Por padrão, devolução dentro do período não gera créditos/cobranças.
   * O usuário pode lançar manualmente acréscimos (ex: danos) ou descontos (ex: devolução antecipada).
   * 
   * @returns {object} Objeto com:
   *   - valorOriginal: Valor do contrato (base)
   *   - valorEncerramento: Igual ao original (sem cálculo de diferença automática)
   *   - diferenca: acrescimoManual - descontoManual
   *   - acrescimo: Valor digitado pelo usuário
   *   - desconto: Valor digitado pelo usuário
   *   - totalFinal: valorOriginal + diferenca
   */
  const calcularValorDevolucao = () => {
    if (!contrato) return { 
      valorOriginal: 0, 
      valorEncerramento: 0, 
      diferenca: 0,
      acrescimo: 0,
      desconto: 0,
      totalFinal: 0
    };

    const itensSelecionadosParaDevolucao = itensParaDevolucao.filter(item => 
      item.selecionado && item.quantidadeDevolver > 0
    );

    let valorOriginalTotal = 0;

    itensSelecionadosParaDevolucao.forEach(itemDev => {
      const itemContrato = contrato.itens.find(i => i.id === itemDev.id);
      if (!itemContrato) return;

      // Valor original proporcional
      const valorOriginalProporcional = (itemContrato.valorTotal * itemDev.quantidadeDevolver) / itemContrato.quantidade;
      valorOriginalTotal += valorOriginalProporcional;
    });

    // Calcular total final com ajustes manuais
    const acrescimoTotal = acrescimoManual || 0;
    const descontoTotal = descontoManual || 0;
    const diferencaFinal = acrescimoTotal - descontoTotal;
    const totalFinal = valorOriginalTotal + diferencaFinal;

    return {
      valorOriginal: valorOriginalTotal,
      valorEncerramento: valorOriginalTotal, // Agora é igual ao original
      diferenca: diferencaFinal,
      acrescimo: acrescimoTotal,
      desconto: descontoTotal,
      totalFinal
    };
  };

  const handleSubmit = async () => {
    if (!contrato) return;

    const itensSelecionadosParaDevolucao = itensParaDevolucao.filter(item => 
      item.selecionado && item.quantidadeDevolver > 0
    );

    if (itensSelecionadosParaDevolucao.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um item para devolução",
        variant: "destructive"
      });
      return;
    }

    // Validação: Justificativa obrigatória quando houver ajuste
    const { diferenca } = calcularValorDevolucao();
    if (Math.abs(diferenca) > 0.01 && !justificativaFinanceira.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Informe o motivo do acréscimo ou desconto aplicado",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { valorOriginal, valorEncerramento, diferenca, acrescimo, desconto, totalFinal } = calcularValorDevolucao();

      // Preparar dados dos itens para devolução
      const itensDevolucao = itensSelecionadosParaDevolucao.map(itemDev => {
        const itemContrato = contrato.itens.find(i => i.id === itemDev.id);
        return {
          itemId: itemDev.id,
          equipamentoId: itemContrato?.equipamentoId,
          quantidade: itemDev.quantidadeDevolver
        };
      });

      // Chamar mutation do Supabase para processar devolução
      await devolverContrato.mutateAsync({
        contratoId: String(contrato.id),
        itensDevolucao,
        observacoes,
        dataDevolucao,
        horaDevolucao,
        tipo
      });

      // Gerar título se houver diferença financeira (ajuste manual)
      if (Math.abs(diferenca) > 0.01) {
        const numeroTitulo = generateNumber('titulo');
        
        // Determinar tipo e descrição baseado no ajuste manual
        let tipoTitulo: string;
        let descricaoTitulo: string;
        
        if (acrescimoManual > 0 && descontoManual === 0) {
          tipoTitulo = 'Acréscimo Manual - Devolução';
          descricaoTitulo = `Acréscimo de R$ ${acrescimoManual.toLocaleString('pt-BR')}`;
        } else if (descontoManual > 0 && acrescimoManual === 0) {
          tipoTitulo = 'Desconto Manual - Devolução';
          descricaoTitulo = `Desconto de R$ ${descontoManual.toLocaleString('pt-BR')}`;
        } else {
          // Quando há ambos (acréscimo e desconto)
          tipoTitulo = diferenca > 0 
            ? 'Acréscimo Líquido - Devolução' 
            : 'Desconto Líquido - Devolução';
          descricaoTitulo = `Acréscimo: R$ ${acrescimoManual.toLocaleString('pt-BR')} • Desconto: R$ ${descontoManual.toLocaleString('pt-BR')}`;
        }
        
        // Criar título no Supabase em vez de localStorage
        const { error: tituloError } = await supabase
          .from('titulos')
          .insert({
            numero: generateNumber('titulo'),
            contrato_id: String(contrato.id),
            cliente_id: contrato.clienteId,
            loja_id: contrato.lojaId || '',
            categoria: 'Locação',
            subcategoria: tipoTitulo,
            origem: 'CONTRATO',
            emissao: new Date().toISOString(),
            vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            valor: Math.abs(diferenca),
            pago: diferenca < 0 ? Math.abs(diferenca) : 0,
            saldo: diferenca > 0 ? diferenca : 0,
            forma: 'PIX',
            status: diferenca > 0 ? 'ABERTO' : 'QUITADO',
            observacoes: `${descricaoTitulo}\n\nJustificativa: ${justificativaFinanceira}\n\nDevolução confirmada em ${dataDevolucao} ${horaDevolucao}. ${observacoes}`,
            timeline: [{
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              tipo: 'criacao',
              descricao: `Título criado por devolução ${tipo.toLowerCase()}`,
              usuario: 'Sistema',
            }],
          });

        if (tituloError) {
          console.error('[DevolucaoModal] Erro ao criar título:', tituloError);
        }
      }

      // Publicar evento para manutenção (Amarela)
      window.dispatchEvent(new CustomEvent('contrato:devolucaoConfirmada', {
        detail: {
          contratoId: contrato.id,
          itens: itensSelecionadosParaDevolucao.map(item => ({
            equipamentoId: contrato.itens.find(i => i.id === item.id)?.equipamentoId,
            quantidade: item.quantidadeDevolver,
            observacoes
          })),
          dataDevolucao,
          horaDevolucao,
          anexos: anexosMock
        }
      }));

      // Emitir evento de integração para atualizar agenda
      const equipamentoIds = itensSelecionadosParaDevolucao.map(item => {
        const itemContrato = contrato.itens.find(i => i.id === item.id);
        return itemContrato?.equipamentoId || item.id;
      });

      import('@/utils/contract-integrations').then(({ emitItemReturn }) => {
        emitItemReturn(
          String(contrato.id),
          contrato.numero,
          contrato.lojaId || '1',
          equipamentoIds
        );
      });

      // Atualizar agenda de disponibilidade
      if (contrato.lojaId) {
        syncFromStorage();
      }

      toast({
        title: "Devolução confirmada",
        description: tipo === 'TOTAL' 
          ? 'Devolução total realizada! Equipamentos enviados para área Amarela (Manutenção).'
          : 'Devolução parcial realizada! Equipamentos enviados para área Amarela (Manutenção).',
        duration: 3000,
      });

      onSuccess?.();
      onOpenChange(false);

    } catch (error: any) {
      console.error('[DevolucaoModal] Erro ao processar devolução:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível confirmar a devolução.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const { valorOriginal, valorEncerramento, diferenca, acrescimo, desconto, totalFinal } = calcularValorDevolucao();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📦 Devolução {tipo === 'TOTAL' ? 'Total' : 'Parcial'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {contrato && (
            <>
              {/* Alertas de Integração */}
              <IntegrationAlerts
                contratoId={String(contrato.id)}
                contratoNumero={contrato.numero}
                lojaId={contrato.lojaId || '1'}
                equipamentoIds={itensSelecionados.map(id => {
                  const item = contrato.itens.find(i => i.id === id);
                  return item?.equipamentoId || id;
                })}
              />

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
                    <div>
                      <p className="font-medium">Vigência:</p>
                      <p>{new Date(contrato.dataInicio).toLocaleDateString('pt-BR')} - {new Date(contrato.dataFim).toLocaleDateString('pt-BR')}</p>
                    </div>
                      <div>
                        <p className="font-medium">Tipo de Devolução:</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tipo === 'TOTAL' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tipo === 'TOTAL' ? 'Total' : 'Parcial'}
                        </span>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataDevolucao">Data da Devolução *</Label>
              <Input
                id="dataDevolucao"
                type="date"
                value={dataDevolucao}
                onChange={(e) => setDataDevolucao(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="horaDevolucao">Hora da Devolução *</Label>
              <Input
                id="horaDevolucao"
                type="time"
                value={horaDevolucao}
                onChange={(e) => setHoraDevolucao(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Itens para Devolução</Label>
            <div className="mt-2 space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
              {itensParaDevolucao.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={item.selecionado}
                        onCheckedChange={() => toggleSelecaoItem(item.id)}
                        disabled={tipo === 'TOTAL'}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.nome}</h4>
                        <p className="text-sm text-muted-foreground">{item.patrimonioOuSerie}</p>
                        <p className="text-sm">Valor: R$ {item.valorOriginal.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantidadeTotalContrato}
                            value={item.quantidadeDevolver}
                            onChange={(e) => atualizarQuantidadeItem(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                            disabled={!item.selecionado}
                          />
                          <span className="text-sm text-muted-foreground">/ {item.quantidadeTotalContrato}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Observações sobre a devolução..."
            />
          </div>

          <div>
            <Label>Anexos (Mock)</Label>
            <div className="mt-2 space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={adicionarAnexoMock}
                className="w-full flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Adicionar Foto/Documento (Simulado)
              </Button>
              {anexosMock.length > 0 && (
                <div className="space-y-1">
                  {anexosMock.map((anexo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{anexo}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerAnexo(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <Card className="border-2 border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
              
              <div className="grid grid-cols-3 gap-6 mb-4">
                {/* Valor Original */}
                <div>
                  <Label className="text-sm text-slate-600">Valor Original</Label>
                  <div className="text-xl font-medium mt-1">
                    R$ {valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                {/* Valor Encerramento (sempre = Original) */}
                <div>
                  <Label className="text-sm text-slate-600">Valor Encerramento</Label>
                  <div className="text-xl font-medium mt-1">
                    R$ {valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                {/* Diferença (calculada com ajustes) */}
                <div>
                  <Label className="text-sm text-slate-600">Diferença</Label>
                  <div className={`text-xl font-bold mt-1 ${
                    diferenca > 0 ? 'text-red-600' : 
                    diferenca < 0 ? 'text-green-600' : 
                    'text-slate-900'
                  }`}>
                    {diferenca > 0 ? 'R$ ' : diferenca < 0 ? 'R$ -' : 'R$ '}
                    {Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              
              {/* Aviso abaixo */}
              {Math.abs(diferenca) > 0.01 && (
                <div className="text-sm text-slate-600 italic mb-4">
                  {diferenca > 0 
                    ? '⚠️ Será gerado título de acréscimo' 
                    : '✅ Será gerado título de desconto'}
                </div>
              )}

              {/* Campos de Acréscimo e Desconto */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {/* Acréscimo (editável) */}
                <div>
                  <Label htmlFor="acrescimo">Acréscimo (R$)</Label>
                  <Input
                    id="acrescimo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={acrescimoManual || ''}
                    onChange={(e) => setAcrescimoManual(parseFloat(e.target.value) || 0)}
                    className="text-right mt-1"
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Ex: danos, limpeza, etc.</p>
                </div>
                
                {/* Desconto (editável) */}
                <div>
                  <Label htmlFor="desconto">Desconto (R$)</Label>
                  <Input
                    id="desconto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={descontoManual || ''}
                    onChange={(e) => setDescontoManual(parseFloat(e.target.value) || 0)}
                    className="text-right mt-1"
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Ex: devolução antecipada</p>
                </div>
              </div>

              {/* Total Final */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="text-base font-medium">Total Final</div>
                <div className={`text-2xl font-bold ${
                  diferenca > 0 ? 'text-red-600' : 
                  diferenca < 0 ? 'text-green-600' : 
                  'text-foreground'
                }`}>
                  R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Justificativa (quando houver acréscimo ou desconto) */}
              {Math.abs(diferenca) > 0.01 && (
                <div className="mt-4">
                  <Label htmlFor="justificativa-financeira">
                    Justificativa do Ajuste <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="justificativa-financeira"
                    value={justificativaFinanceira}
                    onChange={(e) => setJustificativaFinanceira(e.target.value)}
                    placeholder="Justifique o motivo do acréscimo ou desconto..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Processando..." : "Confirmar Devolução"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}