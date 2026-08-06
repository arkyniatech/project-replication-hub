import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Wallet, CalendarX, Clock, Download } from 'lucide-react';
import { useRelatoriosRh, exportCSV } from '../../hooks/useRelatoriosRh';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function Distribuicao({ titulo, dados, fmt }: { titulo: string; dados: { name: string; value: number }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...dados.map((d) => d.value));
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {dados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : dados.map((d) => (
          <div key={d.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate">{d.name}</span>
              <span className="font-medium tabular-nums">{fmt ? fmt(d.value) : d.value}</span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Executivo() {
  const r = useRelatoriosRh();

  const kpis = [
    { label: 'Headcount ativo', value: r.headcount, icon: Users },
    { label: 'Folha mensal', value: brl(r.folhaTotal), icon: Wallet },
    { label: 'Dias de férias vencidos', value: r.diasFeriasVencidos, icon: CalendarX, alerta: r.diasFeriasVencidos > 0 },
    { label: 'Saldo banco de horas', value: `${r.saldoHorasTotal.toFixed(1)}h`, icon: Clock },
  ];

  const baixar = () => exportCSV('rh-executivo.csv', [
    { indicador: 'Headcount ativo', valor: r.headcount },
    { indicador: 'Folha mensal (R$)', valor: r.folhaTotal.toFixed(2) },
    { indicador: 'Dias de férias vencidos', valor: r.diasFeriasVencidos },
    { indicador: 'Períodos de férias vencidos', valor: r.feriasVencidasCount },
    { indicador: 'Saldo banco de horas (h)', valor: r.saldoHorasTotal.toFixed(1) },
    { indicador: 'Ausências registradas', valor: r.ausenciasTotal },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Relatório Executivo</h1>
          <p className="text-muted-foreground">Visão consolidada do RH</p>
        </div>
        <Button variant="outline" onClick={baixar}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
      </div>

      {r.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <k.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${k.alerta ? 'text-destructive' : ''}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Distribuicao titulo="Headcount por cargo" dados={r.porCargo} />
            <Distribuicao titulo="Headcount por loja" dados={r.porLoja} />
            <Distribuicao titulo="Folha por cargo" dados={r.folhaPorCargo} fmt={brl} />
            <Distribuicao titulo="Ausências por tipo" dados={r.ausenciasPorTipo} />
          </div>
        </>
      )}
    </div>
  );
}
