import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { useSupabaseNotificacoes } from '../hooks/useSupabaseNotificacoes';

const SEV: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  critico: { variant: 'destructive', label: 'Crítico' },
  alerta: { variant: 'default', label: 'Alerta' },
  info: { variant: 'secondary', label: 'Info' },
};

export function AlertasRh() {
  const { notificacoes, isLoading, gerar, marcarLida } = useSupabaseNotificacoes();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Alertas
          {notificacoes.length > 0 && <Badge variant="destructive">{notificacoes.length}</Badge>}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${gerar.isPending ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : notificacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum alerta pendente. 🎉</p>
        ) : (
          <div className="space-y-2">
            {notificacoes.map((n) => {
              const s = SEV[n.severidade] ?? SEV.info;
              return (
                <div key={n.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 flex-none ${n.severidade === 'critico' ? 'text-destructive' : 'text-amber-600'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{n.titulo}</p>
                      <p className="text-sm text-muted-foreground">{n.mensagem}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => marcarLida.mutate(n.id)} title="Marcar como lida">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
