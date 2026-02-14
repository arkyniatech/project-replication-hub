import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Minus, AlertCircle } from "lucide-react";
import { useSupabaseTransferencias } from "@/hooks/useSupabaseTransferencias";
import { useSupabaseLojas } from "@/modules/rh/hooks/useSupabaseLojas";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { toast } from "sonner";

type TransferItem = {
  id: string;
  tipo: 'SERIAL' | 'SALDO';
  codigoInterno?: string;
  modeloId: string;
  grupoId: string;
  descricao: string;
  serie?: string;
  quantidade: number;
};

interface NovaTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaTransferenciaModal({ open, onOpenChange }: NovaTransferenciaModalProps) {
  const { lojaAtual } = useMultiunidade();
  const lojaAtiva = lojaAtual?.id || '';
  const { criarTransferencia } = useSupabaseTransferencias(lojaAtiva);
  
  const { lojas = [] } = useSupabaseLojas();
  const { equipamentos = [], isLoading: isLoadingEquipamentos } = useSupabaseEquipamentos(lojaAtiva);
  const { grupos = [], isLoading: isLoadingGrupos } = useSupabaseGrupos();
  const { modelos = [], isLoading: isLoadingModelos } = useSupabaseModelos();
  
  const [destinoLojaId, setDestinoLojaId] = useState("");
  const [motorista, setMotorista] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [itensSelecionados, setItensSelecionados] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);

  const lojasDisponiveis = lojas.filter(l => l.id !== lojaAtiva && l.ativo);
  
  // Filtrar equipamentos SERIAL disponíveis  
  const equipamentosDisponiveis = equipamentos.filter(eq => 
    eq.loja_atual_id === lojaAtiva && 
    eq.status_global === 'DISPONIVEL' &&
    eq.tipo === 'SERIAL' && // Apenas SERIAL
    (searchText === '' || 
     eq.codigo_interno?.toLowerCase().includes(searchText.toLowerCase()) ||
     eq.numero_serie?.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Filtrar modelos com saldo disponível (tipo SALDO)
  const modelosDisponiveis = modelos.filter(modelo => {
    // Verificar se tem saldo disponível
    const equipSaldo = equipamentos.find(eq => 
      eq.modelo_id === modelo.id && 
      eq.loja_atual_id === lojaAtiva && 
      eq.status_global === 'DISPONIVEL' &&
      eq.tipo === 'SALDO'
    );
    
    const saldoDisponivel = equipSaldo?.saldos_por_loja?.[lojaAtiva]?.qtd || 0;
    if (saldoDisponivel === 0) return false;

    // Filtrar por texto de busca
    if (searchText === '') return true; // Mostrar todos com saldo se não houver busca
    const grupo = grupos.find(g => g.id === modelo.grupo_id);
    return modelo.nome_comercial.toLowerCase().includes(searchText.toLowerCase()) ||
           grupo?.nome.toLowerCase().includes(searchText.toLowerCase());
  }).slice(0, 10); // Limitar resultados

  const resetForm = () => {
    setDestinoLojaId("");
    setMotorista("");
    setVeiculo("");
    setObservacoes("");
    setSearchText("");
    setItensSelecionados([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const adicionarItemSerial = (equipamento: any) => {
    if (itensSelecionados.some(item => item.codigoInterno === equipamento.codigo_interno)) {
      toast.error("Item já adicionado");
      return;
    }

    const modelo = modelos.find(m => m.id === equipamento.modelo_id);
    const grupo = grupos.find(g => g.id === equipamento.grupo_id);
    
    if (!modelo || !grupo) return;

    const novoItem: TransferItem = {
      id: crypto.randomUUID(),
      tipo: 'SERIAL',
      codigoInterno: equipamento.codigo_interno,
      modeloId: modelo.id,
      grupoId: grupo.id,
      descricao: modelo.nome_comercial,
      serie: equipamento.numero_serie,
      quantidade: 1
    };

    setItensSelecionados(prev => [...prev, novoItem]);
    setSearchText("");
  };

  const adicionarItemSaldo = (modelo: any, quantidade: number) => {
    if (quantidade <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    // Verificar saldo disponível para equipamentos SALDO
    const equipSaldo = equipamentos.find(eq => 
      eq.modelo_id === modelo.id && 
      eq.loja_atual_id === lojaAtiva && 
      eq.status_global === 'DISPONIVEL' &&
      eq.tipo === 'SALDO'
    );

    const saldoDisponivel = equipSaldo?.saldos_por_loja?.[lojaAtiva]?.qtd || 0;

    if (quantidade > saldoDisponivel) {
      toast.error(`Saldo insuficiente. Disponível: ${saldoDisponivel}`);
      return;
    }

    // Verificar se já existe item do mesmo modelo
    const itemExistente = itensSelecionados.find(item => 
      item.modeloId === modelo.id && item.tipo === 'SALDO'
    );

    const grupo = grupos.find(g => g.id === modelo.grupo_id);
    if (!grupo) return;

    if (itemExistente) {
      // Atualizar quantidade
      const novaQuantidade = itemExistente.quantidade + quantidade;
      if (novaQuantidade > saldoDisponivel) {
        toast.error(`Quantidade total excede o saldo disponível: ${saldoDisponivel}`);
        return;
      }
      
      setItensSelecionados(prev => 
        prev.map(item => 
          item.id === itemExistente.id 
            ? { ...item, quantidade: novaQuantidade }
            : item
        )
      );
    } else {
      // Criar novo item
      const novoItem: TransferItem = {
        id: crypto.randomUUID(),
        tipo: 'SALDO',
        modeloId: modelo.id,
        grupoId: grupo.id,
        descricao: modelo.nome_comercial,
        quantidade
      };

      setItensSelecionados(prev => [...prev, novoItem]);
    }
    
    setSearchText("");
  };

  const removerItem = (id: string) => {
    setItensSelecionados(prev => prev.filter(item => item.id !== id));
  };

  const alterarQuantidade = (id: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerItem(id);
      return;
    }

    const item = itensSelecionados.find(i => i.id === id);
    if (!item) return;

    // Verificar saldo para itens SALDO
    if (item.tipo === 'SALDO') {
      const equipSaldo = equipamentos.find(eq => 
        eq.modelo_id === item.modeloId && 
        eq.loja_atual_id === lojaAtiva && 
        eq.status_global === 'DISPONIVEL' &&
        eq.tipo === 'SALDO'
      );
      
      const saldoDisponivel = equipSaldo?.saldos_por_loja?.[lojaAtiva]?.qtd || 0;

      if (novaQuantidade > saldoDisponivel) {
        toast.error(`Quantidade excede o saldo disponível: ${saldoDisponivel}`);
        return;
      }
    }

    setItensSelecionados(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantidade: novaQuantidade }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!destinoLojaId) {
      toast.error("Selecione a loja destino");
      return;
    }

    if (itensSelecionados.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setLoading(true);
    try {
      // Gerar número sequencial simples
      const numeroSequencial = Date.now() % 100000; // simplificado para mock
      
      await criarTransferencia.mutateAsync({
        transferencia: {
          origem_loja_id: lojaAtiva,
          destino_loja_id: destinoLojaId,
          numero: numeroSequencial,
          motorista: motorista || null,
          veiculo: veiculo || null,
          observacoes: observacoes || null,
          status: 'EM_TRANSITO',
          created_by: '', // Will be set by the hook
        },
        itens: itensSelecionados.map(item => ({
          tipo: item.tipo,
          codigo_interno: item.codigoInterno || null,
          modelo_id: item.modeloId,
          grupo_id: item.grupoId,
          descricao: item.descricao,
          serie: item.serie || null,
          quantidade: item.quantidade,
          transferencia_id: '', // Will be set by the hook
        })),
      });
      
      handleClose();
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Transferência</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="destino">Loja Destino *</Label>
              <Select value={destinoLojaId} onValueChange={setDestinoLojaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja destino" />
                </SelectTrigger>
                <SelectContent>
                  {lojasDisponiveis.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motorista">Motorista</Label>
              <Input
                id="motorista"
                value={motorista}
                onChange={(e) => setMotorista(e.target.value)}
                placeholder="Nome do motorista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="veiculo">Veículo</Label>
              <Input
                id="veiculo"
                value={veiculo}
                onChange={(e) => setVeiculo(e.target.value)}
                placeholder="Placa ou identificação"
              />
            </div>
          </div>

          {/* Seleção de itens */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar Equipamentos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Digite código interno, modelo ou grupo..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Resultados da busca */}
            {searchText && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {/* Equipamentos serializados */}
                {equipamentosDisponiveis.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Equipamentos (Individuais)</h4>
                    <div className="space-y-1">
                      {equipamentosDisponiveis.slice(0, 10).map(equipamento => (
                        <Card key={equipamento.id} className="cursor-pointer hover:bg-muted/50" 
                              onClick={() => adicionarItemSerial(equipamento)}>
                           <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{equipamento.codigo_interno}</Badge>
                            <span className="font-medium">{modelos.find(m => m.id === equipamento.modelo_id)?.nome_comercial || 'Equipamento'}</span>
                          </div>
                          {equipamento.numero_serie && (
                            <p className="text-sm text-muted-foreground">
                              Série: {equipamento.numero_serie}
                            </p>
                          )}
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modelos (SALDO) */}
                {modelosDisponiveis.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Modelos (Por Quantidade)</h4>
                    <div className="space-y-1">
                      {modelosDisponiveis.map(modelo => {
                        const equipSaldo = equipamentos.find(eq => 
                          eq.modelo_id === modelo.id && 
                          eq.loja_atual_id === lojaAtiva && 
                          eq.status_global === 'DISPONIVEL' &&
                          eq.tipo === 'SALDO'
                        );
                        
                        const saldoDisponivel = equipSaldo?.saldos_por_loja?.[lojaAtiva]?.qtd || 0;

                        if (saldoDisponivel === 0) return null;

                        return (
                          <Card key={modelo.id} className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{modelo.nome_comercial}</span>
                                  <Badge variant="secondary">
                                    Disponível: {saldoDisponivel}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {grupos.find(g => g.id === modelo.grupo_id)?.nome}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max={saldoDisponivel}
                                  placeholder="Qtd"
                                  className="w-20"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const quantidade = parseInt((e.target as HTMLInputElement).value);
                                      if (quantidade > 0) {
                                        adicionarItemSaldo(modelo, quantidade);
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    const input = document.querySelector(`input[placeholder="Qtd"]`) as HTMLInputElement;
                                    const quantidade = parseInt(input?.value || '1');
                                    if (quantidade > 0) {
                                      adicionarItemSaldo(modelo, quantidade);
                                      if (input) input.value = '';
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {searchText && equipamentosDisponiveis.length === 0 && modelosDisponiveis.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    Nenhum equipamento encontrado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Itens selecionados */}
          {itensSelecionados.length > 0 && (
            <div className="space-y-2">
              <Label>Itens Selecionados ({itensSelecionados.length})</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {itensSelecionados.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.tipo === 'SERIAL' ? 'default' : 'secondary'}>
                            {item.tipo}
                          </Badge>
                          <span className="font-medium">
                            {item.codigoInterno || item.descricao}
                          </span>
                          {item.serie && (
                            <span className="text-sm text-muted-foreground">
                              (Série: {item.serie})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {item.tipo === 'SALDO' && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantidade}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !destinoLojaId || itensSelecionados.length === 0}
            >
              {loading ? "Criando..." : "Criar Transferência"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}