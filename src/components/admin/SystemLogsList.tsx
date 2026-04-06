import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, UserPlus, LogIn, Settings } from 'lucide-react';

const ACTION_ICONS: Record<string, typeof Shield> = {
  'user.created': UserPlus,
  'user.login': LogIn,
  'user.updated': Settings,
};

const ACTION_LABELS: Record<string, string> = {
  'user.created': 'Usuário criado',
  'user.login': 'Login',
  'user.updated': 'Usuário atualizado',
  'user.role_changed': 'Role alterada',
  'user.deactivated': 'Usuário desativado',
};

export function SystemLogsList() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['system-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        Nenhum log registrado ainda.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 pr-4">
        {logs.map((log) => {
          const Icon = ACTION_ICONS[log.action] || Shield;
          const label = ACTION_LABELS[log.action] || log.action;
          const details = log.details as Record<string, any> | null;

          return (
            <div
              key={log.id}
              className="flex items-start gap-3 p-2 rounded-md border bg-card text-sm"
            >
              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {label}
                  </Badge>
                  {details?.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {details.email}
                    </span>
                  )}
                </div>
                {details?.roles && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Roles: {Array.isArray(details.roles) ? details.roles.join(', ') : details.roles}
                  </p>
                )}
                {log.ip_address && (
                  <p className="text-xs text-muted-foreground">
                    IP: {log.ip_address}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {log.created_at
                  ? format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })
                  : '-'}
              </span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
