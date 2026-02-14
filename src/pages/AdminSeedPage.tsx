import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SeedDataButton } from '@/components/admin/SeedDataButton';
import { SeedAdminButton } from '@/components/admin/SeedAdminButton';
import { Shield } from 'lucide-react';

export default function AdminSeedPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Admin - Dados de Exemplo
        </h1>
        <p className="text-muted-foreground mt-2">
          Popule o sistema com dados iniciais para desenvolvimento e testes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuário Administrador - Seed</CardTitle>
          <CardDescription>
            Cria o usuário administrador padrão com acesso completo ao sistema (admin@empresa.com / Admin123!@#)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeedAdminButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Pagar - Seed</CardTitle>
          <CardDescription>
            Cria categorias N2, contas financeiras e fornecedores de exemplo no banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeedDataButton />
        </CardContent>
      </Card>
    </div>
  );
}
