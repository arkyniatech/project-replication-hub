import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemContratoBadges } from "./ItemContratoBadges";
import { useToast } from "@/hooks/use-toast";
import { Package, Calendar, Hash } from "lucide-react";

// Exemplo de uso do sistema de disponibilidade em tempo real
export function ExemploUsoDisponibilidade() {
  const [equipamentoId, setEquipamentoId] = useState('');
  const [modeloId, setModeloId] = useState('');
  const [tipoControle, setTipoControle] = useState<'SERIALIZADO' | 'SALDO'>('SERIALIZADO');
  const [quantidade, setQuantidade] = useState(1);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const { toast } = useToast();

  // Mock data para demonstração
  const equipamentosDisponiveis = [
    { id: 'BET001', nome: 'Betoneira 400L - Série BET001', tipo: 'SERIE' },
    { id: 'BET002', nome: 'Betoneira 400L - Série BET002', tipo: 'SERIE' },
    { id: 'SALDO-001', nome: 'Ferramentas Diversas', tipo: 'SALDO' }
  ];

  const modelosDisponiveis = [
    { id: 'modelo-001', nome: 'Betoneira 400L' },
    { id: 'modelo-002', nome: 'Ferramentas Diversas' }
  ];

  const handleConflictoResolvido = (resolucao: 'ignorar' | 'alternativa' | 'cancelar', dados?: any) => {
    switch (resolucao) {
      case 'ignorar':
        toast({
          title: "Conflito ignorado",
          description: "O item será adicionado mesmo com conflitos"
        });
        break;
      case 'alternativa':
        toast({
          title: "Alternativa selecionada",
          description: `Usando alternativa: ${JSON.stringify(dados)}`
        });
        if (dados?.tipo === 'quantidade') {
          setQuantidade(dados.valor);
        }
        break;
      case 'cancelar':
        toast({
          title: "Operação cancelada",
          description: "Item não será adicionado devido aos conflitos"
        });
        break;
    }
  };

  const resetForm = () => {
    setEquipamentoId('');
    setModeloId('');
    setQuantidade(1);
    setDataInicio('');
    setDataFim('');
  };

  const isFormValid = () => {
    if (tipoControle === 'SERIALIZADO') {
      return equipamentoId && dataInicio && dataFim;
    }
    return modeloId && quantidade > 0 && dataInicio && dataFim;
  };

  const getEquipamentoNome = () => {
    if (tipoControle === 'SERIALIZADO' && equipamentoId) {
      return equipamentosDisponiveis.find(e => e.id === equipamentoId)?.nome || equipamentoId;
    }
    if (tipoControle === 'SALDO' && modeloId) {
      return modelosDisponiveis.find(m => m.id === modeloId)?.nome || modeloId;
    }
    return 'Equipamento';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Teste de Disponibilidade em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Controle */}
          <div className="space-y-2">
            <Label>Tipo de Controle</Label>
            <Select value={tipoControle} onValueChange={(value: 'SERIALIZADO' | 'SALDO') => {
              setTipoControle(value);
              resetForm();
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SERIALIZADO">Por Série (Equipamento Específico)</SelectItem>
                <SelectItem value="SALDO">Por Saldo (Quantidade do Modelo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Equipamento/Modelo */}
          {tipoControle === 'SERIALIZADO' ? (
            <div className="space-y-2">
              <Label>Equipamento (Série)</Label>
              <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentosDisponiveis
                    .filter(e => e.tipo === 'SERIALIZADO')
                    .map(equip => (
                      <SelectItem key={equip.id} value={equip.id}>
                        {equip.nome}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={modeloId} onValueChange={setModeloId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelosDisponiveis.map(modelo => (
                      <SelectItem key={modelo.id} value={modelo.id}>
                        {modelo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                />
              </div>
            </>
          )}

          {/* Período */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          {/* Verificação de Disponibilidade */}
          {isFormValid() && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Status de Disponibilidade</h3>
                  <p className="text-sm text-muted-foreground">
                    {getEquipamentoNome()} • {new Date(dataInicio).toLocaleDateString('pt-BR')} - {new Date(dataFim).toLocaleDateString('pt-BR')}
                    {tipoControle === 'SALDO' && ` • ${quantidade} unidade${quantidade > 1 ? 's' : ''}`}
                  </p>
                </div>
                <ItemContratoBadges
                  equipamentoId={tipoControle === 'SERIALIZADO' ? equipamentoId : undefined}
                  modeloId={tipoControle === 'SALDO' ? modeloId : undefined}
                  tipoControle={tipoControle}
                  quantidade={quantidade}
                  periodo={{
                    inicio: new Date(dataInicio).toISOString(),
                    fim: new Date(dataFim).toISOString()
                  }}
                  equipamentoNome={getEquipamentoNome()}
                  onConflictoResolvido={handleConflictoResolvido}
                />
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={resetForm} variant="outline">
              Limpar
            </Button>
            <Button disabled={!isFormValid()}>
              Adicionar ao Contrato
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre o Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 text-blue-500" />
            <div>
              <strong>Verificação em Tempo Real:</strong> O sistema verifica automaticamente conflitos como reservas ativas, equipamentos em manutenção, transferências em trânsito e bloqueios de contagem.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 mt-0.5 text-green-500" />
            <div>
              <strong>Tipos de Conflito:</strong> Reservas (outros contratos), Manutenção (equipamento indisponível), Transferências (em trânsito), Contagem Cega (bloqueado para ajuste), Equipamento Locado.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Hash className="w-4 h-4 mt-0.5 text-orange-500" />
            <div>
              <strong>Resolução de Conflitos:</strong> Modal com alternativas (outros períodos, quantidades menores, equipamentos similares) ou opção de forçar mesmo com conflitos (para administradores).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}