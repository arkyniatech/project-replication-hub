import React, { useMemo, useState } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiunidade } from "@/hooks/useMultiunidade";

/**
 * Substituição de item do contrato (ticket #15).
 *
 * Versão Supabase — a anterior lia contratos do localStorage (contratoStorage),
 * nunca encontrava o contrato real e o modal não abria. Agora:
 *  - lista equipamentos DISPONÍVEIS do mesmo grupo na loja do contrato;
 *  - troca o equipamento do item (contrato_itens.equipamento_id);
 *  - equipamento retirado vai para MANUTENÇÃO (área amarela) — troca por defeito;
 *  - novo equipamento assume o status do item (LOCADO/RESERVADO);
 *  - opcionalmente gera tarefa de logística para levar o substituto.
 */

interface SubstituicaoModalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contrato?: any;
  itemId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SubstituicaoModal({
  contrato,
  itemId,
  open,
  onOpenChange,
  onSuccess
}: SubstituicaoModalProps) {
  const [busca, setBusca] = useState('');
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [solicitarLogistica, setSolicitarLogistica] = useState(false);
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemOriginal: any = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (contrato?.itens || []).find((i: any) => String(i.id) === String(itemId)) || null,
    [contrato, itemId]
  );

  const lojaId = contrato?.lojaId || lojaAtual?.id;

  // Equipamentos DISPONÍVEIS do mesmo grupo, na loja do contrato
  const { data: disponiveis = [], isLoading: carregandoLista } = useQuery({
    queryKey: ['equipamentos-substituicao', lojaId, itemOriginal?.grupoId, itemOriginal?.equipamentoId],
    enabled: open && !!lojaId && !!itemOriginal,
    queryFn: async () => {
      // Grupo do item: direto do contrato_itens ou herdado do equipamento original
      let grupoId = itemOriginal?.grupoId as string | null;
      if (!grupoId && itemOriginal?.equipamentoId) {
        const { data: equipOrig } = await supabase
          .from('equipamentos')
          .select('grupo_id')
          .eq('id', itemOriginal.equipamentoId)
          .maybeSingle();
        grupoId = equipOrig?.grupo_id || null;
      }
      if (!grupoId) return [];

      let query = supabase
        .from('equipamentos')
        .select('id, codigo_interno, numero_serie, status_global, modelos_equipamentos(nome_comercial), grupos_equipamentos(nome)')
        .eq('grupo_id', grupoId)
        .eq('status_global', 'DISPONIVEL')
        .eq('loja_atual_id', lojaId)
        .eq('ativo', true);

      if (itemOriginal?.equipamentoId) {
        query = query.neq('id', itemOriginal.equipamentoId);
      }

      const { data, error } = await query.order('codigo_interno');
      if (error) throw error;
      return data || [];
    },
  });

  const equipamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return disponiveis;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return disponiveis.filter((e: any) =>
      (e.codigo_interno || '').toLowerCase().includes(termo) ||
      (e.numero_serie || '').toLowerCase().includes(termo) ||
      (e.modelos_equipamentos?.nome_comercial || '').toLowerCase().includes(termo)
    );
  }, [disponiveis, busca]);

  const resetForm = () => {
    setEquipamentoSelecionado('');
    setObservacoes('');
    setSolicitarLogistica(false);
    setEnderecoEntrega('');
    setBusca('');
  };

  const handleConfirmar = async () => {
    if (!contrato || !itemOriginal || !equipamentoSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um equipamento para substituição",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const novoEquip: any = disponiveis.find((e: any) => e.id === equipamentoSelecionado);

      // 1. Trocar o equipamento do item (mantém preço e período)
      const { data: itemAtualizado, error: itemError } = await supabase
        .from('contrato_itens')
        .update({
          equipamento_id: equipamentoSelecionado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemOriginal.id)
        .select('id');
      if (itemError) throw itemError;
      if (!itemAtualizado?.length) {
        throw new Error('Não foi possível atualizar o item — verifique suas permissões e lojas vinculadas.');
      }

      // 2. Equipamento retirado → MANUTENÇÃO (troca por defeito)
      if (itemOriginal.equipamentoId) {
        const { error: origError } = await supabase
          .from('equipamentos')
          .update({ status_global: 'MANUTENCAO' })
          .eq('id', itemOriginal.equipamentoId);
        if (origError) console.error('[Substituicao] Erro ao mover original p/ manutenção:', origError);
      }

      // 3. Novo equipamento assume o status do item
      const statusNovo = itemOriginal.status === 'LOCADO' || itemOriginal.statusItem === 'LOCADO'
        ? 'LOCADO'
        : 'RESERVADO';
      const { error: novoError } = await supabase
        .from('equipamentos')
        .update({ status_global: statusNovo })
        .eq('id', equipamentoSelecionado);
      if (novoError) console.error('[Substituicao] Erro ao reservar novo equipamento:', novoError);

      // 4. Evento na timeline do contrato
      const nomeOriginal = itemOriginal.equipamento?.nome || itemOriginal.equipamento?.codigo || 'equipamento';
      const nomeNovo = novoEquip?.codigo_interno || novoEquip?.modelos_equipamentos?.nome_comercial || 'novo equipamento';
      const timeline = Array.isArray(contrato.timeline) ? contrato.timeline : [];
      await supabase
        .from('contratos')
        .update({
          timeline: [...timeline, {
            id: `evt-${Date.now()}`,
            ts: new Date().toISOString(),
            tipo: 'SUBSTITUICAO_REALIZADA',
            resumo: `Item substituído: ${nomeOriginal} → ${nomeNovo}`,
            meta: {
              itemId: itemOriginal.id,
              equipamentoOriginal: itemOriginal.equipamentoId,
              equipamentoNovo: equipamentoSelecionado,
              observacoes,
            },
          }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', contrato.id);

      // 5. Tarefa de logística (opcional)
      if (solicitarLogistica && enderecoEntrega.trim()) {
        const { error: tarefaError } = await supabase
          .from('logistica_tarefas')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({
            loja_id: lojaId,
            contrato_id: contrato.id,
            cliente_id: contrato.clienteId || null,
            tipo: 'ENTREGA',
            status: 'AGENDAR',
            prioridade: 'ALTA',
            previsto_iso: new Date().toISOString(),
            duracao_min: 60,
            endereco: { texto: enderecoEntrega.trim() },
            cliente_nome: contrato.cliente?.nomeRazao || 'Cliente',
            observacoes: `Substituição de equipamento: ${nomeOriginal} → ${nomeNovo}. ${observacoes}`.trim(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
        if (tarefaError) console.error('[Substituicao] Erro ao criar tarefa de logística:', tarefaError);
      }

      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-tarefas'] });

      toast({
        title: "Substituição realizada",
        description: `${nomeOriginal} → ${nomeNovo}. Equipamento retirado enviado para manutenção.${solicitarLogistica && enderecoEntrega.trim() ? ' Tarefa de logística criada.' : ''}`,
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro na substituição:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao realizar substituição",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!itemOriginal) return null;

  const itemSerializado = !!itemOriginal.equipamentoId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Substituir Item do Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Original */}
          <div>
            <Label className="text-sm font-medium">Item a ser substituído</Label>
            <Card className="mt-2">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      {itemOriginal.equipamento?.nome || itemOriginal.modelo?.nome || 'Item do Contrato'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Período: {itemOriginal.periodo} •
                      Valor: R$ {(itemOriginal.valorUnitario || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="secondary">Mantém preço e período</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {!itemSerializado ? (
            <div className="p-4 text-center text-muted-foreground border rounded-lg">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p>Este item é controlado por saldo (sem equipamento específico).</p>
              <p className="text-sm">Use Devolução Parcial + novo item para trocá-lo.</p>
            </div>
          ) : (
            <>
              {/* Busca */}
              <div>
                <Label htmlFor="busca">Buscar equipamentos do mesmo grupo</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="busca"
                    placeholder="Busque por código, série ou modelo..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Lista de Equipamentos */}
              <div>
                <Label>Equipamentos disponíveis ({equipamentosFiltrados.length})</Label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg">
                  {carregandoLista ? (
                    <div className="p-4 text-center text-muted-foreground">Carregando equipamentos...</div>
                  ) : equipamentosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                      <p>Nenhum equipamento do mesmo grupo disponível nesta loja</p>
                    </div>
                  ) : (
                    <RadioGroup value={equipamentoSelecionado} onValueChange={setEquipamentoSelecionado}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {equipamentosFiltrados.map((equip: any) => (
                        <div key={equip.id} className="flex items-center space-x-3 p-3 hover:bg-muted/20 rounded-lg">
                          <RadioGroupItem value={equip.id} id={equip.id} />
                          <label htmlFor={equip.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">
                                  {equip.codigo_interno}
                                  {equip.modelos_equipamentos?.nome_comercial ? ` — ${equip.modelos_equipamentos.nome_comercial}` : ''}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {equip.grupos_equipamentos?.nome || ''}
                                  {equip.numero_serie ? ` • Série: ${equip.numero_serie}` : ''}
                                </p>
                              </div>
                              <Badge className="bg-green-100 text-green-700">Disponível</Badge>
                            </div>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Motivo da substituição (defeito apresentado, instruções, etc.)"
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
                    Gerar tarefa de logística para levar o substituto e recolher o defeituoso
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!itemSerializado || !equipamentoSelecionado || loading}
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
    </Dialog>
  );
}
