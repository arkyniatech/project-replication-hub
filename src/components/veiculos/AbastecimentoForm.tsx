import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { useVeiculosConfigStore } from '@/stores/veiculosConfigStore';

const abastecimentoSchema = z.object({
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  posto_id: z.string().min(1, 'Posto é obrigatório'),
  preco_litro: z.number().min(0.01, 'Preço por litro deve ser maior que 0'),
  litros: z.number().min(0.01, 'Quantidade de litros deve ser maior que 0'),
  km_atual: z.number().min(0, 'KM atual deve ser maior ou igual a 0'),
});

type AbastecimentoFormData = z.infer<typeof abastecimentoSchema>;

interface AbastecimentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoIdProp?: string;
  onSuccess: () => void;
}

export function AbastecimentoForm({ open, onOpenChange, veiculoIdProp, onSuccess }: AbastecimentoFormProps) {
  const { 
    veiculos, 
    postos, 
    addAbastecimento,
    calcularConsumo,
    getAbastecimentosByVeiculo
  } = useVeiculosStore();

  const configStore = useVeiculosConfigStore();

  const form = useForm<AbastecimentoFormData>({
    resolver: zodResolver(abastecimentoSchema),
    defaultValues: {
      veiculo_id: veiculoIdProp || '',
      data: format(new Date(), 'yyyy-MM-dd'),
      posto_id: '',
      preco_litro: 0,
      litros: 0,
      km_atual: 0,
    },
  });

  const veiculoSelecionado = form.watch('veiculo_id');
  const kmAtual = form.watch('km_atual');
  const litros = form.watch('litros');

  useEffect(() => {
    if (open) {
      const veiculo = veiculoIdProp ? veiculos.find(v => v.id === veiculoIdProp) : null;
      form.reset({
        veiculo_id: veiculoIdProp || '',
        data: format(new Date(), 'yyyy-MM-dd'),
        posto_id: '',
        preco_litro: 0,
        litros: 0,
        km_atual: veiculo?.odometro_atual || 0,
      });
    }
  }, [open, veiculoIdProp, veiculos, form]);

  // Calcular preview de consumo em tempo real
  const previewConsumo = veiculoSelecionado && kmAtual && litros
    ? calcularConsumo(veiculoSelecionado, kmAtual, litros)
    : null;

  const validateKmNaoRegressivo = (kmAtual: number, veiculoId: string): boolean => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    return !veiculo || kmAtual >= veiculo.odometro_atual;
  };

  const onSubmit = (data: AbastecimentoFormData) => {
    if (!validateKmNaoRegressivo(data.km_atual, data.veiculo_id)) {
      toast.error('KM atual não pode ser menor que o odômetro atual do veículo');
      return;
    }

    try {
      addAbastecimento({
        veiculo_id: data.veiculo_id,
        data: data.data,
        posto_id: data.posto_id,
        preco_litro: data.preco_litro,
        litros: data.litros,
        km_atual: data.km_atual,
      });

      toast.success('Abastecimento registrado com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao registrar abastecimento');
    }
  };

  // Último abastecimento do veículo selecionado
  const ultimoAbastecimento = veiculoSelecionado 
    ? getAbastecimentosByVeiculo(veiculoSelecionado)[0]
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>Registrar Abastecimento</DrawerTitle>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="veiculo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veículo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o veículo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {veiculos.filter(v => v.status === 'OPERANDO').map((veiculo) => (
                          <SelectItem key={veiculo.id} value={veiculo.id}>
                            {veiculo.placa} - {veiculo.fabricante} {veiculo.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="posto_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posto *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o posto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {postos.map((posto) => (
                          <SelectItem key={posto.id} value={posto.id}>
                            {posto.nome} - {posto.cidade}/{posto.uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Atual *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="litros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Litros *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_litro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço por Litro (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preview de Consumo */}
            {previewConsumo && (
              <div className="space-y-4">
                <h4 className="font-medium">Preview de Consumo</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">KM Percorrido</div>
                    <div className="text-xl font-semibold">
                      {previewConsumo.km_percorrido.toLocaleString()} km
                    </div>
                  </div>
                  
                  {previewConsumo.km_por_l > 0 && (
                    <>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Consumo</div>
                        <div className="text-xl font-semibold flex items-center gap-1">
                          {previewConsumo.km_por_l.toFixed(2)} km/l
                          {ultimoAbastecimento && ultimoAbastecimento.km_por_l > 0 && (
                            <>
                              {previewConsumo.km_por_l > ultimoAbastecimento.km_por_l ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Custo Total</div>
                        <div className="text-xl font-semibold">
                          R$ {(form.watch('preco_litro') * form.watch('litros')).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Flags de Alerta */}
                {previewConsumo.flags.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Atenção:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {previewConsumo.flags.map((flag, index) => (
                          <li key={index}>
                            {flag === 'consumo_atipico' && 'Consumo fora da faixa normal para este tipo de veículo'}
                            {flag === 'km_atipico' && 'KM percorrido muito baixo para a quantidade abastecida'}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Comparação com último abastecimento */}
                {ultimoAbastecimento && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium mb-2">Último Abastecimento</div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Data:</span>
                        <div>{format(new Date(ultimoAbastecimento.data), 'dd/MM/yyyy')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Consumo:</span>
                        <div>{ultimoAbastecimento.km_por_l.toFixed(2)} km/l</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">KM:</span>
                        <div>{ultimoAbastecimento.km_atual.toLocaleString()} km</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DrawerFooter className="px-0">
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Registrar Abastecimento
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              </div>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}