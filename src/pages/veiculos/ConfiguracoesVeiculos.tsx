import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, RotateCcw, Plus, Trash2, Info } from 'lucide-react';
import { useVeiculosConfigStore } from '@/stores/veiculosConfigStore';
import type { TipoVeiculo } from '@/types/veiculos';
import { useState } from 'react';
import { toast } from 'sonner';

const tiposVeiculos: { value: TipoVeiculo; label: string }[] = [
  { value: 'carro', label: 'Carro' },
  { value: 'moto', label: 'Moto' },
  { value: 'furgão', label: 'Furgão' },
  { value: 'caminhão', label: 'Caminhão' }
];

const categorias = [
  { value: 'PREVENTIVA', label: 'Preventiva' },
  { value: 'CORRETIVA', label: 'Corretiva' },
  { value: 'REVISAO', label: 'Revisão' }
];

export default function ConfiguracoesVeiculos() {
  const {
    config,
    updateMetaKmPorL,
    updateFaixaConsumo,
    updateKmAtipicoMin,
    updateAlertasOleo,
    addIntervaloServico,
    updateIntervaloServico,
    removeIntervaloServico,
    resetToDefaults
  } = useVeiculosConfigStore();

  const [novoIntervalo, setNovoIntervalo] = useState({
    nome: '',
    intervaloKm: 0,
    intervaloMeses: 0,
    categoria: 'PREVENTIVA' as const
  });

  const handleSalvarNovoIntervalo = () => {
    if (!novoIntervalo.nome || novoIntervalo.intervaloKm <= 0 || novoIntervalo.intervaloMeses <= 0) {
      toast.error('Preencha todos os campos do novo serviço');
      return;
    }

    addIntervaloServico(novoIntervalo);
    setNovoIntervalo({
      nome: '',
      intervaloKm: 0,
      intervaloMeses: 0,
      categoria: 'PREVENTIVA'
    });
    toast.success('Novo serviço adicionado');
  };

  const handleResetToDefaults = () => {
    if (confirm('Tem certeza que deseja restaurar todas as configurações padrão?')) {
      resetToDefaults();
      toast.success('Configurações restauradas para padrão');
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleResetToDefaults} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrões
          </Button>
        </div>

        {/* Metas de Consumo por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Metas de Consumo por Tipo
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Valores alvo utilizados nos rankings e comparações</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tiposVeiculos.map(({ value, label }) => {
              const meta = config.metasKmPorL.find(m => m.tipo === value)?.meta || 0;
              return (
                <div key={value} className="flex items-center gap-4">
                  <Label className="w-20 text-sm font-medium">{label}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={meta}
                    onChange={(e) => updateMetaKmPorL(value, Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">km/l</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Faixas de Consumo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Faixas de Consumo Aceitáveis
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Valores fora desta faixa geram flag "Consumo Fora da Faixa"</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tiposVeiculos.map(({ value, label }) => {
              const faixa = config.faixasConsumo.find(f => f.tipo === value);
              return (
                <div key={value} className="flex items-center gap-4">
                  <Label className="w-20 text-sm font-medium">{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={faixa?.min || 0}
                      onChange={(e) => updateFaixaConsumo(value, Number(e.target.value), faixa?.max || 0)}
                      className="w-20"
                      placeholder="Mín"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={faixa?.max || 0}
                      onChange={(e) => updateFaixaConsumo(value, faixa?.min || 0, Number(e.target.value))}
                      className="w-20"
                      placeholder="Máx"
                    />
                    <span className="text-sm text-muted-foreground">km/l</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Alertas Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas e Validações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="w-40 text-sm font-medium">KM Atípico (mínimo)</Label>
              <Input
                type="number"
                min="1"
                value={config.kmAtipicoMin}
                onChange={(e) => updateKmAtipicoMin(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">km</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abastecimentos com menos km geram flag "KM Atípico"</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Alertas de Troca de Óleo</Label>
              
              <div className="flex items-center gap-4">
                <Label className="w-40 text-sm">Margem por KM</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  value={config.alertasOleo.margemKm}
                  onChange={(e) => updateAlertasOleo({ margemKm: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  ({(config.alertasOleo.margemKm * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-40 text-sm">Margem por Prazo</Label>
                <Input
                  type="number"
                  min="1"
                  value={config.alertasOleo.margemPrazoDias}
                  onChange={(e) => updateAlertasOleo({ margemPrazoDias: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">dias antes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intervalos Padrão de Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Intervalos Padrão de Serviços</CardTitle>
            <p className="text-sm text-muted-foreground">
              Presets para facilitar a criação de ordens de serviço recorrentes
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de Intervalos Existentes */}
            <div className="space-y-3">
              {config.intervalosServicos.map(intervalo => (
                <div key={intervalo.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{intervalo.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      {intervalo.intervaloKm.toLocaleString()} km • {intervalo.intervaloMeses} meses
                    </div>
                  </div>
                  <Badge variant="secondary">{intervalo.categoria}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeIntervaloServico(intervalo.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Adicionar Novo Intervalo */}
            <div className="space-y-3 p-3 bg-muted/10 rounded-lg">
              <Label className="text-sm font-medium">Adicionar Novo Serviço</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Nome do serviço"
                  value={novoIntervalo.nome}
                  onChange={(e) => setNovoIntervalo(prev => ({ ...prev, nome: e.target.value }))}
                />
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="KM"
                    value={novoIntervalo.intervaloKm || ''}
                    onChange={(e) => setNovoIntervalo(prev => ({ ...prev, intervaloKm: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-muted-foreground">km</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Meses"
                    value={novoIntervalo.intervaloMeses || ''}
                    onChange={(e) => setNovoIntervalo(prev => ({ ...prev, intervaloMeses: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-muted-foreground">meses</span>
                </div>

                <Select
                  value={novoIntervalo.categoria}
                  onValueChange={(value: any) => setNovoIntervalo(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSalvarNovoIntervalo} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Serviço
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aviso */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Aplicação Imediata</p>
                <p className="text-amber-700">
                  Alterações nessas configurações afetam imediatamente os cálculos de flags, 
                  semáforos e rankings em todo o sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}