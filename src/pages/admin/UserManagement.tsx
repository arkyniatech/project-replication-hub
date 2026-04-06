import { AdminUserCreate } from '@/components/admin/AdminUserCreate';
import { SystemLogsList } from '@/components/admin/SystemLogsList';
import { guardRoute } from '@/hooks/useRbac';

function UserManagement() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                    Gerencie os usuários do sistema, crie novas contas e visualize logs de acesso.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                <div>
                    <AdminUserCreate />
                </div>

                <div className="bg-muted/10 p-6 rounded-lg border">
                    <h2 className="text-xl font-semibold mb-4">Logs do Sistema</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Visualização de logs de criação de usuário e acessos.
                    </p>
                    <SystemLogsList />
                </div>
            </div>
        </div>
    );
}

// Protect this route: Only Admins can access
export default guardRoute(['rh:users'])(UserManagement);
