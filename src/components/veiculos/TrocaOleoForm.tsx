import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gauge } from 'lucide-react';
import { useVeiculosStore } from '@/stores/veiculosStore';

const trocaOleoSchema = z.object({
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  oleo_id: z.string().min(1, 'Tipo de óleo é obrigatório'),
  trocou_filtro: z.boolean(),
  trocou_filtro_combustivel: z.boolean(),
  custo_total: z.number().min(0, 'Custo deve ser maior ou igual a 0'),
  km_atual: z.number().min(0, 'KM atual deve ser maior ou igual a 0'),
});

type TrocaOleoFormData = z.infer<typeof trocaOleoSchema>;

interface TrocaOleoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoIdProp?: string;
  onSuccess: () => void;
}

export function TrocaOleoForm({ open, onOpenChange, veiculoIdProp, onSuccess }: TrocaOleoFormProps) {
  const { 
    veiculos, 
    oleos, 
    addTrocaOleo,
    getTrocasOleoByVeiculo,
    getVeiculoOleoAtual,
    getProximaTrocaOleo
  } = useVeiculosStore();

  const form = useForm<TrocaOleoFormData>({
    resolver: zodResolver(trocaOleoSchema),
    defaultValues: {
      veiculo_id: veiculoIdProp || '',
      data: format(new Date(), 'yyyy-MM-dd'),
      oleo_id: '',
      trocou_filtro: false,
      trocou_filtro_combustivel: false,
      custo_total: 0,
      km_atual: 0,
    },
  });

  const veiculoSelecionado = form.watch('veiculo_id');
  const oleoSelecionado = form.watch('oleo_id');

  useEffect(() => {
    if (open) {
      const veiculo = veiculoIdProp ? veiculos.find(v => v.id === veiculoIdProp) : null;
      const oleoAtual = veiculoIdProp ? getVeiculoOleoAtual(veiculoIdProp) : null;
      
      form.reset({
        veiculo_id: veiculoIdProp || '',
        data: format(new Date(), 'yyyy-MM-dd'),
        oleo_id: oleoAtual?.id || '',
        trocou_filtro: false,
        trocou_filtro_combustivel: false,
        custo_total: 0,
        km_atual: veiculo?.odometro_atual || 0,
      });
    }
  }, [open, veiculoIdProp, veiculos, getVeiculoOleoAtual, form]);

  // Informações da última troca
  const ultimaTroca = veiculoSelecionado 
    ? getTrocasOleoByVeiculo(veiculoSelecionado)[0]
    : null;

  // Próxima troca prevista
  const proximaTroca = veiculoSelecionado 
    ? getProximaTrocaOleo(veiculoSelecionado)
    : null;

  // Óleo atual configurado no veículo
  const oleoAtual = veiculoSelecionado 
    ? getVeiculoOleoAtual(veiculoSelecionado)
    : null;

  // Cálculo de KM desde última troca
  const kmDesdeUltima = ultimaTroca && form.watch('km_atual')
    ? form.watch('km_atual') - ultimaTroca.km_atual
    : form.watch('km_atual');

  const validateKmNaoRegressivo = (kmAtual: number, veiculoId: string): boolean => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    return !veiculo || kmAtual >= veiculo.odometro_atual;
  };

  const onSubmit = (data: TrocaOleoFormData) => {
    if (!validateKmNaoRegressivo(data.km_atual, data.veiculo_id)) {
      toast.error('KM atual não pode ser menor que o odômetro atual do veículo');
      return;
    }

    try {
      addTrocaOleo({
        veiculo_id: data.veiculo_id,
        data: data.data,
        oleo_id: data.oleo_id,
        trocou_filtro: data.trocou_filtro,
        trocou_filtro_combustivel: data.trocou_filtro_combustivel,
        custo_total: data.custo_total,
        km_atual: data.km_atual,
      });

      toast.success('Troca de óleo registrada com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao registrar troca de óleo');
    }
  };

  const oleoSelecionadoInfo = oleoSelecionado 
    ? oleos.find(o => o.id === oleoSelecionado)
    : null;

  // Calcular próxima troca baseada no óleo selecionado
  const calcularProximaTroca = () => {
    if (!oleoSelecionadoInfo || !form.watch('km_atual') || !form.watch('data')) return null;

    const proximoKm = form.watch('km_atual') + oleoSelecionadoInfo.intervalo_km;
    const proximaDataObj = addMonths(new Date(form.watch('data')), oleoSelecionadoInfo.intervalo_meses);
    const proximaData = format(proximaDataObj, 'dd/MM/yyyy');

    return { proximoKm, proximaData };
  };

  const proximaTrocaCalculada = calcularProximaTroca();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Registrar Troca de Óleo</DrawerTitle>
        </DrawerHeader>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Informações da última troca */}
          {ultimaTroca && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Última Troca</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <div className="font-medium">{format(new Date(ultimaTroca.data), 'dd/MM/yyyy')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KM:</span>
                    <div className="font-medium">{ultimaTroca.km_atual.toLocaleString()} km</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KM desde última:</span>
                    <div className="font-medium">{kmDesdeUltima.toLocaleString()} km</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Custo:</span>
                    <div className="font-medium">R$ {ultimaTroca.custo_total.toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alertas de manutenção */}
          {proximaTroca && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Próxima Troca Prevista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Por KM:</span>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {proximaTroca.proximoKm.toLocaleString()} km
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Por Data:</span>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {format(new Date(proximaTroca.proximaData), 'dd/MM/yyyy')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          {veiculos.map((veiculo) => (
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
                      <FormLabel>Data da Troca *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oleo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Óleo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o óleo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {oleos.map((oleo) => (
                            <SelectItem key={oleo.id} value={oleo.id}>
                              {oleo.tipo_especificacao} ({oleo.intervalo_km}km / {oleo.intervalo_meses}m)
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
                  name="custo_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo Total (R$) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Checkboxes para filtros */}
              <div className="space-y-4">
                <h4 className="font-medium">Serviços Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trocou_filtro"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Trocou Filtro de Óleo</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trocou_filtro_combustivel"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Trocou Filtro de Combustível</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Preview da próxima troca */}
              {proximaTrocaCalculada && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">Próxima Troca Calculada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Por KM:</span>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          {proximaTrocaCalculada.proximoKm.toLocaleString()} km
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Por Data:</span>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          {proximaTrocaCalculada.proximaData}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DrawerFooter className="px-0">
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Registrar Troca de Óleo
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                </div>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}