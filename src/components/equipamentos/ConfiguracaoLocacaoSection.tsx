import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/equipamentos-utils";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfiguracaoLocacaoSectionProps {
  caucaoPadrao?: number;
  waiverProtecaoPercent?: number;
  taxaLimpezaPadrao?: number;
  tempoPaddingHoras?: number;
  toleranciaAtrasoHoras?: number;
  multaDiariaAtraso?: number;
  politicaCancelamento?: string;
  onChange: (field: string, value: any) => void;
}

export function ConfiguracaoLocacaoSection({
  caucaoPadrao = 0,
  waiverProtecaoPercent = 0,
  taxaLimpezaPadrao = 0,
  tempoPaddingHoras = 3,
  toleranciaAtrasoHoras = 1,
  multaDiariaAtraso = 0,
  politicaCancelamento,
  onChange,
}: ConfiguracaoLocacaoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Locação Avançada</CardTitle>
        <CardDescription>
          Valores padrão, proteções e políticas para este modelo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Valores Cobrados */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            💰 Valores e Proteções
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="caucao_padrao" className="flex items-center gap-2">
                Caução Padrão
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Valor retido como garantia durante a locação
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="caucao_padrao"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={caucaoPadrao || ''}
                onChange={(e) => onChange('caucao_padrao', e.target.value ? parseFloat(e.target.value) : 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waiver_protecao_percent" className="flex items-center gap-2">
                Waiver de Proteção (%)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Percentual opcional sobre o valor da locação para cobertura de danos
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="waiver_protecao_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={waiverProtecaoPercent || ''}
                onChange={(e) => onChange('waiver_protecao_percent', e.target.value ? parseFloat(e.target.value) : 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxa_limpeza_padrao">Taxa de Limpeza</Label>
              <Input
                id="taxa_limpeza_padrao"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={taxaLimpezaPadrao || ''}
                onChange={(e) => onChange('taxa_limpeza_padrao', e.target.value ? parseFloat(e.target.value) : 0)}
              />
            </div>
          </div>
        </div>

        {/* Tempos e Tolerâncias */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            ⏱️ Tempos e Tolerâncias
          </h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tempo_padding_horas" className="flex items-center gap-2">
                Tempo de Preparação (h)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Horas necessárias para preparar o equipamento antes da entrega
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="tempo_padding_horas"
                type="number"
                min="0"
                placeholder="3"
                value={tempoPaddingHoras || ''}
                onChange={(e) => onChange('tempo_padding_horas', e.target.value ? parseInt(e.target.value) : 3)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerancia_atraso_horas">Tolerância Atraso (h)</Label>
              <Input
                id="tolerancia_atraso_horas"
                type="number"
                min="0"
                placeholder="1"
                value={toleranciaAtrasoHoras || ''}
                onChange={(e) => onChange('tolerancia_atraso_horas', e.target.value ? parseInt(e.target.value) : 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="multa_diaria_atraso">Multa Diária Atraso</Label>
              <Input
                id="multa_diaria_atraso"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={multaDiariaAtraso || ''}
                onChange={(e) => onChange('multa_diaria_atraso', e.target.value ? parseFloat(e.target.value) : 0)}
              />
            </div>
          </div>
        </div>

        {/* Política de Cancelamento */}
        <div className="space-y-2">
          <Label htmlFor="politica_cancelamento" className="flex items-center gap-2">
            📋 Política de Cancelamento
          </Label>
          <Textarea
            id="politica_cancelamento"
            placeholder="Ex: Cancelamento gratuito até 48h antes. Entre 48h-24h: 50% do valor. Menos de 24h: 100% do valor."
            value={politicaCancelamento || ''}
            onChange={(e) => onChange('politica_cancelamento', e.target.value)}
            rows={3}
          />
        </div>

        {/* Resumo Visual */}
        {(caucaoPadrao > 0 || waiverProtecaoPercent > 0 || taxaLimpezaPadrao > 0) && (
          <div className="mt-4 rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-medium mb-2">💡 Resumo de Cobranças Adicionais</p>
            <div className="flex flex-wrap gap-2">
              {caucaoPadrao > 0 && (
                <span className="text-xs bg-background px-2 py-1 rounded">
                  Caução: {formatMoney(caucaoPadrao)}
                </span>
              )}
              {waiverProtecaoPercent > 0 && (
                <span className="text-xs bg-background px-2 py-1 rounded">
                  Waiver: {waiverProtecaoPercent}%
                </span>
              )}
              {taxaLimpezaPadrao > 0 && (
                <span className="text-xs bg-background px-2 py-1 rounded">
                  Limpeza: {formatMoney(taxaLimpezaPadrao)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
