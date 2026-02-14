import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEquipamentosStore } from "@/stores/equipamentosStore";
import { contratoStorage } from "@/lib/storage";
import { Contrato, ItemContrato, OSLogistica } from "@/types";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { TaxaDeslocamentoModal } from "../contratos/TaxaDeslocamentoModal";
import { TaxaDeslocamentoService } from "@/services/taxaDeslocamentoService";
import { useTaxaDeslocamentoStore } from "@/stores/taxaDeslocamentoStore";
import { IntegrationAlerts } from "../contratos/IntegrationAlerts";

interface SubstituicaoModalProps {
  contratoId?: string;
  itemId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SubstituicaoModal({
  contratoId,
  itemId,
  open,
  onOpenChange,
  onSuccess
}: SubstituicaoModalProps) {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [itemOriginal, setItemOriginal] = useState<ItemContrato | null>(null);
  const [busca, setBusca] = useState('');
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string>('');
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  const [solicitarLogistica, setSolicitarLogistica] = useState(false);
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTaxaModal, setShowTaxaModal] = useState(false);
  const [taxaData, setTaxaData] = useState<{
    valor: number;
    motivo: 'NAO_ENTREGA' | 'SUBSTITUICAO';
  } | null>(null);
  
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  const taxaStore = useTaxaDeslocamentoStore();
  const { 
    equipamentos, 
    grupos, 
    modelos,
    alterarStatusEquipamento,
    addTimelineEvent 
  } = useEquipamentosStore();

  // Carregar dados do contrato e item
  useEffect(() => {
    if (open && contratoId && itemId) {
      const contratos = contratoStorage.getAll();
      const contratoEncontrado = contratos.find(c => String(c.id) === contratoId);
      
      if (contratoEncontrado) {
        setContrato(contratoEncontrado);
        const item = contratoEncontrado.itens.find(i => String(i.id) === itemId);
        if (item) {
          setItemOriginal(item);
          setQuantidade(item.quantidade || 1);
          setEnderecoEntrega('');
        }
      }
    }
  }, [open, contratoId, itemId]);

  // Filtrar equipamentos disponíveis do mesmo grupo
  const equipamentosDisponiveis = React.useMemo(() => {
    if (!itemOriginal || !lojaAtual) return [];

    // Encontrar o grupo do equipamento original
    const equipamentoOriginal = equipamentos.find(e => e.id === itemOriginal.equipamentoId);
    if (!equipamentoOriginal) return [];

    const modeloOriginal = modelos.find(m => m.id === equipamentoOriginal.modeloId);
    if (!modeloOriginal) return [];

    // Filtrar equipamentos do mesmo grupo, disponíveis na loja ativa
    return equipamentos.filter(equip => {
      const modelo = modelos.find(m => m.id === equip.modeloId);
      if (!modelo || modelo.grupoId !== modeloOriginal.grupoId) return false;

      // Verificar disponibilidade por tipo
      if (equip.tipo === 'SERIALIZADO') {
        return equip.lojaAtualId === lojaAtual.id && 
               equip.statusGlobal === 'DISPONIVEL' &&
               equip.id !== itemOriginal.equipamentoId; // Não incluir o próprio
      } else {
        const saldo = equip.saldosPorLoja[lojaAtual.id]?.qtd || 0;
        return saldo > 0 && equip.statusGlobal === 'DISPONIVEL';
      }
    }).filter(equip => {
      const modelo = modelos.find(m => m.id === equip.modeloId);
      const buscarText = busca.toLowerCase();
      return !buscarText || 
             equip.id.toLowerCase().includes(buscarText) ||
             modelo?.nomeComercial.toLowerCase().includes(buscarText);
    });
  }, [itemOriginal, equipamentos, modelos, lojaAtual, busca]);

  const equipamentoSelecionadoObj = equipamentosDisponiveis.find(e => e.id === equipamentoSelecionado);

