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
import { Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/demoMode';

const loginSchema = z.object({
  // email é opcional no schema e validado no onSubmit (mantém flexibilidade do fluxo).
  email: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode?: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      // Validação manual de email (o schema é relaxado; validamos no submit)
      if (!data.email || !z.string().email().safeParse(data.email).success) {
        throw new Error('Email inválido ou obrigatório');
      }

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Entrar no Sistema</CardTitle>
        <CardDescription>Digite suas credenciais para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Ensure demo user exists (idempotent)
                  await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-demo-user`,
                    {
                      method: 'POST',
                      headers: {
                        'content-type': 'application/json',
                        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                      },
                    },
                  ).catch(() => null);

                  const { error } = await supabase.auth.signInWithPassword({
                    email: DEMO_EMAIL,
                    password: DEMO_PASSWORD,
                  });
                  if (error) throw error;
                  toast({
                    title: 'Modo Demonstração',
                    description: 'Bem-vindo! Suas ações não serão gravadas.',
                  });
                } catch (e: any) {
                  toast({
                    variant: 'destructive',
                    title: 'Falha ao entrar como demo',
                    description: e?.message || 'Tente novamente em alguns segundos.',
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Entrar como Demonstração (Portfólio)
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}