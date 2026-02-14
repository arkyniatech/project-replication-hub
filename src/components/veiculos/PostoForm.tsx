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
import { validateCNPJ, formatCNPJ, ESTADOS_BRASIL } from '@/lib/veiculos-utils';

const postoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  uf: z.string().min(2, 'UF é obrigatória').max(2, 'UF deve ter 2 caracteres'),
  cnpj: z.string()
    .optional()
    .refine((val) => !val || validateCNPJ(val), 'CNPJ inválido'),
  obs: z.string().optional(),
});

type PostoFormData = z.infer<typeof postoSchema>;

interface PostoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postoId?: string | null;
  onSuccess: () => void;
}

export function PostoForm({ open, onOpenChange, postoId, onSuccess }: PostoFormProps) {
  const { postos, addPosto, updatePosto } = useVeiculosStore();

  const form = useForm<PostoFormData>({
    resolver: zodResolver(postoSchema),
    defaultValues: {
      nome: '',
      cidade: '',
      uf: '',
      cnpj: '',
      obs: '',
    },
  });

  const isEditing = !!postoId;

  useEffect(() => {
    if (open) {
      if (isEditing && postoId) {
        const posto = postos.find((p) => p.id === postoId);
        if (posto) {
          form.reset({
            nome: posto.nome,
            cidade: posto.cidade,
            uf: posto.uf,
            cnpj: posto.cnpj || '',
            obs: posto.obs || '',
          });
        }
      } else {
        form.reset({
          nome: '',
          cidade: '',
          uf: '',
          cnpj: '',
          obs: '',
        });
      }
    }
  }, [open, isEditing, postoId, postos, form]);

  const onSubmit = (data: PostoFormData) => {
    try {
      if (isEditing && postoId) {
        updatePosto(postoId, {
          nome: data.nome,
          cidade: data.cidade,
          uf: data.uf.toUpperCase(),
          cnpj: data.cnpj || undefined,
          obs: data.obs || undefined,
        });
        toast.success('Posto atualizado com sucesso!');
      } else {
        addPosto({
          nome: data.nome,
          cidade: data.cidade,
          uf: data.uf.toUpperCase(),
          cnpj: data.cnpj || undefined,
          obs: data.obs || undefined,
        });
        toast.success('Posto cadastrado com sucesso!');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erro ao salvar posto');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Editar Posto' : 'Novo Posto'}
          </DrawerTitle>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Posto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Posto Shell, BR Petrobras, etc." />
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
                name="cnpj"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00.000.000/0000-00"
                        onChange={(e) => {
                          const formatted = formatCNPJ(e.target.value);
                          field.onChange(formatted);
                        }}
                        className="font-mono"
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
                      placeholder="Informações adicionais sobre o posto..."
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
                  {isEditing ? 'Atualizar' : 'Cadastrar'} Posto
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