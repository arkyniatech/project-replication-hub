import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortal } from '../../hooks/usePortal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');

export default function PortalHoras() {
  const { saldoHoras, horasMov, isLoading } = usePortal();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Horas</h1>
        <p className="text-muted-foreground">Saldo de banco de horas</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Saldo atual</p>
              <p className={`text-3xl font-bold ${saldoHoras < 0 ? 'text-destructive' : ''}`}>{saldoHoras.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Movimentos</CardTitle></CardHeader>
            <CardContent>
              {horasMov.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum movimento.</p>
              ) : (
                <div className="space-y-2">
                  {horasMov.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.observacao ?? m.tipo}</p>
                        <p className="text-sm text-muted-foreground">{fmt(m.ocorrido_em)}</p>
                      </div>
                      <span className={`font-medium ${m.tipo === 'credito' ? 'text-green-600' : 'text-destructive'}`}>
                        {m.tipo === 'credito' ? '+' : '−'}{Number(m.horas).toFixed(1)}h
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
