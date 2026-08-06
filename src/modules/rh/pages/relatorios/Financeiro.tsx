import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { useRelatoriosRh, exportCSV } from '../../hooks/useRelatoriosRh';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function Lista({ titulo, dados }: { titulo: string; dados: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent>
        {dados.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
          <div className="space-y-1">
            {dados.map((d) => (
              <div key={d.name} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="truncate">{d.name}</span>
                <span className="font-medium tabular-nums">{brl(d.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Financeiro() {
  const r = useRelatoriosRh();
  const baixar = () => exportCSV('rh-folha-por-cargo.csv', r.folhaPorCargo.map((x) => ({ cargo: x.name, custo_mensal: x.value.toFixed(2) })));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Relatório Financeiro</h1>
          <p className="text-muted-foreground">Folha estimada — salários dos vínculos vigentes</p>
        </div>
        <Button variant="outline" onClick={baixar}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
      </div>
      {r.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Folha mensal total (salários base)</p>
              <p className="text-3xl font-bold">{brl(r.folhaTotal)}</p>
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Lista titulo="Por cargo" dados={r.folhaPorCargo} />
            <Lista titulo="Por loja" dados={r.folhaPorLoja} />
          </div>
        </>
      )}
    </div>
  );
}
