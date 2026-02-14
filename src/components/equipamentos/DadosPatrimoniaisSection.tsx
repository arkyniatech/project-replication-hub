import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/equipamentos-utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown } from "lucide-react";

interface DadosPatrimoniaisSectionProps {
  anoFabricacao?: number;
  dataAquisicao?: string;
  valorAquisicao?: number;
  vidaUtilMeses?: number;
  condicao?: string;
  onChange: (field: string, value: any) => void;
}

export function DadosPatrimoniaisSection({
  anoFabricacao,
  dataAquisicao,
  valorAquisicao,
  vidaUtilMeses = 60,
  condicao = 'BOM',
  onChange,
}: DadosPatrimoniaisSectionProps) {
  // Calcular depreciação estimada
  const calcularDepreciacao = () => {
    if (!valorAquisicao || !vidaUtilMeses || !dataAquisicao) return null;
    
    const hoje = new Date();
    const dataAq = new Date(dataAquisicao);
    const mesesUso = Math.floor((hoje.getTime() - dataAq.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const depreciacaoMensal = valorAquisicao / vidaUtilMeses;
    const valorResidual = Math.max(0, valorAquisicao - (depreciacaoMensal * mesesUso));
    
    return {
      mesesUso,
      depreciacaoMensal,
      valorResidual,
      percentualDepreciado: Math.min(100, (mesesUso / vidaUtilMeses) * 100)
    };
  };

  const depreciacao = calcularDepreciacao();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Patrimoniais</CardTitle>
        <CardDescription>
          Informações de aquisição e depreciação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ano_fabricacao">Ano de Fabricação</Label>
            <Input
              id="ano_fabricacao"
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              placeholder="Ex: 2023"
              value={anoFabricacao || ''}
              onChange={(e) => onChange('ano_fabricacao', e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_aquisicao">Data de Aquisição</Label>
            <Input
              id="data_aquisicao"
              type="date"
              value={dataAquisicao || ''}
              onChange={(e) => onChange('data_aquisicao', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_aquisicao">Valor de Aquisição</Label>
            <Input
              id="valor_aquisicao"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valorAquisicao || ''}
              onChange={(e) => onChange('valor_aquisicao', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vida_util_meses">Vida Útil (meses)</Label>
            <Input
              id="vida_util_meses"
              type="number"
              min="1"
              placeholder="Ex: 60"
              value={vidaUtilMeses || ''}
              onChange={(e) => onChange('vida_util_meses', e.target.value ? parseInt(e.target.value) : 60)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condicao">Condição Atual</Label>
            <Select value={condicao} onValueChange={(v) => onChange('condicao', v)}>
              <SelectTrigger id="condicao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOVO">Novo</SelectItem>
                <SelectItem value="BOM">Bom</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="RUIM">Ruim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {depreciacao && (
          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Análise de Depreciação</h4>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Meses de Uso</p>
                <p className="text-sm font-medium">{depreciacao.mesesUso} / {vidaUtilMeses}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depreciação Mensal</p>
                <p className="text-sm font-medium">{formatMoney(depreciacao.depreciacaoMensal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Residual Estimado</p>
                <p className="text-sm font-medium text-primary">{formatMoney(depreciacao.valorResidual)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depreciado</p>
                <p className="text-sm font-medium">{depreciacao.percentualDepreciado.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
