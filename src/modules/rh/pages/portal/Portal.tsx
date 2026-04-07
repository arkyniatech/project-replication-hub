import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Calendar, FileCheck, User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRhModule } from '../../providers/RhModuleProvider';

export default function Portal() {
  const navigate = useNavigate();
  const { devProfile } = useRhModule();

  const menuItems = [
    { title: 'Meus Holerites', description: 'Visualizar e baixar holerites', icon: FileText, path: '/rh/portal/holerites' },
    { title: 'Minhas Horas', description: 'Controle de ponto e ajustes', icon: Clock, path: '/rh/portal/horas' },
    { title: 'Minhas Férias', description: 'Solicitar e acompanhar férias', icon: Calendar, path: '/rh/portal/ferias' },
    { title: 'Minhas Solicitações', description: 'Acompanhar status das solicitações', icon: FileCheck, path: '/rh/portal/solicitacoes' }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Portal do Colaborador</h1>
        </div>
        <p className="text-muted-foreground">Bem-vindo(a), Colaborador</p>
        {devProfile === 'colaborador' && (
          <Badge variant="outline" className="gap-1">
            <Bell className="h-3 w-3" />
            Modo Colaborador Ativo
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <Card key={item.path} className="hover:shadow-lg transition-shadow cursor-pointer">
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

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Atividades Recentes</h3>
          <div className="text-center py-4 text-muted-foreground">
            Nenhuma atividade pendente
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
