import { Card, CardContent } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';

export default function PortalSolicitacoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
        <p className="text-muted-foreground">Acompanhar status das solicitações</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação</h3>
            <p className="text-muted-foreground">Suas solicitações aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
