import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  Calendar, 
  FileCheck, 
  User,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRhStore } from '../../store/rhStore';
import { useRhModule } from '../../providers/RhModuleProvider';

export default function Portal() {
  const navigate = useNavigate();
  const { holerites, ajustesPonto, ferias, aprovacoes } = useRhStore();
  const { devProfile } = useRhModule();
  
  // Mock current employee ID (in real app would come from auth)
  const currentEmployeeId = 'pessoa-1';
  
  // Calculate counts for current employee
  const currentEmployee = useRhStore(state => 
    state.pessoas.find(p => p.id === currentEmployeeId)
  );
  
  const holeritesPendentes = holerites.filter(h => 
    h.pessoaId === currentEmployeeId && !h.lido
  ).length;
  
  const ajustesPendentes = ajustesPonto.filter(a => 
    a.pessoaId === currentEmployeeId && a.status === 'pendente'
  ).length;
  
  const feriasSolicitadas = ferias.filter(f => 
    f.colaboradorId === currentEmployeeId && f.status === 'planejada'
  ).length;
  
  const solicitacoesPendentes = aprovacoes.filter(a => 
    a.pessoaId === currentEmployeeId && a.status === 'pendente'
  ).length;

  const menuItems = [
    {
      title: 'Meus Holerites',
      description: 'Visualizar e baixar holerites',
      icon: FileText,
      path: '/rh/portal/holerites',
      badge: holeritesPendentes > 0 ? holeritesPendentes : null,
      badgeText: 'Novos'
    },
    {
      title: 'Minhas Horas',
      description: 'Controle de ponto e ajustes',
      icon: Clock,
      path: '/rh/portal/horas',
      badge: ajustesPendentes > 0 ? ajustesPendentes : null,
      badgeText: 'Pendentes'
    },
    {
      title: 'Minhas Férias',
      description: 'Solicitar e acompanhar férias',
      icon: Calendar,
      path: '/rh/portal/ferias',
      badge: feriasSolicitadas > 0 ? feriasSolicitadas : null,
      badgeText: 'Solicitadas'
    },
    {
      title: 'Minhas Solicitações',
      description: 'Acompanhar status das solicitações',
      icon: FileCheck,
      path: '/rh/portal/solicitacoes',
      badge: solicitacoesPendentes > 0 ? solicitacoesPendentes : null,
      badgeText: 'Pendentes'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Portal do Colaborador</h1>
        </div>
        <p className="text-muted-foreground">
          Bem-vindo(a), {currentEmployee?.nome || 'Colaborador'}
        </p>
        {devProfile === 'colaborador' && (
          <Badge variant="outline" className="gap-1">
            <Bell className="h-3 w-3" />
            Modo Colaborador Ativo
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{holerites.filter(h => h.pessoaId === currentEmployeeId).length}</div>
            <div className="text-sm text-muted-foreground">Holerites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{currentEmployee?.saldoFeriasDias || 0}</div>
            <div className="text-sm text-muted-foreground">Dias de Férias</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{ajustesPonto.filter(a => a.pessoaId === currentEmployeeId).length}</div>
            <div className="text-sm text-muted-foreground">Ajustes de Ponto</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Bell className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{solicitacoesPendentes}</div>
            <div className="text-sm text-muted-foreground">Pendências</div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <Card key={item.path} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge} {item.badgeText}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="mt-2"
                  >
                    Acessar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Atividades Recentes</h3>
          <div className="space-y-3">
            {holeritesPendentes > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  Você possui {holeritesPendentes} holerite(s) não visualizado(s)
                </span>
              </div>
            )}
            {ajustesPendentes > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm">
                  {ajustesPendentes} ajuste(s) de ponto aguardando aprovação
                </span>
              </div>
            )}
            {feriasSolicitadas > 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  {feriasSolicitadas} solicitação(ões) de férias em análise
                </span>
              </div>
            )}
            {holeritesPendentes === 0 && ajustesPendentes === 0 && feriasSolicitadas === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma atividade pendente
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}