import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { Manutencao } from '@/types/veiculos';
import { STATUS_COLORS } from '@/lib/veiculos-utils';

const abrirOSSchema = z.object({
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  oficina_id: z.string().min(1, 'Oficina é obrigatória'),
  grupo_id: z.string().min(1, 'Grupo é obrigatório'),
  servico_id: z.string().min(1, 'Serviço é obrigatório'),
  descricao: z.string().optional(),
  km_entrada: z.number().optional(),
  dt_entradaISO: z.string().optional(),
});

const fecharOSSchema = z.object({
  km_saida: z.number().optional(),
  dt_saidaISO: z.string().optional(),
  custo_pecas: z.number().min(0, 'Custo não pode ser negativo').optional(),
  custo_mo: z.number().min(0, 'Custo não pode ser negativo').optional(),
});

type AbrirOSFormData = z.infer<typeof abrirOSSchema>;
type FecharOSFormData = z.infer<typeof fecharOSSchema>;

interface ManutencaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manutencaoId?: string | null;
  veiculoIdProp?: string;
  onSuccess: () => void;
}

export function ManutencaoForm({ open, onOpenChange, manutencaoId, veiculoIdProp, onSuccess }: ManutencaoFormProps) {
  const { 
    veiculos, 
    oficinas, 
    servicos,
    manutencoes,
    abrirOS, 
    fecharOS,
    getManutencoesByVeiculo
  } = useVeiculosStore();

  const [modo, setModo] = useState<'abrir' | 'fechar'>('abrir');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');

  const manutencao = manutencaoId ? manutencoes.find(m => m.id === manutencaoId) : null;
  const isFechar = !!manutencaoId && manutencao?.status === 'ABERTA';

  const abrirForm = useForm<AbrirOSFormData>({
    resolver: zodResolver(abrirOSSchema),
    defaultValues: {
      veiculo_id: veiculoIdProp || '',
      oficina_id: '',
      grupo_id: '',
      servico_id: '',
      descricao: '',
      km_entrada: undefined,
      dt_entradaISO: '',
    },
  });

  const fecharForm = useForm<FecharOSFormData>({
    resolver: zodResolver(fecharOSSchema),
    defaultValues: {
      km_saida: undefined,
      dt_saidaISO: '',
      custo_pecas: undefined,
      custo_mo: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      if (isFechar && manutencao) {
        setModo('fechar');
        const veiculo = veiculos.find(v => v.id === manutencao.veiculo_id);
        fecharForm.reset({
          km_saida: veiculo?.odometro_atual || undefined,
          dt_saidaISO: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
          custo_pecas: undefined,
          custo_mo: undefined,
        });
      } else {
        setModo('abrir');
        abrirForm.reset({
          veiculo_id: veiculoIdProp || '',
          oficina_id: '',
          grupo_id: '',
          servico_id: '',
          descricao: '',
          km_entrada: undefined,
          dt_entradaISO: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        });
      }
    }
  }, [open, isFechar, manutencao, veiculoIdProp, abrirForm, fecharForm, veiculos]);

  // Agrupar serviços por grupo
  const servicosPorGrupo = servicos.reduce((acc, servico) => {
    if (!acc[servico.grupo]) {
      acc[servico.grupo] = [];
    }
    acc[servico.grupo].push(servico);
    return acc;
  }, {} as Record<string, typeof servicos>);

  const servicosDoGrupo = grupoSelecionado ? servicosPorGrupo[grupoSelecionado] || [] : [];

  const validateKmNaoRegressivo = (kmAtual: number, veiculoId: string): boolean => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    return !veiculo || kmAtual >= veiculo.odometro_atual;
  };

  const onSubmitAbrir = (data: AbrirOSFormData) => {
    if (data.km_entrada && !validateKmNaoRegressivo(data.km_entrada, data.veiculo_id)) {
      toast.error('KM de entrada não pode ser menor que o odômetro atual do veículo');
      return;
    }

    try {
      abrirOS({
        veiculo_id: data.veiculo_id,
        oficina_id: data.oficina_id,
        grupo_id: data.grupo_id,
        servico_id: data.servico_id,
        descricao: data.descricao,
        km_entrada: data.km_entrada,
        dt_entradaISO: data.dt_entradaISO,
      });

      toast.success('Ordem de Serviço aberta com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao abrir OS');
    }
  };

  const onSubmitFechar = (data: FecharOSFormData) => {
    if (!manutencaoId || !manutencao) return;

    if (data.km_saida) {
      if (!validateKmNaoRegressivo(data.km_saida, manutencao.veiculo_id)) {
        toast.error('KM de saída não pode ser menor que o odômetro atual do veículo');
        return;
      }

      if (manutencao.km_entrada && data.km_saida < manutencao.km_entrada) {
        toast.error('KM de saída não pode ser menor que KM de entrada');
        return;
      }
    }

    try {
      fecharOS(manutencaoId, data);
      toast.success('Ordem de Serviço fechada com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao fechar OS');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {modo === 'abrir' ? 'Abrir Ordem de Serviço' : `Fechar OS #${manutencaoId}`}
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-6 overflow-y-auto">
          {modo === 'fechar' && manutencao && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Informações da OS
                  <Badge className={STATUS_COLORS.OFICINA}>
                    {manutencao.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Abertura:</span>
                    <p>{format(new Date(manutencao.data_abertura), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Oficina:</span>
                    <p>{oficinas.find(o => o.id === manutencao.oficina_id)?.nome}</p>
                  </div>
                  <div>
                    <span className="font-medium">Serviço:</span>
                    <p>{servicos.find(s => s.id === manutencao.servico_id)?.servico_especifico}</p>
                  </div>
                  {manutencao.km_entrada && (
                    <div>
                      <span className="font-medium">KM Entrada:</span>
                      <p>{manutencao.km_entrada.toLocaleString()} km</p>
                    </div>
                  )}
                </div>
                {manutencao.descricao && (
                  <div className="mt-4">
                    <span className="font-medium">Descrição:</span>
                    <p className="text-muted-foreground mt-1">{manutencao.descricao}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {modo === 'abrir' ? (
            <Form {...abrirForm}>
              <form onSubmit={abrirForm.handleSubmit(onSubmitAbrir)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={abrirForm.control}
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
                    control={abrirForm.control}
                    name="oficina_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oficina *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a oficina" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {oficinas.map((oficina) => (
                              <SelectItem key={oficina.id} value={oficina.id}>
                                {oficina.nome} - {oficina.cidade}/{oficina.uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={abrirForm.control}
                    name="grupo_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setGrupoSelecionado(value);
                            abrirForm.setValue('servico_id', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o grupo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.keys(servicosPorGrupo).map((grupo) => (
                              <SelectItem key={grupo} value={grupo}>
                                {grupo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={abrirForm.control}
                    name="servico_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o serviço" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {servicosDoGrupo.map((servico) => (
                              <SelectItem key={servico.id} value={servico.id}>
                                {servico.servico_especifico}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={abrirForm.control}
                    name="km_entrada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM de Entrada</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={abrirForm.control}
                    name="dt_entradaISO"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data/Hora de Entrada</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={abrirForm.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Problema</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descreva o problema ou serviço solicitado..."
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
                      Abrir OS
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                  </div>
                </DrawerFooter>
              </form>
            </Form>
          ) : (
            <Form {...fecharForm}>
              <form onSubmit={fecharForm.handleSubmit(onSubmitFechar)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={fecharForm.control}
                    name="km_saida"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM de Saída</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={fecharForm.control}
                    name="dt_saidaISO"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data/Hora de Saída</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={fecharForm.control}
                    name="custo_pecas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo de Peças (R$)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={fecharForm.control}
                    name="custo_mo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo de Mão de Obra (R$)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DrawerFooter className="px-0">
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Fechar OS
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                  </div>
                </DrawerFooter>
              </form>
            </Form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}