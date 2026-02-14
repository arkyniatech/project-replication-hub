import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pessoa } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseLojas } from '../hooks/useSupabaseLojas';
import { useSupabaseCentrosCusto } from '../hooks/useSupabaseCentrosCusto';

interface PessoaFormProps {
  pessoa?: Pessoa;
  onSave: (pessoa: Omit<Pessoa, 'id'>) => void;
  onCancel: () => void;
}

const cargos = [
  'Analista Administrativo', 'Assistente Comercial', 'Coordenador de Vendas',
  'Operador de Máquinas', 'Técnico de Manutenção', 'Supervisor de Operações',
  'Analista Financeiro', 'Assistente de RH', 'Gerente Regional',
  'Motorista', 'Auxiliar de Serviços Gerais', 'Recepcionista',
  'Analista de TI', 'Coordenador de Logística', 'Vendedor',
  'Almoxarife', 'Assistente Contábil', 'Consultor Técnico'
];

export function PessoaForm({ pessoa, onSave, onCancel }: PessoaFormProps) {
  const { toast } = useToast();
  const { lojas } = useSupabaseLojas();
  const { centrosCusto } = useSupabaseCentrosCusto();
  const [formData, setFormData] = useState({
    nome: pessoa?.nome || '',
    matricula: pessoa?.matricula || '',
    cpf: pessoa?.cpf || '',
    email: pessoa?.email || '',
    telefone: pessoa?.telefone || '',
    cargo: pessoa?.cargo || '',
    lojaId: pessoa?.lojaId || '',
    ccId: pessoa?.ccId || '',
    situacao: pessoa?.situacao || 'ativo' as const,
    salario: pessoa?.salario?.toString() || '',
    endereco: pessoa?.endereco || '',
    nascimento: pessoa?.nascimento ? pessoa.nascimento.split('T')[0] : '',
    admissaoISO: pessoa?.admissaoISO ? pessoa.admissaoISO.split('T')[0] : ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.matricula.trim()) newErrors.matricula = 'Matrícula é obrigatória';
    if (!formData.cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'E-mail é obrigatório';
    if (!formData.cargo) newErrors.cargo = 'Cargo é obrigatório';
    if (!formData.lojaId) newErrors.lojaId = 'Unidade é obrigatória';
    if (!formData.ccId) newErrors.ccId = 'Centro de Custo é obrigatório';

    // Validação de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    // Validação de CPF (formato básico)
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (formData.cpf && !cpfRegex.test(formData.cpf)) {
      newErrors.cpf = 'CPF deve estar no formato 000.000.000-00';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const pessoaData: Omit<Pessoa, 'id'> = {
      nome: formData.nome.trim(),
      matricula: formData.matricula.trim(),
      cpf: formData.cpf.trim(),
      email: formData.email.trim(),
      telefone: formData.telefone.trim(),
      cargo: formData.cargo,
      lojaId: formData.lojaId,
      ccId: formData.ccId,
      situacao: formData.situacao,
      salario: formData.salario ? parseFloat(formData.salario) : undefined,
      endereco: formData.endereco.trim() || undefined,
      nascimento: formData.nascimento || undefined,
      admissaoISO: formData.admissaoISO || new Date().toISOString().split('T')[0],
      docs: pessoa?.docs || [],
      beneficios: pessoa?.beneficios || [],
      movimentos: pessoa?.movimentos || []
    };

    onSave(pessoaData);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{pessoa ? 'Editar Pessoa' : 'Nova Pessoa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={errors.nome ? 'border-destructive' : ''}
              />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula *</Label>
              <Input
                id="matricula"
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                className={errors.matricula ? 'border-destructive' : ''}
              />
              {errors.matricula && <p className="text-sm text-destructive">{errors.matricula}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                className={errors.cpf ? 'border-destructive' : ''}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo *</Label>
              <Select
                value={formData.cargo}
                onValueChange={(value) => setFormData({ ...formData, cargo: value })}
              >
                <SelectTrigger className={errors.cargo ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo} value={cargo}>
                      {cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cargo && <p className="text-sm text-destructive">{errors.cargo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lojaId">Unidade *</Label>
              <Select
                value={formData.lojaId}
                onValueChange={(value) => setFormData({ ...formData, lojaId: value })}
              >
                <SelectTrigger className={errors.lojaId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lojaId && <p className="text-sm text-destructive">{errors.lojaId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ccId">Centro de Custo *</Label>
              <Select
                value={formData.ccId}
                onValueChange={(value) => setFormData({ ...formData, ccId: value })}
              >
                <SelectTrigger className={errors.ccId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  {centrosCusto.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ccId && <p className="text-sm text-destructive">{errors.ccId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="situacao">Situação</Label>
              <Select
                value={formData.situacao}
                onValueChange={(value: 'ativo' | 'inativo') => setFormData({ ...formData, situacao: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissaoISO">Data de Admissão</Label>
              <Input
                id="admissaoISO"
                type="date"
                value={formData.admissaoISO}
                onChange={(e) => setFormData({ ...formData, admissaoISO: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nascimento">Data de Nascimento</Label>
              <Input
                id="nascimento"
                type="date"
                value={formData.nascimento}
                onChange={(e) => setFormData({ ...formData, nascimento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salario">Salário (R$)</Label>
              <Input
                id="salario"
                type="number"
                min="0"
                step="0.01"
                value={formData.salario}
                onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Textarea
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="flex-1">
              {pessoa ? 'Atualizar' : 'Criar'} Pessoa
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}