import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Calendar, FileCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePortal } from '../../hooks/usePortal';

export default function Portal() {
  const navigate = useNavigate();
  const { me, feriasSaldo, saldoHoras, holerites, solicitacoes, isLoading } = usePortal();

  const menuItems = [
    { title: 'Meus Holerites', description: 'Visualizar e baixar', icon: FileText, path: '/rh/portal/holerites' },
    { title: 'Minhas Horas', description: 'Saldo de banco de horas', icon: Clock, path: '/rh/portal/horas' },
    { title: 'Minhas Férias', description: 'Períodos e saldo', icon: Calendar, path: '/rh/portal/ferias' },
    { title: 'Minhas Solicitações', description: 'Acompanhar status', icon: FileCheck, path: '/rh/portal/solicitacoes' },
  ];

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;
  const stats = [
    { label: 'Dias de férias', value: feriasSaldo },
    { label: 'Banco de horas', value: `${saldoHoras.toFixed(1)}h` },
    { label: 'Holerites', value: holerites.length },
    { label: 'Solic. pendentes', value: pendentes },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Portal do Colaborador</h1>
        </div>
        <p className="text-muted-foreground">
          {isLoading ? 'Carregando...' : `Bem-vindo(a), ${me?.nome ?? 'Colaborador'}`}
        </p>
      </div>

      {me && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <Card key={item.path} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <Button variant="outline" size="sm" onClick={() => navigate(item.path)} className="mt-2">
                    Acessar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && !me && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Seu usuário ainda não está vinculado a um cadastro de colaborador. Fale com o RH.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
