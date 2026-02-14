import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { 
  validatePlaca, 
  validateAno, 
  validateCodigoInterno,
  applyPlacaMask,
  TIPO_VEICULO_LABELS,
  COMBUSTIVEL_LABELS
} from '@/lib/veiculos-utils';
import { TipoVeiculo, TipoCombustivel } from '@/types/veiculos';

const veiculoSchema = z.object({
  placa: z.string()
    .min(1, 'Placa é obrigatória')
    .refine(validatePlaca, 'Placa inválida'),
  codigo_interno: z.string()
    .min(1, 'Código interno é obrigatório')
    .refine(validateCodigoInterno, 'Código deve ser alfanumérico (2-20 caracteres)'),
  fabricante: z.string().min(1, 'Fabricante é obrigatório'),
  modelo: z.string().min(1, 'Modelo é obrigatório'),
  tipo: z.enum(['carro', 'moto', 'furgão', 'caminhão']),
  ano_fab: z.number()
    .min(1900, 'Ano de fabricação deve ser maior que 1900')
    .refine(validateAno, 'Ano inválido'),
  ano_mod: z.number()
    .min(1900, 'Ano do modelo deve ser maior que 1900')
    .refine(validateAno, 'Ano inválido'),
  combustivel: z.enum(['G', 'E', 'D', 'Flex']),
  cap_tanque_l: z.number()
    .min(1, 'Capacidade deve ser maior que 0'),
  odometro_atual: z.number()
    .min(0, 'Odômetro não pode ser negativo'),
  oleo_id: z.string().optional(),
  observacao: z.string().optional(),
});

type VeiculoFormData = z.infer<typeof veiculoSchema>;

interface VeiculoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId?: string | null;
  onSuccess: () => void;
}

export function VeiculoForm({ open, onOpenChange, veiculoId, onSuccess }: VeiculoFormProps) {
  const { 
    veiculos, 
    oleos,
    addVeiculo, 
    updateVeiculo, 
    isPlacaUnique, 
    isCodigoInternoUnique,
    setVeiculoOleo
  } = useVeiculosStore();

  const form = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      placa: '',
      codigo_interno: '',
      fabricante: '',
      modelo: '',
      tipo: 'carro',
      ano_fab: new Date().getFullYear(),
      ano_mod: new Date().getFullYear(),
      combustivel: 'Flex',
      cap_tanque_l: 50,
      odometro_atual: 0,
      oleo_id: '',
      observacao: '',
    },
  });

  const isEditing = !!veiculoId;

  useEffect(() => {
    if (open) {
      if (isEditing && veiculoId) {
        const veiculo = veiculos.find((v) => v.id === veiculoId);
        if (veiculo) {
          form.reset({
            placa: veiculo.placa,
            codigo_interno: veiculo.codigo_interno,
            fabricante: veiculo.fabricante,
            modelo: veiculo.modelo,
            tipo: veiculo.tipo,
            ano_fab: veiculo.ano_fab,
            ano_mod: veiculo.ano_mod,
            combustivel: veiculo.combustivel,
            cap_tanque_l: veiculo.cap_tanque_l,
            odometro_atual: veiculo.odometro_atual,
            observacao: veiculo.observacao || '',
          });
        }
      } else {
        form.reset({
          placa: '',
          codigo_interno: '',
          fabricante: '',
          modelo: '',
          tipo: 'carro',
          ano_fab: new Date().getFullYear(),
          ano_mod: new Date().getFullYear(),
          combustivel: 'Flex',
          cap_tanque_l: 50,
          odometro_atual: 0,
          oleo_id: '',
          observacao: '',
        });
      }
    }
  }, [open, isEditing, veiculoId, veiculos, form]);

  const validateUniqueFields = (data: VeiculoFormData): string | null => {
    // Mock da loja ativa
    const lojaAtiva = '1';

    if (!isPlacaUnique(data.placa, veiculoId || undefined)) {
      return 'Esta placa já está cadastrada';
    }

    if (!isCodigoInternoUnique(data.codigo_interno, lojaAtiva, veiculoId || undefined)) {
      return 'Este código interno já está cadastrado nesta loja';
    }

    return null;
  };

  const onSubmit = (data: VeiculoFormData) => {
    const validationError = validateUniqueFields(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      if (isEditing && veiculoId) {
        updateVeiculo(veiculoId, {
          placa: data.placa.toUpperCase(),
          codigo_interno: data.codigo_interno.toUpperCase(),
          fabricante: data.fabricante,
          modelo: data.modelo,
          tipo: data.tipo,
          ano_fab: data.ano_fab,
          ano_mod: data.ano_mod,
          combustivel: data.combustivel,
          cap_tanque_l: data.cap_tanque_l,
          odometro_atual: data.odometro_atual,
          observacao: data.observacao,
        });

        // Atualizar óleo se selecionado
        if (data.oleo_id) {
          setVeiculoOleo(veiculoId, data.oleo_id);
        }

        toast.success('Veículo atualizado com sucesso!');
      } else {
        // Mock da loja ativa
        const lojaAtiva = '1';

        addVeiculo({
          placa: data.placa.toUpperCase(),
          codigo_interno: data.codigo_interno.toUpperCase(),
          fabricante: data.fabricante,
          modelo: data.modelo,
          tipo: data.tipo,
          ano_fab: data.ano_fab,
          ano_mod: data.ano_mod,
          combustivel: data.combustivel,
          cap_tanque_l: data.cap_tanque_l,
          odometro_atual: data.odometro_atual,
          loja_id: lojaAtiva,
          status: 'OPERANDO',
          observacao: data.observacao,
        });

        toast.success('Veículo cadastrado com sucesso!');
      }

      onSuccess();
    } catch (error) {
      toast.error('Erro ao salvar veículo');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Editar Veículo' : 'Novo Veículo'}
          </DrawerTitle>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="ABC-1234 ou ABC1D23"
                        onChange={(e) => {
                          const masked = applyPlacaMask(e.target.value);
                          field.onChange(masked);
                        }}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_interno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Interno *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="VEH001"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fabricante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fabricante *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Toyota, Ford, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Corolla, Fiesta, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_VEICULO_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
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
                name="combustivel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustível *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o combustível" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(COMBUSTIVEL_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
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
                name="ano_fab"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano de Fabricação *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ano_mod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano do Modelo *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cap_tanque_l"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade do Tanque (L) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        step="0.1"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometro_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odômetro Atual (km) *</FormLabel>
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

              {oleos.length > 0 && (
                <FormField
                  control={form.control}
                  name="oleo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Óleo Principal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o óleo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum óleo selecionado</SelectItem>
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
              )}
            </div>

            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observações adicionais sobre o veículo..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DrawerFooter className="px-0">
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {isEditing ? 'Atualizar' : 'Cadastrar'} Veículo
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