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
import { CRITICIDADE_LABELS } from '@/lib/veiculos-utils';
import { CriticidadeServico } from '@/types/veiculos';

const servicoSchema = z.object({
  grupo: z.string().min(1, 'Grupo é obrigatório'),
  servico_especifico: z.string().min(1, 'Serviço específico é obrigatório'),
  criticidade: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
  obs: z.string().optional(),
});

type ServicoFormData = z.infer<typeof servicoSchema>;

interface ServicoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicoId?: string | null;
  onSuccess: () => void;
}

export function ServicoForm({ open, onOpenChange, servicoId, onSuccess }: ServicoFormProps) {
  const { servicos, addServico, updateServico } = useVeiculosStore();

  const form = useForm<ServicoFormData>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      grupo: '',
      servico_especifico: '',
      criticidade: 'MEDIA',
      obs: '',
    },
  });

  const isEditing = !!servicoId;

  useEffect(() => {
    if (open) {
      if (isEditing && servicoId) {
        const servico = servicos.find((s) => s.id === servicoId);
        if (servico) {
          form.reset({
            grupo: servico.grupo,
            servico_especifico: servico.servico_especifico,
            criticidade: servico.criticidade,
            obs: servico.obs || '',
          });
        }
      } else {
        form.reset({
          grupo: '',
          servico_especifico: '',
          criticidade: 'MEDIA',
          obs: '',
        });
      }
    }
  }, [open, isEditing, servicoId, servicos, form]);

  const onSubmit = (data: ServicoFormData) => {
    try {
      if (isEditing && servicoId) {
        updateServico(servicoId, {
          grupo: data.grupo,
          servico_especifico: data.servico_especifico,
          criticidade: data.criticidade,
          obs: data.obs || undefined,
        });
        toast.success('Serviço atualizado com sucesso!');
      } else {
        addServico({
          grupo: data.grupo,
          servico_especifico: data.servico_especifico,
          criticidade: data.criticidade,
          obs: data.obs || undefined,
        });
        toast.success('Serviço cadastrado com sucesso!');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    }
  };

  // Sugestões de grupos baseadas nos serviços existentes
  const gruposExistentes = [...new Set(servicos.map(s => s.grupo))].sort();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </DrawerTitle>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grupo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Motor, Suspensão, Freios, etc."
                        list="grupos-existentes"
                      />
                    </FormControl>
                    <datalist id="grupos-existentes">
                      {gruposExistentes.map((grupo) => (
                        <option key={grupo} value={grupo} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="criticidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criticidade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a criticidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CRITICIDADE_LABELS).map(([key, label]) => (
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
            </div>

            <FormField
              control={form.control}
              name="servico_especifico"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço Específico *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: Troca de óleo, Alinhamento, Balanceamento, etc." 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="obs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Informações adicionais sobre o serviço..."
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
                  {isEditing ? 'Atualizar' : 'Cadastrar'} Serviço
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