import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortal } from '../../hooks/usePortal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');
const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  em_aquisicao: { label: 'Em aquisição', variant: 'secondary' },
  adquirido: { label: 'A gozar', variant: 'default' },
  programado: { label: 'Programado', variant: 'outline' },
  parcialmente_gozado: { label: 'Parcial', variant: 'outline' },
  gozado: { label: 'Gozado', variant: 'secondary' },
  pago: { label: 'Pago', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  dobro_devido: { label: 'Dobro devido', variant: 'destructive' },
};

export default function PortalFerias() {
  const { ferias, feriasSaldo, isLoading } = usePortal();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Férias</h1>
        <p className="text-muted-foreground">Períodos e saldo</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Dias disponíveis</p>
              <p className="text-3xl font-bold">{feriasSaldo}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Períodos aquisitivos</CardTitle></CardHeader>
            <CardContent>
              {ferias.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum período.</p>
              ) : (
                <div className="space-y-2">
                  {ferias.map((f) => {
                    const s = STATUS[f.status] ?? { label: f.status, variant: 'secondary' as const };
                    return (
                      <div key={f.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                        <div className="min-w-0">
                          <p className="font-medium">{fmt(f.aquisicao_inicio)} – {fmt(f.aquisicao_fim)}</p>
                          <p className="text-sm text-muted-foreground">gozar até {fmt(f.concessivo_fim)} · {f.dias_saldo} dias</p>
                        </div>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
