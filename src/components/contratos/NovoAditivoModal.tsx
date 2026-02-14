import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Contrato, AditivoContratual, EventoTimeline, Titulo } from "@/types";
import { generateNumber } from "@/lib/numeracao";
import { useSupabaseAditivos } from "@/hooks/useSupabaseAditivos";

interface NovoAditivoModalProps {
  contrato: Contrato;
  aditivo?: AditivoContratual | null; // Para edição
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NovoAditivoModal({
  contrato,
  aditivo,
  open,
  onOpenChange,
  onSuccess
}: NovoAditivoModalProps) {
  const [tipo, setTipo] = useState<string>('TAXA');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number>(0);
  const [justificativa, setJustificativa] = useState('');
  const [vinculacao, setVinculacao] = useState<'CONTRATO' | 'ITEM'>('CONTRATO');
  const [itemId, setItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { createAditivo, updateAditivo } = useSupabaseAditivos(String(contrato?.id));
  const isEdicao = !!aditivo;

  // Preencher form para edição
  useEffect(() => {
    if (aditivo && open) {
      setTipo(aditivo.tipo);
      setDescricao(aditivo.descricao);
      setValor(aditivo.valor);
      setJustificativa(aditivo.justificativa);
      setVinculacao(aditivo.vinculacao);
      setItemId(aditivo.itemId || '');
    } else if (open) {
      // Reset form para novo aditivo
      setTipo('TAXA');
      setDescricao('');
      setValor(0);
      setJustificativa('');
      setVinculacao('CONTRATO');
      setItemId('');
    }
  }, [aditivo, open]);

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'RENOVACAO': 'Renovação',
      'DESCONTO': 'Desconto',
      'TAXA': 'Taxa',
      'AJUSTE': 'Ajuste',
      'OUTRO': 'Outro'
    };
    return labels[tipo] || tipo;
  };

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      toast({
        title: "Erro",
        description: "Descrição é obrigatória",
        variant: "destructive"
      });
      return;
    }

    if (!justificativa.trim()) {
      toast({
        title: "Erro",
        description: "Justificativa é obrigatória",
        variant: "destructive"
      });
      return;
    }

    if (valor === 0) {
      toast({
        title: "Erro",
        description: "Valor deve ser diferente de zero",
        variant: "destructive"
      });
      return;
    }

    if (vinculacao === 'ITEM' && !itemId) {
      toast({
        title: "Erro",
        description: "Selecione um item para vinculação",
        variant: "destructive"
      });
      return;
    }

    if (contrato.status === 'ENCERRADO' && !isEdicao) {
      toast({
        title: "Erro",
        description: "Não é possível criar aditivos em contratos encerrados",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const aditivoData = {
        contrato_id: contrato.id,
        loja_id: contrato.lojaId,
        numero: aditivo?.numero || `ADT-${Date.now()}`,
        tipo,
        descricao,
        justificativa,
        valor: valor,
        vinculacao,
        item_id: vinculacao === 'ITEM' ? itemId : null,
        status: 'ATIVO',
        criado_por: null,
      };

      if (isEdicao && aditivo) {
        await updateAditivo.mutateAsync({ id: aditivo.id, ...aditivoData });
      } else {
        await createAditivo.mutateAsync(aditivoData);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar aditivo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoDescricao = (tipo: string) => {
    const descricoes: Record<string, string> = {
      'RENOVACAO': 'Prorrogação de prazo ou alteração de período',
      'DESCONTO': 'Redução de valor por negociação ou cortesia',
      'TAXA': 'Cobrança adicional (ex.: deslocamento, multa)',
      'AJUSTE': 'Ajuste de valores ou condições',
      'OUTRO': 'Outros tipos de alteração contratual'
    };
    return descricoes[tipo] || 'Alteração contratual';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isEdicao ? 'Editar Aditivo' : 'Novo Aditivo Contratual'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Contrato */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Contrato {contrato.numero}</h3>
                  <p className="text-sm text-muted-foreground">
                    {contrato.cliente?.nomeRazao || contrato.cliente?.nome || 'Cliente'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{contrato.status}</p>
                </div>
              </div>
              {contrato.status === 'ENCERRADO' && !isEdicao && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Contrato Encerrado</p>
                      <p className="text-sm text-yellow-700">
                        Aditivos em contratos encerrados só se aplicam a ajustes financeiros retroativos.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tipo de Aditivo */}
          <div>
            <Label className="text-sm font-medium">Tipo de Aditivo</Label>
            <div className="mt-2 space-y-3">
              <RadioGroup value={tipo} onValueChange={(value) => setTipo(value)}>
                {(['RENOVACAO', 'DESCONTO', 'TAXA', 'AJUSTE', 'OUTRO']).map((tipoOption) => (
                  <div key={tipoOption} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/20">
                    <RadioGroupItem value={tipoOption} id={tipoOption} className="mt-1" />
                    <label htmlFor={tipoOption} className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">{getTipoLabel(tipoOption)}</p>
                        <p className="text-sm text-muted-foreground">{getTipoDescricao(tipoOption)}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              placeholder="Ex: Taxa de deslocamento por não entrega"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Valor */}
          <div>
            <Label htmlFor="valor">Valor * (use valor negativo para descontos)</Label>
            <div className="relative mt-2">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Valores positivos geram título a receber. Valores negativos são descontos.
            </p>
          </div>

          {/* Vinculação */}
          <div>
            <Label className="text-sm font-medium">Vinculação</Label>
            <div className="mt-2 space-y-3">
              <RadioGroup value={vinculacao} onValueChange={(value) => setVinculacao(value as 'CONTRATO' | 'ITEM')}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="CONTRATO" id="contrato" />
                  <label htmlFor="contrato" className="cursor-pointer">
                    Contrato inteiro
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="ITEM" id="item" />
                  <label htmlFor="item" className="cursor-pointer">
                    Item específico
                  </label>
                </div>
              </RadioGroup>

              {vinculacao === 'ITEM' && (
                <div className="ml-6">
                  <Label htmlFor="itemId">Selecionar Item</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Escolha um item do contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contrato.itens?.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.equipamento?.nome || `Item ${item.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Justificativa */}
          <div>
            <Label htmlFor="justificativa">Justificativa *</Label>
            <Textarea
              id="justificativa"
              placeholder="Descreva o motivo deste aditivo..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Preview do Título (se valor > 0) */}
          {valor > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Título a Receber</p>
                    <p className="text-sm text-blue-700">
                      Um título no valor de R$ {valor.toLocaleString('pt-BR')} será gerado automaticamente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
            onClick={handleSalvar}
            disabled={loading}
            className="gap-2"
          >
            {loading ? 'Salvando...' : (isEdicao ? 'Salvar Alterações' : 'Criar Aditivo')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}