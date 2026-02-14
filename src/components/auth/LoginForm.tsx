import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff, Shield, User } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
}).refine((data) => {
  // Se não estiver no modo admin, o email é obrigatório e deve ser válido
  // No entanto, como o Refine não tem acesso ao estado isAdminMode diretamente aqui,
  // vamos validar o email no onSubmit para maior flexibilidade.
  return true;
}, {
  message: "Email inválido",
  path: ["email"],
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode?: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { signInWithCredentials } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      // Check if it's admin login
      if (isAdminMode) {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'your-admin-email@example.com';
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'your-secure-password';

        // Se o email estiver vazio no modo admin, usamos o padrão
        const effectiveEmail = data.email?.trim() || adminEmail;

        if ((effectiveEmail === adminEmail) && data.password === adminPassword) {
          const { error } = await signInWithCredentials(adminEmail, adminPassword);
          if (error) throw error;

          toast({
            title: "Login Administrativo",
            description: "Acesso concedido como administrador.",
          });
          return;
        } else {
          throw new Error('Credenciais administrativas incorretas');
        }
      }

      // Validação manual de email para usuários normais (já que relaxamos o schema)
      if (!data.email || !z.string().email().safeParse(data.email).success) {
        throw new Error('Email inválido ou obrigatório');
      }

      // Regular user login
      const { error } = await signInWithCredentials(data.email, data.password);
      if (error) throw error;

      toast({
        title: "Login realizado",
        description: "Bem-vindo ao sistema!",
      });

    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Erro ao fazer login';

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Erro no login",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Placeholder for password recovery
    toast({
      title: "Recuperação de senha",
      description: "Funcionalidade em desenvolvimento. Contate o administrador.",
    });
  };

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode);
    if (!isAdminMode) {
      form.setValue('email', import.meta.env.VITE_ADMIN_EMAIL || 'your-admin-email@example.com');
      form.setValue('password', '');
    } else {
      form.reset();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              {isAdminMode ? 'Acesso Administrativo' : 'Entrar no Sistema'}
            </CardTitle>
            <CardDescription>
              {isAdminMode
                ? 'Acesso restrito para administradores'
                : 'Digite suas credenciais para continuar'
              }
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAdminMode}
            className="flex items-center gap-2"
          >
            {isAdminMode ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            {isAdminMode ? 'Modo Usuário' : 'Modo Admin'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isAdminMode && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>Entrar</>
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleForgotPassword}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Esqueceu a senha?
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}