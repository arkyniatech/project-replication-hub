import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRelatoriosRh } from '../../hooks/useRelatoriosRh';

const LABEL: Record<string, string> = {
  falta_injustificada: 'Falta injustificada', falta_justificada: 'Falta justificada', atestado: 'Atestado',
  licenca_maternidade: 'Licença-maternidade', licenca_paternidade: 'Licença-paternidade',
  acidente_trabalho: 'Acidente de trabalho', afastamento_inss: 'Afastamento (INSS)', suspensao: 'Suspensão', outro: 'Outro',
};

export default function Jornada() {
  const r = useRelatoriosRh();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório de Jornada</h1>
        <p className="text-muted-foreground">Ausências e afastamentos</p>
      </div>
      {r.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Ausências registradas</p>
              <p className="text-3xl font-bold">{r.ausenciasTotal}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Por tipo</CardTitle></CardHeader>
            <CardContent>
              {r.ausenciasPorTipo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ausência registrada.</p>
              ) : (
                <div className="space-y-1">
                  {r.ausenciasPorTipo.map((d) => (
                    <div key={d.name} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>{LABEL[d.name] ?? d.name}</span>
                      <span className="font-medium tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Ponto é lançamento manual (sem relógio/AFD). As marcações ficam na tela de Ponto.
          </p>
        </>
      )}
    </div>
  );
}