  const handleConfirmar = async () => {
    if (!contrato || !itemOriginal || !equipamentoSelecionado || !equipamentoSelecionadoObj) {
      toast({
        title: "Erro",
        description: "Selecione um equipamento para substituição",
        variant: "destructive"
      });
      return;
    }

    if (equipamentoSelecionadoObj.tipo === 'SALDO' && quantidade <= 0) {
      toast({
        title: "Erro", 
        description: "Quantidade deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check if this is a "não entrega" scenario and taxa is active
      const isNaoEntrega = solicitarLogistica; // Simplified logic - generating OS means potential non-delivery
      const lojaId = lojaAtual?.id || contrato.lojaId;
      const isTaxaAtiva = TaxaDeslocamentoService.isAtivaNaLoja(lojaId);
      
      if (isNaoEntrega && isTaxaAtiva) {
        // Show taxa modal instead of completing immediately
        const valorPadrao = TaxaDeslocamentoService.getValorPadraoLoja(lojaId);
        setTaxaData({
          valor: valorPadrao,
          motivo: 'SUBSTITUICAO'
        });
        setShowTaxaModal(true);
        setLoading(false);
        return;
      }

      // Complete substitution without taxa
      await completeSubstituicao();
    } catch (error) {
      console.error('Erro na substituição:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao realizar substituição",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  const completeSubstituicao = async () => {
    if (!contrato || !itemOriginal || !equipamentoSelecionado || !equipamentoSelecionadoObj) return;

    try {
      const contratos = contratoStorage.getAll();
      const contratoIndex = contratos.findIndex(c => String(c.id) === String(contrato.id));
      
      if (contratoIndex === -1) {
        throw new Error('Contrato não encontrado');
      }

      const contratoAtualizado = { ...contratos[contratoIndex] };
      const itemIndex = contratoAtualizado.itens.findIndex(i => String(i.id) === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item não encontrado');
      }

      // Liberar equipamento original
      if (itemOriginal.equipamentoId) {
        alterarStatusEquipamento(itemOriginal.equipamentoId, 'DISPONIVEL');
        addTimelineEvent(itemOriginal.equipamentoId, {
          tipo: 'ALTERACAO_STATUS',
          descricao: `Liberado por substituição no contrato ${contrato.numero}`,
          usuario: 'Sistema'
        });
      }

      // Reservar novo equipamento
      alterarStatusEquipamento(equipamentoSelecionado, 'RESERVADO');
      addTimelineEvent(equipamentoSelecionado, {
        tipo: 'ALTERACAO_STATUS',
        descricao: `Reservado para substituição no contrato ${contrato.numero}`,
        usuario: 'Sistema'
      });

      // Atualizar item do contrato (manter preço do grupo e período original)
      const modeloNovo = modelos.find(m => m.id === equipamentoSelecionadoObj.modeloId);
      const novoItem: ItemContrato = {
        ...itemOriginal,
        equipamentoId: equipamentoSelecionado,
        quantidade: equipamentoSelecionadoObj.tipo === 'SALDO' ? quantidade : 1
      };

      contratoAtualizado.itens[itemIndex] = novoItem;

      // Salvar contrato atualizado
      contratos[contratoIndex] = contratoAtualizado;
      contratoStorage.save(contratos);

      // Registrar evento na timeline do contrato (mock)
      const equipamentoOriginalData = equipamentos.find(e => e.id === itemOriginal.equipamentoId);
      const modeloOriginal = modelos.find(m => m.id === equipamentoOriginalData?.modeloId);
      
      console.log('📋 Evento de substituição:', {
        contratoId: contrato.id,
        tipo: 'SUBSTITUICAO_REALIZADA',
        timestamp: new Date().toISOString(),
        usuario: 'Sistema',
        descricao: `Item substituído: ${modeloOriginal?.nomeComercial} → ${modeloNovo?.nomeComercial}`,
        dados: {
          equipamentoOriginal: itemOriginal.equipamentoId,
          equipamentoNovo: equipamentoSelecionado,
          quantidade: equipamentoSelecionadoObj.tipo === 'SALDO' ? quantidade : 1,
          observacoes
        }
      });

      // Gerar OS de logística se solicitado
      if (solicitarLogistica && enderecoEntrega) {        
        const osLogistica = {
          id: `OS_${Date.now()}`,
          contratoId: contrato.id,
          clienteId: contrato.clienteId,
          lojaId: contrato.lojaId,
          tipo: 'ENTREGA' as const,
          status: 'PLANEJADO' as const,
          endereco: enderecoEntrega,
          observacoes: `Substituição: ${modeloOriginal?.nomeComercial} → ${modeloNovo?.nomeComercial}. ${observacoes}`,
          criadoEm: new Date().toISOString(),
          criadoPor: 'Sistema'
        };

        console.log('🚚 OS de Substituição gerada:', osLogistica);
      }

      toast({
        title: "Substituição realizada",
        description: `Item substituído com sucesso${solicitarLogistica ? ' e OS de logística gerada' : ''}`,
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setEquipamentoSelecionado('');
      setQuantidade(1);
      setObservacoes('');
      setSolicitarLogistica(false);
      setBusca('');
      setShowTaxaModal(false);
      setTaxaData(null);

    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleTaxaSuccess = async (valor: number, justificativa?: string) => {
    if (!contrato) return;

    try {
      // Apply displacement fee
      await TaxaDeslocamentoService.aplicarTaxa({
        contratoId: String(contrato.id),
        valor: valor,
        justificativa: justificativa,
        motivo: 'SUBSTITUICAO',
        usuarioId: "1", // Mock user
        usuarioNome: "João Silva" // Mock user
      });

      toast({
        title: "Taxa aplicada",
        description: `Taxa de deslocamento de R$ ${valor.toFixed(2).replace('.', ',')} adicionada ao contrato`
      });

      // Complete the substitution
      await completeSubstituicao();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao aplicar taxa de deslocamento"
      });
      setLoading(false);
    }
  };

  if (!itemOriginal) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Substituir Item do Contrato
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* Alertas de Integração */}
          <IntegrationAlerts
            contratoId={String(contrato.id)}
            contratoNumero={contrato.numero}
            lojaId={contrato.lojaId || '1'}
            equipamentoIds={[itemOriginal.equipamentoId]}
            onSubstituicaoSugerida={(equipamentoId) => {
              toast({
                title: "Sugestão automatizada",
                description: `Equipamento ${equipamentoId} pode estar indisponível devido a processos em andamento.`,
              });
            }}
          />

          {/* Item Original */}
            <div>
              <Label className="text-sm font-medium">Item a ser substituído</Label>
              <Card className="mt-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{itemOriginal.equipamento?.descricao || 'Item do Contrato'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Período: {itemOriginal.periodo} • 
                        Valor: R$ {itemOriginal.valorUnitario?.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="secondary">Manter preço e período</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Busca */}
            <div>
              <Label htmlFor="busca">Buscar equipamentos do mesmo grupo</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="busca"
                  placeholder="Busque por código, descrição ou modelo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de Equipamentos */}
            <div>
              <Label>Equipamentos disponíveis ({equipamentosDisponiveis.length})</Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg">
                {equipamentosDisponiveis.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <p>Nenhum equipamento do mesmo grupo disponível</p>
                  </div>
                ) : (
                  <RadioGroup value={equipamentoSelecionado} onValueChange={setEquipamentoSelecionado}>
                    {equipamentosDisponiveis.map((equip) => {
                      const modelo = modelos.find(m => m.id === equip.modeloId);
                      const saldo = equip.tipo === 'SALDO' ? (equip.saldosPorLoja[lojaAtual?.id || '']?.qtd || 0) : 1;
                      const serie = Array.isArray(equip.numeroSerie) ? equip.numeroSerie[0] : equip.numeroSerie;
                      
                      return (
                        <div key={equip.id} className="flex items-center space-x-3 p-3 hover:bg-muted/20 rounded-lg">
                          <RadioGroupItem value={equip.id} id={equip.id} />
                          <label htmlFor={equip.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{equip.id} - {modelo?.nomeComercial}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {modelo?.nomeComercial} • Tipo: {equip.tipo === 'SERIALIZADO' ? 'Serializado' : 'Saldo'}
                                  {serie && ` • Série: ${serie}`}
                                  {equip.tipo === 'SALDO' && ` • Disponível: ${saldo}`}
                                </p>
                              </div>
                              <Badge className="bg-green-100 text-green-700">
                                Disponível
                              </Badge>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>
            </div>

            {/* Quantidade (apenas para SALDO) */}
            {equipamentoSelecionadoObj?.tipo === 'SALDO' && (
              <div>
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  max={equipamentoSelecionadoObj.saldosPorLoja[lojaAtual?.id || '']?.qtd || 1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  className="mt-2"
                />
              </div>
            )}

            {/* Observações */}
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Motivo da substituição, instruções especiais, etc..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Logística */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="logistica"
                  checked={solicitarLogistica}
                  onCheckedChange={(checked) => setSolicitarLogistica(!!checked)}
                />
                <label htmlFor="logistica" className="text-sm font-medium cursor-pointer">
                  Gerar OS de logística para entrega/retirada
                </label>
              </div>

              {solicitarLogistica && (
                <div>
                  <Label htmlFor="endereco">Endereço de entrega/retirada</Label>
                  <Textarea
                    id="endereco"
                    placeholder="Endereço completo para a operação..."
                    value={enderecoEntrega}
                    onChange={(e) => setEnderecoEntrega(e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={!equipamentoSelecionado || loading}
              className="gap-2"
            >
              {loading ? (
                <>Processando...</>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Confirmar Substituição
                </>
              )}
            </Button>
          </DialogFooter>
      </DialogContent>

      {/* Taxa de Deslocamento Modal */}
      {taxaData && (
        <TaxaDeslocamentoModal
          open={showTaxaModal}
          onOpenChange={setShowTaxaModal}
          valorPadrao={taxaData.valor}
          contratoId={String(contrato?.id)}
          motivo={taxaData.motivo}
          onSuccess={handleTaxaSuccess}
        />
      )}
    </Dialog>
    </>
  );
}