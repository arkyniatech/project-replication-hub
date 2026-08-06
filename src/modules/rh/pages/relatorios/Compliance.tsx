import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRelatoriosRh } from '../../hooks/useRelatoriosRh';

const LABEL: Record<string, string> = {
  pendente: 'Pendente', enviado: 'Enviado (aguardando validação)', validado: 'Validado', rejeitado: 'Rejeitado', vencido: 'Vencido',
};

export default function Compliance() {
  const r = useRelatoriosRh();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório de Compliance</h1>
        <p className="text-muted-foreground">Situação dos documentos dos colaboradores</p>
      </div>
      {r.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Documentos por status</CardTitle></CardHeader>
          <CardContent>
            {r.docsPorStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
            ) : (
              <div className="space-y-1">
                {r.docsPorStatus.map((d) => (
                  <div key={d.name} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{LABEL[d.name] ?? d.name}</span>
                    <span className="font-medium tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Treinamentos/NRs e ASO detalhado ficam para um ciclo posterior (fora do escopo atual).
      </p>
    </div>
  );
}
