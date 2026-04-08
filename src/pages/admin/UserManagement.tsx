import { SystemLogsList } from '@/components/admin/SystemLogsList';
import { guardRoute } from '@/hooks/useRbac';

function UserManagement() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                    Gerencie os usuários do sistema e visualize logs de acesso.
                    Para criar novos usuários, acesse RH → Pessoas e clique em "Criar Acesso".
                </p>
            </div>

            <div className="bg-muted/10 p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Logs do Sistema</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Visualização de logs de criação de usuário e acessos.
                </p>
                <SystemLogsList />
            </div>
        </div>
    );
}

export default guardRoute(['rh:users'])(UserManagement);
