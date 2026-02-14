import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { seedContasPagar } from '@/utils/seed-contas-pagar';
import { Loader2, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function SeedDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    if (!confirm('Isso criará dados de exemplo. Continuar?')) {
      return;
    }

    setIsSeeding(true);
    
    try {
      await seedContasPagar();
      toast.success("Dados de exemplo criados com sucesso!");
    } catch (error: any) {
      console.error('Erro ao criar dados:', error);
      toast.error("Erro ao criar dados: " + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Use apenas em ambiente de desenvolvimento. Isso criará categorias, contas e fornecedores de exemplo.
        </AlertDescription>
      </Alert>
      
      <Button 
        onClick={handleSeed} 
        disabled={isSeeding}
        variant="outline"
      >
        {isSeeding ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando dados...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            Popular Dados de Exemplo
          </>
        )}
      </Button>
    </div>
  );
}
