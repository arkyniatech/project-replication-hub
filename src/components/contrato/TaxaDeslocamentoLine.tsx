import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Trash2, AlertTriangle } from "lucide-react";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { TaxaDeslocamentoConfig } from "@/types";
import { JustificativaModal } from "@/components/logistica/JustificativaModal";

interface TaxaDeslocamentoLineProps {
  value: {
    aplicar: boolean;
    valor: number;
    justificativa?: string;
  };
  onChange: (value: {
    aplicar: boolean;
    valor: number;
    justificativa?: string;
  }) => void;
}

export function TaxaDeslocamentoLine({ value, onChange }: TaxaDeslocamentoLineProps) {
  const { lojaAtual } = useMultiunidade();
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [pendingChange, setPendingChange] = useState<'valor' | 'remover' | null>(null);
  const [pendingValue, setPendingValue] = useState(0);

  // Buscar configuração da taxa da loja atual
  const getTaxaConfig = (): TaxaDeslocamentoConfig => {
    try {
      const config = localStorage.getItem('erp-config');
      if (config) {
        const parsedConfig = JSON.parse(config);
        const lojaConfig = parsedConfig.logisticaPorLoja?.[lojaAtual?.id || ''];
        return lojaConfig?.taxaDeslocamento || {
          ativo: true,
          valorPadrao: 50,
          obrigarJustificativaQuandoDiferir: true,
          permitirExclusao: true,
          textoDescricaoPadrao: "Taxa de deslocamento – não entrega"
        };
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de taxa:', error);
    }
    
    return {
      ativo: true,
      valorPadrao: 50,
      obrigarJustificativaQuandoDiferir: true,
      permitirExclusao: true,
      textoDescricaoPadrao: "Taxa de deslocamento – não entrega"
    };
  };

  const taxaConfig = getTaxaConfig();
  const valorDifere = value.valor !== taxaConfig.valorPadrao;
  const precisaJustificativa = taxaConfig.obrigarJustificativaQuandoDiferir;

  const handleAplicarChange = (aplicar: boolean) => {
    if (!aplicar && precisaJustificativa) {
      setPendingChange('remover');
      setShowJustificativa(true);
    } else {
      onChange({
        ...value,
        aplicar,
        valor: aplicar ? (value.valor || taxaConfig.valorPadrao) : 0
      });
    }
  };

  const handleValorChange = (novoValor: number) => {
    const valorDiferente = novoValor !== taxaConfig.valorPadrao;
    
    if (valorDiferente && precisaJustificativa && !value.justificativa) {
      setPendingChange('valor');
      setPendingValue(novoValor);
      setShowJustificativa(true);
    } else {
      onChange({
        ...value,
        valor: novoValor
      });
    }
  };

  const handleJustificativaSalva = (texto: string) => {
    if (pendingChange === 'valor') {
      onChange({
        ...value,
        valor: pendingValue,
        justificativa: texto
      });
    } else if (pendingChange === 'remover') {
      onChange({
        ...value,
        aplicar: false,
        justificativa: texto
      });
    }
    
    setPendingChange(null);
    setPendingValue(0);
    setShowJustificativa(false);
  };

  const handleJustificativaClose = () => {
    setPendingChange(null);
    setPendingValue(0);
    setShowJustificativa(false);
  };

  if (!taxaConfig.ativo) {
    return null;
  }

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <Checkbox
              checked={value.aplicar}
              onCheckedChange={handleAplicarChange}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <Label className="font-medium">Taxa de Deslocamento</Label>
                <Badge variant="secondary" className="text-xs">
                  Padrão: R$ {taxaConfig.valorPadrao.toFixed(2)}
                </Badge>
              </div>

              {value.aplicar && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={value.valor}
                        onChange={(e) => handleValorChange(Number(e.target.value))}
                        className="pl-8"
                      />
                    </div>

                    {taxaConfig.permitirExclusao && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAplicarChange(false)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {valorDifere && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Valor alterado
                      </Badge>
                    )}
                    {value.justificativa && (
                      <Badge variant="secondary" className="text-xs">
                        Com justificativa
                      </Badge>
                    )}
                  </div>

                  {value.justificativa && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>Justificativa:</strong> {value.justificativa}
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {taxaConfig.textoDescricaoPadrao}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <JustificativaModal
        open={showJustificativa}
        onClose={handleJustificativaClose}
        onSave={handleJustificativaSalva}
        title="Justificativa Obrigatória"
        subtitle={
          pendingChange === 'valor' 
            ? "O valor difere do padrão da loja. Informe o motivo:"
            : "Você está removendo a taxa de deslocamento. Informe o motivo:"
        }
        placeholder={
          pendingChange === 'valor'
            ? "Digite o motivo da alteração do valor padrão..."
            : "Digite o motivo da remoção da taxa..."
        }
      />
    </>
  );
}