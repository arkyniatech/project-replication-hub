import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function PortalFerias() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Férias</h1>
        <p className="text-muted-foreground">Solicitar e acompanhar férias</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação de férias</h3>
            <p className="text-muted-foreground">Suas solicitações de férias aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
