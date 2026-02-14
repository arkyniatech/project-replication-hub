import { useState } from "react";
import { Percent, Calendar, DollarSign, Save, RotateCcw, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { usePoliticasStore, PoliticaID, WindowConfig } from "@/stores/politicasStore";
import { toast } from "sonner";

export function PoliticasComerciais() {
  const { getPolitica, updatePolitica, resetToDefaults } = usePoliticasStore();
  
  const [editedPoliticas, setEditedPoliticas] = useState({
    P0: getPolitica('P0'),
    P1: getPolitica('P1'),
    P2: getPolitica('P2'),
  });

  const handleSave = () => {
    try {
      // Validações
      Object.entries(editedPoliticas).forEach(([id, pol]) => {
        if (pol.descontoPct < 0 || pol.descontoPct > 100) {
          throw new Error(`Desconto da ${id} deve estar entre 0% e 100%`);
        }
        pol.faturamento.windows.forEach((w, idx) => {
          if (w.startDay < 1 || w.startDay > 31) {
            throw new Error(`${id} - Janela ${idx + 1}: startDay inválido`);
          }
          if (w.endDay < 1 || w.endDay > 31) {
            throw new Error(`${id} - Janela ${idx + 1}: endDay inválido`);
          }
          if (w.billDay < 1 || w.billDay > 31) {
            throw new Error(`${id} - Janela ${idx + 1}: billDay inválido`);
          }
          if (w.dueDay < 1 || w.dueDay > 31) {
            throw new Error(`${id} - Janela ${idx + 1}: dueDay inválido`);
          }
        });
      });

      // Salvar todas as políticas
      updatePolitica('P0', editedPoliticas.P0);
      updatePolitica('P1', editedPoliticas.P1);
      updatePolitica('P2', editedPoliticas.P2);

      toast.success("Políticas salvas", {
        description: "As políticas comerciais foram atualizadas com sucesso."
      });
    } catch (error: any) {
      toast.error("Erro ao salvar", {
        description: error.message || "Verifique os valores informados."
      });
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setEditedPoliticas({
      P0: getPolitica('P0'),
      P1: getPolitica('P1'),
      P2: getPolitica('P2'),
    });
    toast.info("Políticas restauradas", {
      description: "Valores padrão foram restaurados."
    });
  };

  const updateWindow = (
    polId: PoliticaID,
    windowIdx: number,
    field: keyof WindowConfig,
    value: number
  ) => {
    setEditedPoliticas(prev => ({
      ...prev,
      [polId]: {
        ...prev[polId],
        faturamento: {
          windows: prev[polId].faturamento.windows.map((w, idx) =>
            idx === windowIdx ? { ...w, [field]: value } : w
          )
        }
      }
    }));
  };

  const updateDesconto = (polId: PoliticaID, value: number) => {
    setEditedPoliticas(prev => ({
      ...prev,
      [polId]: {
        ...prev[polId],
        descontoPct: value
      }
    }));
  };

  const updateNome = (polId: PoliticaID, value: string) => {
    setEditedPoliticas(prev => ({
      ...prev,
      [polId]: {
        ...prev[polId],
        nome: value
      }
    }));
  };

  const renderPoliticaCard = (polId: PoliticaID) => {
    const pol = editedPoliticas[polId];

    return (
      <Card key={polId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Política {polId}
          </CardTitle>
          <CardDescription>
            Configure o desconto e as janelas de faturamento para esta política
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor={`${polId}-nome`}>Nome da Política</Label>
            <Input
              id={`${polId}-nome`}
              value={pol.nome}
              onChange={(e) => updateNome(polId, e.target.value)}
              placeholder="Ex: P0 — 5% + Faturamento agrupado"
            />
          </div>

          {/* Desconto */}
          <div className="space-y-2">
            <Label htmlFor={`${polId}-desconto`}>Desconto (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${polId}-desconto`}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pol.descontoPct}
                onChange={(e) => updateDesconto(polId, parseFloat(e.target.value) || 0)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                Aplicado automaticamente em todos os itens do contrato
              </span>
            </div>
          </div>

          <Separator />

          {/* Janelas de Faturamento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <Label className="text-base font-semibold">Janelas de Faturamento</Label>
            </div>

            {pol.faturamento.windows.map((window, idx) => (
              <div key={idx} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="text-sm font-medium text-foreground">
                  Janela {idx + 1}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Início (dia do mês)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={window.startDay}
                      onChange={(e) => updateWindow(polId, idx, 'startDay', parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Fim (dia do mês)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={window.endDay}
                      onChange={(e) => updateWindow(polId, idx, 'endDay', parseInt(e.target.value) || 30)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Emitir fatura (dia)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={window.billDay}
                      onChange={(e) => updateWindow(polId, idx, 'billDay', parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Shift mês emissão</Label>
                    <Input
                      type="number"
                      min="-1"
                      max="2"
                      value={window.billMonthShift}
                      onChange={(e) => updateWindow(polId, idx, 'billMonthShift', parseInt(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Vencimento (dia)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={window.dueDay}
                      onChange={(e) => updateWindow(polId, idx, 'dueDay', parseInt(e.target.value) || 10)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Shift mês venc.</Label>
                    <Input
                      type="number"
                      min="-1"
                      max="2"
                      value={window.dueMonthShift}
                      onChange={(e) => updateWindow(polId, idx, 'dueMonthShift', parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    Eventos entre <strong>{window.startDay}</strong> e <strong>{window.endDay}</strong>{' '}
                    → fatura dia <strong>{window.billDay}</strong>{' '}
                    {window.billMonthShift !== 0 && `(${window.billMonthShift > 0 ? '+' : ''}{window.billMonthShift} mês)`}{' '}
                    → vence dia <strong>{window.dueDay}</strong>{' '}
                    {window.dueMonthShift !== 0 && `(${window.dueMonthShift > 0 ? '+' : ''}{window.dueMonthShift} mês)`}
                  </AlertDescription>
                </Alert>
              </div>
            ))}
          </div>

          {/* Preview/Exemplo */}
          <Alert>
            <DollarSign className="w-4 h-4" />
            <AlertDescription className="text-sm">
              <strong>Exemplo:</strong> Contrato de R$ 10.000 com {pol.descontoPct}% de desconto
              = <strong>R$ {(10000 * (1 - pol.descontoPct / 100)).toFixed(2)}</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Políticas Comerciais
          </CardTitle>
          <CardDescription>
            Configure os descontos e regras de faturamento agrupado para cada política (P0, P1, P2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              As políticas são aplicadas automaticamente nos contratos quando configuradas no cadastro do cliente.
              Alterações aqui afetam apenas <strong>novos contratos</strong> e <strong>renovações</strong>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Políticas */}
      <div className="space-y-4">
        {renderPoliticaCard('P0')}
        {renderPoliticaCard('P1')}
        {renderPoliticaCard('P2')}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="text-sm text-muted-foreground">
          As alterações serão aplicadas imediatamente após salvar
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Políticas
          </Button>
        </div>
      </div>
    </div>
  );
}
