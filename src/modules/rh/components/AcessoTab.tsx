import { useState, useEffect } from 'react';
import { UserCog, Shield, Building2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseUserProfiles, UserProfile } from '../hooks/useSupabaseUserProfiles';
import { useSupabaseUserRoles, AppRole } from '../hooks/useSupabaseUserRoles';
import { useSupabaseUserLojas } from '../hooks/useSupabaseUserLojas';
import { useSupabaseLojas } from '../hooks/useSupabaseLojas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AcessoTabProps {
  pessoa: any;
}

const ROLES_DISPONIVEIS: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', description: 'Acesso total ao sistema' },
  { value: 'gestor', label: 'Gestor', description: 'Visão ampla e relatórios multi-loja' },
  { value: 'vendedor', label: 'Vendedor', description: 'Contratos, logística, CR básico' },
  { value: 'financeiro', label: 'Financeiro', description: 'CR/CP completos, relatórios' },
  { value: 'operacao', label: 'Operação', description: 'Logística e manutenção' },
  { value: 'motorista', label: 'Motorista', description: 'Logística do dia' },
  { value: 'mecanico', label: 'Mecânico', description: 'Manutenção de equipamentos' },
  { value: 'rh', label: 'RH', description: 'Gestão de pessoas e benefícios' },
];

export function AcessoTab({ pessoa }: AcessoTabProps) {
  const { toast } = useToast();
  const { profiles, updateProfile } = useSupabaseUserProfiles();
  const { addRoles, updateRoles } = useSupabaseUserRoles();
  const { updateLojas: updateLojasPermitidas } = useSupabaseUserLojas();
  const { lojas } = useSupabaseLojas();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [selectedLojas, setSelectedLojas] = useState<string[]>([]);
  const [lojaPadrao, setLojaPadrao] = useState<string>('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [exigeTrocaSenha, setExigeTrocaSenha] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar perfil de usuário vinculado à pessoa
  useEffect(() => {
    const profile = profiles.find(p => p.pessoa_id === pessoa.id);
    if (profile) {
      setUserProfile(profile);
      setUsername(profile.username || '');
      setLojaPadrao(profile.loja_padrao_id || '');
      setTwoFaEnabled(profile.two_fa_enabled);
      setExigeTrocaSenha(profile.exige_troca_senha);
      
      // Buscar roles e lojas do usuário
      fetchUserRolesAndLojas(profile.id);
    }
  }, [profiles, pessoa.id]);

  const fetchUserRolesAndLojas = async (userId: string) => {
    // Esta função seria implementada para buscar as roles e lojas do usuário
    // Por enquanto, vamos apenas setar valores vazios
    setSelectedRoles([]);
    setSelectedLojas([]);
  };

  const handleToggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleToggleLoja = (lojaId: string) => {
    setSelectedLojas(prev =>
      prev.includes(lojaId)
        ? prev.filter(id => id !== lojaId)
        : [...prev, lojaId]
    );
  };

  const handleSave = async () => {
    if (!userProfile) {
      toast({
        title: 'Erro',
        description: 'Nenhum perfil de usuário encontrado para esta pessoa.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione ao menos um perfil de acesso.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedLojas.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione ao menos uma loja permitida.',
        variant: 'destructive',
      });
      return;
    }

    if (lojaPadrao && !selectedLojas.includes(lojaPadrao)) {
      toast({
        title: 'Erro',
        description: 'A loja padrão deve estar entre as lojas permitidas.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Atualizar perfil
      await updateProfile.mutateAsync({
        id: userProfile.id,
        updates: {
          username,
          loja_padrao_id: lojaPadrao || null,
          two_fa_enabled: twoFaEnabled,
          exige_troca_senha: exigeTrocaSenha,
        },
      });

      // Atualizar roles
      await updateRoles.mutateAsync({
        userId: userProfile.id,
        roles: selectedRoles,
      });

      // Atualizar lojas permitidas
      await updateLojasPermitidas.mutateAsync({
        userId: userProfile.id,
        lojaIds: selectedLojas,
      });

      toast({
        title: 'Sucesso',
        description: 'Acesso atualizado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao salvar acesso:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar acesso. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem Acesso ao Sistema</CardTitle>
          <CardDescription>
            Esta pessoa ainda não possui um usuário criado no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Para criar um usuário, use a funcionalidade "Criar Usuário" na tela de Usuários & Perfis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Informações do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Nome de Usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario.sistema"
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="pt-2">
                <Badge variant={userProfile.ativo ? 'default' : 'secondary'}>
                  {userProfile.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="two-fa"
              checked={twoFaEnabled}
              onCheckedChange={(checked) => setTwoFaEnabled(checked as boolean)}
            />
            <Label htmlFor="two-fa">Autenticação de dois fatores (2FA)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="troca-senha"
              checked={exigeTrocaSenha}
              onCheckedChange={(checked) => setExigeTrocaSenha(checked as boolean)}
            />
            <Label htmlFor="troca-senha">Exigir troca de senha no próximo login</Label>
          </div>
        </CardContent>
      </Card>

      {/* Perfis de Acesso (Roles) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Perfis de Acesso
          </CardTitle>
          <CardDescription>
            Selecione os perfis que definem as permissões do usuário no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES_DISPONIVEIS.map((role) => (
              <div
                key={role.value}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedRoles.includes(role.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleToggleRole(role.value)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleToggleRole(role.value)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{role.label}</p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lojas Permitidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lojas Permitidas
          </CardTitle>
          <CardDescription>
            Selecione as lojas que o usuário pode acessar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lojas.map((loja) => (
              <div
                key={loja.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedLojas.includes(loja.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleToggleLoja(loja.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedLojas.includes(loja.id)}
                    onCheckedChange={() => handleToggleLoja(loja.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{loja.nome}</p>
                    <p className="text-xs text-muted-foreground">Código: {loja.codigo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <Label htmlFor="loja-padrao">Loja Padrão</Label>
            <Select value={lojaPadrao} onValueChange={setLojaPadrao}>
              <SelectTrigger id="loja-padrao">
                <SelectValue placeholder="Selecione a loja padrão" />
              </SelectTrigger>
              <SelectContent>
                {lojas
                  .filter((loja) => selectedLojas.includes(loja.id))
                  .map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome} ({loja.codigo})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              A loja padrão é selecionada automaticamente ao fazer login
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}