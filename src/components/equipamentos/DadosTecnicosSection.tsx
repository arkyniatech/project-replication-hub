import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DadosTecnicosSectionProps {
  potencia?: string;
  tensao?: string;
  pesoKg?: number;
  dimensoesCm?: string;
  capacidade?: string;
  combustivel?: string;
  onChange: (field: string, value: any) => void;
}

export function DadosTecnicosSection({
  potencia,
  tensao,
  pesoKg,
  dimensoesCm,
  capacidade,
  combustivel,
  onChange,
}: DadosTecnicosSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Técnicos</CardTitle>
        <CardDescription>
          Especificações técnicas do equipamento
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="potencia">Potência</Label>
          <Input
            id="potencia"
            placeholder="Ex: 1500W, 3HP, 5kVA"
            value={potencia || ''}
            onChange={(e) => onChange('potencia', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tensao">Tensão</Label>
          <Select value={tensao || ''} onValueChange={(v) => onChange('tensao', v)}>
            <SelectTrigger id="tensao">
              <SelectValue placeholder="Selecione a tensão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="110V">110V</SelectItem>
              <SelectItem value="220V">220V</SelectItem>
              <SelectItem value="380V">380V (Trifásico)</SelectItem>
              <SelectItem value="BATERIA">Bateria</SelectItem>
              <SelectItem value="NAO_APLICA">Não se aplica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="peso_kg">Peso (kg)</Label>
          <Input
            id="peso_kg"
            type="number"
            step="0.01"
            placeholder="Ex: 350.5"
            value={pesoKg || ''}
            onChange={(e) => onChange('peso_kg', e.target.value ? parseFloat(e.target.value) : null)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dimensoes_cm">Dimensões (LxAxP em cm)</Label>
          <Input
            id="dimensoes_cm"
            placeholder="Ex: 150x80x120"
            value={dimensoesCm || ''}
            onChange={(e) => onChange('dimensoes_cm', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacidade">Capacidade / Alcance</Label>
          <Input
            id="capacidade"
            placeholder="Ex: 12m, 500kg, 3m³"
            value={capacidade || ''}
            onChange={(e) => onChange('capacidade', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="combustivel">Tipo de Combustível</Label>
          <Select value={combustivel || ''} onValueChange={(v) => onChange('combustivel', v)}>
            <SelectTrigger id="combustivel">
              <SelectValue placeholder="Selecione o combustível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ELETRICO">Elétrico</SelectItem>
              <SelectItem value="GASOLINA">Gasolina</SelectItem>
              <SelectItem value="DIESEL">Diesel</SelectItem>
              <SelectItem value="GNV">GNV</SelectItem>
              <SelectItem value="HIBRIDO">Híbrido</SelectItem>
              <SelectItem value="BATERIA">Bateria</SelectItem>
              <SelectItem value="NAO_APLICA">Não se aplica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
