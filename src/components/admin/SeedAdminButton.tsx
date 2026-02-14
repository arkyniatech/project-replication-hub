import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { seedAdminUser } from '@/utils/seed-admin-user';
import { Loader2, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function SeedAdminButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    user_id?: string;
    email?: string;
    role?: string;
  } | null>(null);

  const handleSeed = async () => {
    if (!confirm('Isso criará o usuário administrador padrão. Continuar?')) {
      return;
    }

    setIsSeeding(true);
    setResult(null);

    try {
      const seedResult = await seedAdminUser();
      setResult(seedResult);

      if (seedResult.success) {
        toast.success("Usuário administrador criado com sucesso!");
      } else {
        toast.warning(seedResult.message);
      }
    } catch (error: any) {
      console.error('Erro ao criar admin:', error);
      toast.error("Erro ao criar admin: " + error.message);
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Cria o usuário administrador padrão com acesso completo ao sistema. Use apenas uma vez.
        </AlertDescription>
      </Alert>

      {result && (
        <Alert className={result.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="font-medium">{result.message}</div>
            {result.success && result.email && (
              <div className="mt-2 text-sm">
                <div><strong>Email:</strong> {result.email}</div>
                <div><strong>Senha:</strong> Admin123!@#</div>
                <div><strong>Role:</strong> {result.role}</div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSeed}
        disabled={isSeeding}
        variant="default"
        className="bg-orange-600 hover:bg-orange-700"
      >
        {isSeeding ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando administrador...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Usuário Admin
          </>
        )}
      </Button>
    </div>
  );
}