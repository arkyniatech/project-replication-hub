import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function PortalHolerites() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Holerites</h1>
        <p className="text-muted-foreground">Visualizar e baixar seus holerites</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum holerite disponível</h3>
            <p className="text-muted-foreground">Seus holerites aparecerão aqui quando publicados pelo RH</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
