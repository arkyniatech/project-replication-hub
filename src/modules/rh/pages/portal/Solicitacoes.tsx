import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileCheck } from 'lucide-react';
import { usePortal } from '../../hooks/usePortal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  em_aprovacao: { label: 'Em aprovação', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  reprovada: { label: 'Reprovada', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'outline' },
};
const TIPO: Record<string, string> = {
  ferias: 'Férias', ajuste_ponto: 'Ajuste de ponto', atualizacao_cadastral: 'Atualização cadastral',
  beneficio: 'Benefício', documento: 'Documento', transferencia: 'Transferência', desligamento: 'Desligamento', outro: 'Outro',
};

export default function PortalSolicitacoes() {
  const { solicitacoes, isLoading } = usePortal();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
        <p className="text-muted-foreground">Status das suas solicitações</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : solicitacoes.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma solicitação.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {solicitacoes.map((s) => {
                const st = STATUS[s.status] ?? { label: s.status, variant: 'secondary' as const };
                return (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium">{TIPO[s.tipo] ?? s.tipo}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.titulo || '—'} · {format(parseISO(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
