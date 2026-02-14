import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseFornecedores } from '@/hooks/useSupabaseFornecedores';
import { useGerarCodigoFornecedor } from '@/hooks/useGerarCodigoFornecedor';
import { validarCPF, validarCNPJ } from '@/lib/validation-schemas';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FornecedorFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string;
}

export function FornecedorForm({ open, onClose, editingId }: FornecedorFormProps) {
  const { fornecedores, createFornecedor, updateFornecedor, useFornecedor } = useSupabaseFornecedores();
  const { data: editingFornecedor } = useFornecedor(editingId || '');
  const { mutateAsync: gerarCodigo, isPending: isGeneratingCode } = useGerarCodigoFornecedor();
  
  const isEditMode = !!editingId && !!editingFornecedor;

  const [tipoDocumento, setTipoDocumento] = useState<'CPF' | 'CNPJ'>('CNPJ');
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    razao_social: '',
    cnpj: '',
    cpf: '',
    observacoes: '',
  });

  // Atualizar formulário quando carregar dados de edição
  useEffect(() => {
    if (editingFornecedor) {
      setFormData({
        codigo: editingFornecedor.codigo || '',
        nome: editingFornecedor.nome || '',
        razao_social: editingFornecedor.razao_social || '',
        cnpj: editingFornecedor.cnpj || '',
        cpf: editingFornecedor.cpf || '',
        observacoes: editingFornecedor.observacoes || '',
      });
      // Detectar tipo de documento baseado nos dados
      if (editingFornecedor.cpf) {
        setTipoDocumento('CPF');
      } else if (editingFornecedor.cnpj) {
        setTipoDocumento('CNPJ');
      }
    }
  }, [editingFornecedor]);

  // Gerar código automaticamente para novos fornecedores
  useEffect(() => {
    const gerarCodigoAutomatico = async () => {
      if (!editingId && open && !formData.codigo) {
        try {
          const novoCodigo = await gerarCodigo();
          setFormData(prev => ({ ...prev, codigo: novoCodigo }));
        } catch (error) {
          console.error('Erro ao gerar código:', error);
          toast.error('Erro ao gerar código. Tente novamente.');
        }
      }
    };

    gerarCodigoAutomatico();
  }, [editingId, open, formData.codigo, gerarCodigo]);

  // Resetar formulário ao fechar
  useEffect(() => {
    if (!open) {
      setFormData({
        codigo: '',
        nome: '',
        razao_social: '',
        cnpj: '',
        cpf: '',
        observacoes: '',
      });
      setTipoDocumento('CNPJ');
    }
  }, [open]);

  // Validação do formulário
  const isFormValid = useMemo(() => {
    if (!formData.codigo || !formData.nome) return false;
    
    if (tipoDocumento === 'CPF') {
      if (!formData.cpf) return false;
      // Validar CPF se preenchido
      const cpfLimpo = formData.cpf.replace(/\D/g, '');
      if (cpfLimpo.length === 11 && !validarCPF(cpfLimpo)) return false;
    }
    
    if (tipoDocumento === 'CNPJ') {
      if (!formData.cnpj) return false;
      // Validar CNPJ se preenchido
      const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length === 14 && !validarCNPJ(cnpjLimpo)) return false;
    }
    
    return true;
  }, [formData, tipoDocumento]);

  // Aplicar máscara de CPF
  const aplicarMascaraCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
  };

  // Aplicar máscara de CNPJ
  const aplicarMascaraCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .substring(0, 18);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.codigo) {
      toast.error('Código não foi gerado. Tente reabrir o formulário.');
      return;
    }

    try {
      if (isEditMode) {
        await updateFornecedor.mutateAsync({
          id: editingId!,
          ...formData,
        });
      } else {
        await createFornecedor.mutateAsync({
          ...formData,
          ativo: true,
        });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>
              {isEditMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">
                Código *
                {!isEditMode && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (gerado automaticamente)
                  </span>
                )}
              </Label>
              <Input
                id="codigo"
                value={formData.codigo}
                placeholder={isGeneratingCode ? "Gerando código..." : "Código gerado"}
                readOnly
                disabled
                className="uppercase bg-muted font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do fornecedor"
                required
              />
            </div>
          </div>

          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
              <Select
                value={tipoDocumento}
                onValueChange={(value: 'CPF' | 'CNPJ') => {
                  setTipoDocumento(value);
                  // Limpar campos do tipo oposto
                  if (value === 'CPF') {
                    setFormData({ ...formData, cnpj: '', razao_social: '' });
                  } else {
                    setFormData({ ...formData, cpf: '' });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">Pessoa Física (CPF)</SelectItem>
                  <SelectItem value="CNPJ">Pessoa Jurídica (CNPJ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {tipoDocumento === 'CNPJ' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  placeholder="Razão social completa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const masked = aplicarMascaraCNPJ(e.target.value);
                    setFormData({ ...formData, cnpj: masked });
                  }}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {formData.cnpj && formData.cnpj.replace(/\D/g, '').length === 14 && !validarCNPJ(formData.cnpj.replace(/\D/g, '')) && (
                  <p className="text-xs text-destructive">CNPJ inválido</p>
                )}
              </div>
            </>
          )}

          {tipoDocumento === 'CPF' && (
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => {
                  const masked = aplicarMascaraCPF(e.target.value);
                  setFormData({ ...formData, cpf: masked });
                }}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {formData.cpf && formData.cpf.replace(/\D/g, '').length === 11 && !validarCPF(formData.cpf.replace(/\D/g, '')) && (
                <p className="text-xs text-destructive">CPF inválido</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Informações adicionais"
              rows={3}
            />
          </div>

          <DrawerFooter className="px-0">
            <Button 
              type="submit" 
              disabled={createFornecedor.isPending || updateFornecedor.isPending || isGeneratingCode || !isFormValid}
            >
              {isEditMode ? 'Atualizar' : 'Criar'} Fornecedor
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
