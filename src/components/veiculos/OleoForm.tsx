import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useVeiculosStore } from '@/stores/veiculosStore';

const oleoSchema = z.object({
  tipo_especificacao: z.string().min(1, 'Especificação é obrigatória'),
  intervalo_km: z.number()
    .min(1, 'Intervalo em km deve ser maior que 0'),
  intervalo_meses: z.number()
    .min(1, 'Intervalo em meses deve ser maior que 0'),
  obs: z.string().optional(),
});

type OleoFormData = z.infer<typeof oleoSchema>;

interface OleoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oleoId?: string | null;
  onSuccess: () => void;
}

export function OleoForm({ open, onOpenChange, oleoId, onSuccess }: OleoFormProps) {
  const { oleos, addOleo, updateOleo } = useVeiculosStore();

  const form = useForm<OleoFormData>({
    resolver: zodResolver(oleoSchema),
    defaultValues: {
      tipo_especificacao: '',
      intervalo_km: 10000,
      intervalo_meses: 6,
      obs: '',
    },
  });

  const isEditing = !!oleoId;

  useEffect(() => {
    if (open) {
      if (isEditing && oleoId) {
        const oleo = oleos.find((o) => o.id === oleoId);
        if (oleo) {
          form.reset({
            tipo_especificacao: oleo.tipo_especificacao,
            intervalo_km: oleo.intervalo_km,
            intervalo_meses: oleo.intervalo_meses,
            obs: oleo.obs || '',
          });
        }
      } else {
        form.reset({
          tipo_especificacao: '',
          intervalo_km: 10000,
          intervalo_meses: 6,
          obs: '',
        });
      }
    }
  }, [open, isEditing, oleoId, oleos, form]);

  const onSubmit = (data: OleoFormData) => {
    try {
      if (isEditing && oleoId) {
        updateOleo(oleoId, {
          tipo_especificacao: data.tipo_especificacao,
          intervalo_km: data.intervalo_km,
          intervalo_meses: data.intervalo_meses,
          obs: data.obs || undefined,
        });
        toast.success('Óleo atualizado com sucesso!');
      } else {
        addOleo({
          tipo_especificacao: data.tipo_especificacao,
          intervalo_km: data.intervalo_km,
          intervalo_meses: data.intervalo_meses,
          obs: data.obs || undefined,
        });
        toast.success('Óleo cadastrado com sucesso!');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erro ao salvar óleo');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Editar Óleo' : 'Novo Óleo'}
          </DrawerTitle>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <FormField
              control={form.control}
              name="tipo_especificacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo/Especificação *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: 15W40 Mineral, 5W30 Sintético, etc." 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="intervalo_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo (km) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        step="1000"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="intervalo_meses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo (meses) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="12"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
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
                      placeholder="Informações adicionais sobre o óleo..."
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
                  {isEditing ? 'Atualizar' : 'Cadastrar'} Óleo
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