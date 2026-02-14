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
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { ESTADOS_BRASIL, CRITICIDADE_LABELS, CRITICIDADE_COLORS } from '@/lib/veiculos-utils';
import { Badge } from '@/components/ui/badge';

const oficinaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  uf: z.string().min(2, 'UF é obrigatória').max(2, 'UF deve ter 2 caracteres'),
  contato: z.string().optional(),
  obs: z.string().optional(),
  servicos_ids: z.array(z.string()),
});

type OficinaFormData = z.infer<typeof oficinaSchema>;

interface OficinaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oficinaId?: string | null;
  onSuccess: () => void;
}

export function OficinaForm({ open, onOpenChange, oficinaId, onSuccess }: OficinaFormProps) {
  const { oficinas, servicos, addOficina, updateOficina } = useVeiculosStore();

  const form = useForm<OficinaFormData>({
    resolver: zodResolver(oficinaSchema),
    defaultValues: {
      nome: '',
      cidade: '',
      uf: '',
      contato: '',
      obs: '',
      servicos_ids: [],
    },
  });

  const isEditing = !!oficinaId;

  useEffect(() => {
    if (open) {
      if (isEditing && oficinaId) {
        const oficina = oficinas.find((o) => o.id === oficinaId);
        if (oficina) {
          form.reset({
            nome: oficina.nome,
            cidade: oficina.cidade,
            uf: oficina.uf,
            contato: oficina.contato || '',
            obs: oficina.obs || '',
            servicos_ids: oficina.servicos_ids || [],
          });
        }
      } else {
        form.reset({
          nome: '',
          cidade: '',
          uf: '',
          contato: '',
          obs: '',
          servicos_ids: [],
        });
      }
    }
  }, [open, isEditing, oficinaId, oficinas, form]);

  const onSubmit = (data: OficinaFormData) => {
    try {
      if (isEditing && oficinaId) {
        updateOficina(oficinaId, {
          nome: data.nome,
          cidade: data.cidade,
          uf: data.uf.toUpperCase(),
          contato: data.contato || undefined,
          obs: data.obs || undefined,
          servicos_ids: data.servicos_ids,
        });
        toast.success('Oficina atualizada com sucesso!');
      } else {
        addOficina({
          nome: data.nome,
          cidade: data.cidade,
          uf: data.uf.toUpperCase(),
          contato: data.contato || undefined,
          obs: data.obs || undefined,
          servicos_ids: data.servicos_ids,
        });
        toast.success('Oficina cadastrada com sucesso!');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erro ao salvar oficina');
    }
  };

  // Agrupar serviços por grupo
  const servicosPorGrupo = servicos.reduce((acc, servico) => {
    if (!acc[servico.grupo]) {
      acc[servico.grupo] = [];
    }
    acc[servico.grupo].push(servico);
    return acc;
  }, {} as Record<string, typeof servicos>);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Editar Oficina' : 'Nova Oficina'}
          </DrawerTitle>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome da Oficina *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Oficina do João, Auto Center, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="São Paulo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_BRASIL.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
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
                name="contato"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Contato</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(11) 99999-9999 - João Silva" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="obs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Informações adicionais sobre a oficina..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {servicos.length > 0 && (
              <FormField
                control={form.control}
                name="servicos_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviços que Atende</FormLabel>
                    <div className="space-y-4 max-h-64 overflow-y-auto border rounded-md p-4">
                      {Object.entries(servicosPorGrupo).map(([grupo, servicosGrupo]) => (
                        <div key={grupo} className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">
                            {grupo}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {servicosGrupo.map((servico) => (
                              <div key={servico.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={servico.id}
                                  checked={field.value?.includes(servico.id)}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...(field.value || []), servico.id]
                                      : (field.value || []).filter((id) => id !== servico.id);
                                    field.onChange(newValue);
                                  }}
                                />
                                <label
                                  htmlFor={servico.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                >
                                  {servico.servico_especifico}
                                  <Badge className={CRITICIDADE_COLORS[servico.criticidade]} variant="outline">
                                    {CRITICIDADE_LABELS[servico.criticidade]}
                                  </Badge>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DrawerFooter className="px-0">
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {isEditing ? 'Atualizar' : 'Cadastrar'} Oficina
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