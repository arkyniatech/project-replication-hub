import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { TaxaDeslocamentoConfig } from "@/types";
import { JustificativaModal } from "./JustificativaModal";

interface TaxaDeslocamentoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (valor: number, justificativa?: string) => void;
  contratoNumero?: string;
}

export function TaxaDeslocamentoModal({ 
  open, 
  onClose, 
  onConfirm, 
  contratoNumero 
}: TaxaDeslocamentoModalProps) {
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
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
  const [valor, setValor] = useState(taxaConfig.valorPadrao);
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [justificativaTexto, setJustificativaTexto] = useState("");

  const valorDifere = valor !== taxaConfig.valorPadrao;
  const precisaJustificativa = valorDifere && taxaConfig.obrigarJustificativaQuandoDiferir;

  const handleConfirmar = () => {
    if (precisaJustificativa && !justificativaTexto.trim()) {
      setShowJustificativa(true);
      return;
    }

    onConfirm(valor, justificativaTexto.trim() || undefined);
    onClose();
    
    toast({
      title: "Taxa de deslocamento aplicada",
      description: `Valor: R$ ${valor.toFixed(2)}${justificativaTexto ? ' (com justificativa)' : ''}`
    });
  };

  const handlePular = () => {
    onClose();
    toast({
      title: "Taxa de deslocamento não aplicada"
    });
  };

  const handleJustificativaSalva = (texto: string) => {
    setJustificativaTexto(texto);
    setShowJustificativa(false);
    handleConfirmar();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Taxa de Deslocamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contrato:</span>
                    <Badge variant="outline">{contratoNumero || 'N/A'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Loja:</span>
                    <span className="text-sm font-medium">{lojaAtual?.nome || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor da Taxa</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(Number(e.target.value))}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Padrão da loja: R$ {taxaConfig.valorPadrao.toFixed(2)}
                </Badge>
                {valorDifere && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Valor alterado
                  </Badge>
                )}
              </div>
            </div>

            {precisaJustificativa && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Valor diferente do padrão requer justificativa.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handlePular}
                className="flex-1"
              >
                Pular Cobrança
              </Button>
              <Button 
                onClick={handleConfirmar}
                className="flex-1"
              >
                Confirmar Cobrança
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <JustificativaModal
        open={showJustificativa}
        onClose={() => setShowJustificativa(false)}
        onSave={handleJustificativaSalva}
        title="Justificativa Obrigatória"
        subtitle="O valor difere do padrão da loja. Informe o motivo:"
        placeholder="Digite o motivo da alteração do valor padrão..."
      />
    </>
  );
}