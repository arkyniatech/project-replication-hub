import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useToast } from "@/hooks/use-toast";

const grupoSchema = z.object({
  nome: z.string().min(1, "Nome do grupo é obrigatório"),
  ativo: z.boolean(),
});

type GrupoFormData = z.infer<typeof grupoSchema>;

interface GrupoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupoId?: string | null;
  onSuccess?: () => void;
}

export function GrupoForm({ open, onOpenChange, grupoId, onSuccess }: GrupoFormProps) {
  const { grupos, useGrupo, createGrupo, updateGrupo } = useSupabaseGrupos();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: grupo } = useGrupo(grupoId || "");

  const form = useForm<GrupoFormData>({
    resolver: zodResolver(grupoSchema),
    defaultValues: {
      nome: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (grupoId && grupo) {
        form.reset({
          nome: grupo.nome,
          ativo: grupo.ativo,
        });
      } else {
        form.reset({
          nome: "",
          ativo: true,
        });
      }
      setIsEditMode(!!grupoId);
    }
  }, [open, grupoId, grupo, grupos, form]);

  const validateNomeUnico = async (nome: string): Promise<boolean> => {
    if (!grupos) return true;

    const nomeExistente = grupos.find(
      (g) => g.nome.toLowerCase() === nome.toLowerCase() && g.id !== grupoId
    );

    if (nomeExistente) {
      form.setError("nome", {
        type: "manual",
        message: "Já existe um grupo com este nome",
      });
      return false;
    }

    return true;
  };



  const onSubmit = async (data: GrupoFormData) => {
    const isNomeValido = await validateNomeUnico(data.nome);
    if (!isNomeValido) return;

    setIsSubmitting(true);

    try {
      if (isEditMode && grupoId) {
        await updateGrupo.mutateAsync({
          id: grupoId,
          nome: data.nome,
          ativo: data.ativo,
        } as any);
      } else {
        await createGrupo.mutateAsync({
          nome: data.nome,
          ativo: data.ativo,
        } as any);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o grupo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndNew = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();
    const isNomeValido = await validateNomeUnico(data.nome);
    if (!isNomeValido) return;

    setIsSubmitting(true);

    try {
      await createGrupo.mutateAsync({
        nome: data.nome,
        ativo: data.ativo,
      } as any);

      form.reset({
        nome: "",
        ativo: true,
      });

      toast({
        title: "Grupo criado",
        description: "Novo grupo adicionado. Você pode criar outro.",
      });
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o grupo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>
            {isEditMode ? "Editar Grupo" : "Novo Grupo"}
          </DrawerTitle>
          <DrawerDescription>
            {isEditMode
              ? "Atualize as informações do grupo de equipamentos."
              : "Crie um novo grupo de equipamentos."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Grupo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Betoneiras, Andaimes, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Removed codigo_numerico field */}
              </div>

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Grupo Ativo</FormLabel>
                      <FormDescription>
                        Grupos inativos não ficam disponíveis para novos modelos
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting
                    ? "Salvando..."
                    : isEditMode
                      ? "Atualizar Grupo"
                      : "Criar Grupo"}
                </Button>

                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveAndNew}
                    disabled={isSubmitting}
                  >
                    Salvar e Novo
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
