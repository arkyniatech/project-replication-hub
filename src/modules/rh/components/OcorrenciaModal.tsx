import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSupabasePessoaMovimentos } from '../hooks/useSupabasePessoaMovimentos';
import { supabase } from '@/integrations/supabase/client';

interface OcorrenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoaId: string;
  pessoaNome: string;
}

const tiposOcorrencia = [
  'Advertência Verbal',
  'Advertência Escrita',
  'Suspensão',
  'Elogio',
  'Promoção',
  'Transferência',
  'Alteração Salarial',
  'Afastamento',
  'Outros'
];

export function OcorrenciaModal({ 
  open, 
  onOpenChange, 
  pessoaId, 
  pessoaNome
}: OcorrenciaModalProps) {
  const { toast } = useToast();
  const { createMovimento } = useSupabasePessoaMovimentos(pessoaId);
  const [formData, setFormData] = useState({
    tipo: '',
    descricao: '',
    observacao: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tipo) newErrors.tipo = 'Tipo é obrigatório';
    if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await createMovimento.mutateAsync({
        pessoa_id: pessoaId,
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        observacao: formData.observacao.trim() || undefined,
        data: new Date().toISOString(),
        usuario_id: user?.id
      });

      // Reset form
      setFormData({
        tipo: '',
        descricao: '',
        observacao: ''
      });
      setErrors({});
      onOpenChange(false);

      toast({
        title: "Ocorrência registrada",
        description: `Ocorrência registrada para ${pessoaNome}.`
      });
    } catch (error) {
      console.error('Erro ao registrar ocorrência:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar ocorrência. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      tipo: '',
      descricao: '',
      observacao: ''
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Ocorrência - {pessoaNome}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Ocorrência *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value })}
            >
              <SelectTrigger className={errors.tipo ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposOcorrencia.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Breve descrição da ocorrência"
              className={errors.descricao ? 'border-destructive' : ''}
            />
            {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Detalhes adicionais sobre a ocorrência..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              Registrar Ocorrência
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}