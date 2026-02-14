import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { useSupabaseSubgrupos } from '@/hooks/useSupabaseSubgrupos';
import { useSupabaseGrupos } from '@/hooks/useSupabaseGrupos';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';

interface SubgrupoFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string;
  grupoIdProp?: string;
}

export function SubgrupoForm({ open, onClose, editingId, grupoIdProp }: SubgrupoFormProps) {
  const { grupos } = useSupabaseGrupos();
  const { createSubgrupo, updateSubgrupo, useSubgrupo } = useSupabaseSubgrupos();
  const { data: editingSubgrupo } = useSubgrupo(editingId || '');
  
  const isEditMode = !!editingId && !!editingSubgrupo;

  const [formData, setFormData] = useState({
    grupo_id: editingSubgrupo?.grupo_id || grupoIdProp || '',
    codigo: editingSubgrupo?.codigo || '',
    nome: editingSubgrupo?.nome || '',
    descricao: editingSubgrupo?.descricao || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.grupo_id) {
      return;
    }

    try {
      if (isEditMode) {
        await updateSubgrupo.mutateAsync({
          id: editingId!,
          ...formData,
        });
      } else {
        await createSubgrupo.mutateAsync({
          ...formData,
          ativo: true,
        });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar subgrupo:', error);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>
              {isEditMode ? 'Editar Subgrupo' : 'Novo Subgrupo'}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grupo_id">Grupo *</Label>
            <Select
              value={formData.grupo_id}
              onValueChange={(value) => setFormData({ ...formData, grupo_id: value })}
              disabled={isEditMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: MOT"
                maxLength={6}
                required
                disabled={isEditMode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do subgrupo"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição do subgrupo"
              rows={3}
            />
          </div>

          <DrawerFooter className="px-0">
            <Button type="submit" disabled={createSubgrupo.isPending || updateSubgrupo.isPending}>
              {isEditMode ? 'Atualizar' : 'Criar'} Subgrupo
            </Button>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
