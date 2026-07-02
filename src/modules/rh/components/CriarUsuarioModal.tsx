import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserProfiles } from '../hooks/useSupabaseUserProfiles';
import { useSupabaseUserRoles, type AppRole } from '../hooks/useSupabaseUserRoles';
import { useSupabaseUserLojas } from '../hooks/useSupabaseUserLojas';
import { useSupabaseLojas } from '../hooks/useSupabaseLojas';
import { logAction } from '@/services/logger';
import type { Pessoa } from '../types';
// crypto and bcrypt removed as they are Node.js modules not suitable for browser
// using native Web Crypto API instead

interface CriarUsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoa: Pessoa | null;
}

import { SELECTABLE_ROLES, sugerirRolePorCargo } from '../utils/roleMapping';

const ALL_ROLES = SELECTABLE_ROLES;

function gerarUsername(nomeCompleto: string): string {
  const partes = nomeCompleto.toLowerCase().trim().split(' ');
  if (partes.length === 1) return partes[0];
  return `${partes[0]}.${partes[partes.length - 1]}`;
}

function gerarSenhaSegura(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const DOMINIO_PADRAO = 'locacaoerp.com';

function montarEmailFinal(input: string): string {
  const valor = input.trim().toLowerCase();
  if (!valor) return '';
  return valor.includes('@') ? valor : `${valor}@${DOMINIO_PADRAO}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CriarUsuarioModal({ open, onOpenChange, pessoa }: CriarUsuarioModalProps) {
  const { toast } = useToast();
  const { createProfile } = useSupabaseUserProfiles();
  const { addRoles } = useSupabaseUserRoles();
  const { addLojas } = useSupabaseUserLojas();
  const { lojas } = useSupabaseLojas();

  // Detectar se o usuário logado é master para mostrar a opção master
  const [isMaster, setIsMaster] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'master').then(({ data }) => {
          setIsMaster(!!data && data.length > 0);
        });
      }
    });
  }, []);

  const ROLES_DISPONIVEIS = ALL_ROLES.filter(r => !r.masterOnly || isMaster);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [rolesSelecionadas, setRolesSelecionadas] = useState<AppRole[]>([]);
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([]);
  const [lojaPadrao, setLojaPadrao] = useState<string>('');
  const [twoFA, setTwoFA] = useState(false);
  const [exigeTrocaSenha, setExigeTrocaSenha] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senhaManual, setSenhaManual] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Gerar email e username automaticamente quando pessoa mudar
  useEffect(() => {
    if (pessoa) {
      const usernameAuto = gerarUsername(pessoa.nome);
      setEmail(usernameAuto);
      setUsername(usernameAuto);

      const roleSugerida = sugerirRolePorCargo(pessoa.cargo);
      setRolesSelecionadas(roleSugerida ? [roleSugerida] : []);
    }
  }, [pessoa]);

  const toggleRole = (role: AppRole) => {
    setRolesSelecionadas(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleLoja = (lojaId: string) => {
    setLojasSelecionadas(prev => {
      const novasLojas = prev.includes(lojaId)
        ? prev.filter(l => l !== lojaId)
        : [...prev, lojaId];

      // Se remover a loja padrão, resetar
      if (lojaPadrao === lojaId && !novasLojas.includes(lojaId)) {
        setLojaPadrao('');
      }

      return novasLojas;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pessoa) return;

    // Validações
    if (!email.trim()) {
      toast({ title: 'Erro', description: 'E-mail é obrigatório', variant: 'destructive' });
      return;
    }
    const emailFinal = montarEmailFinal(email);
    if (!EMAIL_REGEX.test(emailFinal)) {
      toast({ title: 'Erro', description: 'E-mail inválido', variant: 'destructive' });
      return;
    }
    if (!username.trim()) {
      toast({ title: 'Erro', description: 'Username é obrigatório', variant: 'destructive' });
      return;
    }
    if (rolesSelecionadas.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um perfil', variant: 'destructive' });
      return;
    }
    if (lojasSelecionadas.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos uma loja', variant: 'destructive' });
      return;
    }
    if (lojaPadrao && !lojasSelecionadas.includes(lojaPadrao)) {
      toast({ title: 'Erro', description: 'Loja padrão deve estar nas lojas permitidas', variant: 'destructive' });
      return;
    }
    if (senhaManual) {
      if (senha.length < 8) {
        toast({ title: 'Erro', description: 'A senha deve ter no mínimo 8 caracteres', variant: 'destructive' });
        return;
      }
      if (senha !== confirmarSenha) {
        toast({ title: 'Erro', description: 'As senhas não conferem', variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const senhaFinal = senhaManual ? senha : gerarSenhaSegura();

      // Obter token de autenticação atual
      const { data: { session } } = await supabase.auth.getSession();

      console.log('--- FRONTEND TOKEN DIAGNOSTICS ---');
      if (session) {
        console.log(`Token length: ${session.access_token.length}`);
        console.log(`Token starts with: ${session.access_token.substring(0, 20)}...`);
      } else {
        console.warn('No active session found!');
      }

      if (!session) {
        toast({
          title: 'Erro de Autenticação',
          description: 'Sua sessão expirou. Por favor, faça logout e login novamente.',
          variant: 'destructive',
        });
        return;
      }

      // 1. Criar usuário via Edge Function (mantém admin logado!)
      // Roles e lojas são inseridas na própria edge function usando service_role
      // para contornar RLS de user_roles / user_lojas_permitidas.
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          email: emailFinal,
          password: senhaFinal,
          username: username,
          pessoa_id: pessoa.id,
          two_fa_enabled: twoFA,
          exige_troca_senha: exigeTrocaSenha,
          loja_padrao_id: lojaPadrao || null,
          roles: rolesSelecionadas,
          lojas_permitidas: lojasSelecionadas,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        console.error('❌ Edge Function Error:', functionError);
        let detailedError = functionError.message;
        let errorCode = null;

        // Tentar extrair mensagem do corpo da resposta, se disponível
        try {
          if (functionError && typeof functionError === 'object' && 'context' in functionError) {
            const response = (functionError as any).context as Response;
            const bodyText = await response.text();
            console.log('📄 Response body:', bodyText);

            try {
              const body = JSON.parse(bodyText);
              console.log('📦 Parsed error body:', body);
              if (body && body.error) {
                detailedError = body.error;
                errorCode = body.code || null;

                // Log additional details if available
                if (body.message) {
                  console.error('Error message:', body.message);
                }
                if (body.details) {
                  console.error('Error details:', body.details);
                }
              } else {
                detailedError = bodyText;
              }
            } catch {
              // Se não for JSON, usar o texto puro (limitado a 200 chars)
              detailedError = bodyText.substring(0, 200);
            }
          }
        } catch (e) {
          console.error('Falha ao parsear erro detalhado:', e);
        }

        console.error('🔴 Erro detalhado da Edge Function:', detailedError);
        console.error('🔴 Error code:', errorCode);

        const error = new Error(detailedError);
        (error as any).code = errorCode;
        throw error;
      }
      if (!functionData?.user_id) throw new Error('Erro ao criar usuário (sem ID retornado)');

      const userId = functionData.user_id;

      // 2. User_profile JÁ FOI CRIADO na Edge Function

      // 3. Roles e lojas já foram inseridas na Edge Function (service_role, bypassa RLS)


      // 5. Log de auditoria
      await logAction('USER_CREATED', {
        userId,
        email: emailFinal,
        pessoaId: pessoa.id,
        roles: rolesSelecionadas,
        lojas: lojasSelecionadas,
        lojaPadrao,
        twoFA,
        exigeTrocaSenha,
      });

      toast({
        title: 'Usuário criado com sucesso!',
        description: senhaManual
          ? `Acesso criado para ${pessoa.nome}. Use a senha definida no formulário para o primeiro login.`
          : `Acesso criado para ${pessoa.nome}. Uma senha temporária foi gerada — anote e repasse ao usuário.`,
      });

      onOpenChange(false);

      // Limpar formulário
      setEmail('');
      setUsername('');
      setRolesSelecionadas([]);
      setLojasSelecionadas([]);
      setLojaPadrao('');
      setTwoFA(false);
      setExigeTrocaSenha(true);
      setSenhaManual(false);
      setSenha('');
      setConfirmarSenha('');
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);

      let errorMessage = error.message || 'Ocorreu um erro ao criar o acesso';
      let errorTitle = 'Erro ao criar usuário';

      // Specific handling for JWT/Authorization errors
      if (error.code === 401 || error.message?.includes('Token JWT inválido') || error.message?.includes('Invalid JWT')) {
        errorTitle = 'Erro de Autenticação';
        errorMessage = 'Sua sessão pode ter expirado. Por favor, faça logout e login novamente.';
        console.error('🔐 JWT Error detected - Session may be invalid or expired');
      } else if (error.message?.includes('Token de autenticação ausente')) {
        errorTitle = 'Erro de Autenticação';
        errorMessage = 'Token de autenticação não encontrado. Por favor, faça login novamente.';
      } else if (error.message?.includes('Permissão negada')) {
        errorTitle = 'Permissão Negada';
        errorMessage = 'Você não tem permissão para criar usuários. É necessário ter perfil Admin ou RH.';
      } else if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
        errorMessage = 'Este e-mail já está cadastrado no sistema';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'E-mail inválido';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Erro na geração da senha';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pessoa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Criar Acesso ao Sistema
          </DialogTitle>
          <DialogDescription>
            Configurar credenciais e permissões para {pessoa.nome}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Colaborador */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold">Dados do Colaborador</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{pessoa.nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CPF</p>
                <p className="font-medium">{pessoa.cpf}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cargo</p>
                <p className="font-medium">{pessoa.cargo || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Matrícula</p>
                <p className="font-medium">{pessoa.matricula || '-'}</p>
              </div>
            </div>
          </div>

          {/* Credenciais */}
          <div className="space-y-4">
            <h3 className="font-semibold">Credenciais de Acesso</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@dominio.com.br ou primeironome.sobrenome"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Será usado: {email.trim() ? montarEmailFinal(email) : `usuario@${DOMINIO_PADRAO}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="primeironome.sobrenome"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="senhaManual" className="font-medium">Definir senha manualmente</Label>
                  <p className="text-xs text-muted-foreground">
                    {senhaManual
                      ? 'Você definirá a senha inicial no formulário abaixo.'
                      : 'Uma senha aleatória será gerada e exibida após a criação — repasse ao usuário.'}
                  </p>
                </div>
                <Switch
                  id="senhaManual"
                  checked={senhaManual}
                  onCheckedChange={setSenhaManual}
                />
              </div>

              {senhaManual && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <Input
                      id="senha"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="mínimo 8 caracteres"
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar senha *</Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="repita a senha"
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Perfis/Roles */}
          <div className="space-y-3">
            <Label>Perfis/Permissões *</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES_DISPONIVEIS.map(role => (
                <Badge
                  key={role.value}
                  variant={rolesSelecionadas.includes(role.value) ? 'default' : 'outline'}
                  className={`cursor-pointer ${rolesSelecionadas.includes(role.value) ? role.color + ' text-white' : ''}`}
                  onClick={() => toggleRole(role.value)}
                >
                  {role.label}
                  {rolesSelecionadas.includes(role.value) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Lojas */}
          <div className="space-y-3">
            <Label>Lojas Permitidas *</Label>
            <div className="flex flex-wrap gap-2">
              {lojas.map(loja => (
                <Badge
                  key={loja.id}
                  variant={lojasSelecionadas.includes(loja.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleLoja(loja.id)}
                >
                  {loja.nome}
                  {lojasSelecionadas.includes(loja.id) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Loja Padrão */}
          {lojasSelecionadas.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="lojaPadrao">Loja Padrão (opcional)</Label>
              <select
                id="lojaPadrao"
                value={lojaPadrao}
                onChange={(e) => setLojaPadrao(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Selecione...</option>
                {lojas
                  .filter(l => lojasSelecionadas.includes(l.id))
                  .map(loja => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Opções de Segurança */}
          <div className="space-y-4">
            <h3 className="font-semibold">Segurança</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="twoFA">Autenticação de 2 Fatores</Label>
                <p className="text-sm text-muted-foreground">Exigir código adicional no login</p>
              </div>
              <Switch
                id="twoFA"
                checked={twoFA}
                onCheckedChange={setTwoFA}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="exigeTrocaSenha">Exigir Troca de Senha</Label>
                <p className="text-sm text-muted-foreground">Usuário deve alterar senha no primeiro acesso</p>
              </div>
              <Switch
                id="exigeTrocaSenha"
                checked={exigeTrocaSenha}
                onCheckedChange={setExigeTrocaSenha}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
