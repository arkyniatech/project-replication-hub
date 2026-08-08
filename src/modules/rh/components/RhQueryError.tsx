import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

/**
 * Estado de erro padrão das telas de RH. Sem isso, falha de rede/RLS
 * renderiza o empty state ("nenhum registro") como se não houvesse dados.
 */
export function RhQueryError({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <Card className="border-destructive/50">
      <CardContent className="py-10 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">Erro ao carregar os dados</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Se o erro persistir, verifique com o administrador se o seu usuário tem loja atribuída.
        </p>
      </CardContent>
    </Card>
  );
}
