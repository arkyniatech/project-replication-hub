import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function PortalHoras() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Horas</h1>
        <p className="text-muted-foreground">Controle de ponto e banco de horas</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum registro de horas</h3>
            <p className="text-muted-foreground">Suas marcações de ponto aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
