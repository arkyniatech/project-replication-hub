import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function RS() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório R&amp;S</h1>
        <p className="text-muted-foreground">Recrutamento &amp; Seleção</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Módulo de Recrutamento fora do escopo atual</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Vagas, candidatos e admissões serão tratados em um ciclo posterior. Este relatório será populado quando o módulo de R&amp;S entrar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
