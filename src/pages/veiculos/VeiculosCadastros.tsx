import { Link } from 'react-router-dom';
import { Car, MapPin, Droplet, Wrench, Settings, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVeiculosStore } from '@/stores/veiculosStore';

export default function VeiculosCadastros() {
  const { veiculos = [], postos = [], oleos = [], oficinas = [], servicos = [] } = useVeiculosStore();

  const cadastrosData = [
    {
      title: 'Veículos',
      count: veiculos.length,
      icon: Car,
      href: '/veiculos',
      description: 'Cadastro de frota completa',
      color: 'bg-blue-500'
    },
    {
      title: 'Postos',
      count: postos.length,
      icon: MapPin,
      href: '/veiculos/postos',
      description: 'Postos de combustível',
      color: 'bg-green-500'
    },
    {
      title: 'Óleos',
      count: oleos.length,
      icon: Droplet,
      href: '/veiculos/oleos',
      description: 'Tipos de óleo e especificações',
      color: 'bg-amber-500'
    },
    {
      title: 'Oficinas',
      count: oficinas.length,
      icon: Wrench,
      href: '/veiculos/oficinas',
      description: 'Oficinas parceiras',
      color: 'bg-purple-500'
    },
    {
      title: 'Serviços',
      count: servicos.length,
      icon: Settings,
      href: '/veiculos/servicos',
      description: 'Tipos de serviço de manutenção',
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cadastros de Veículos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os cadastros relacionados à frota de veículos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cadastrosData.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${item.color} text-white`}>
                    <Icon size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                    <div className="text-sm text-gray-500">registros</div>
                  </div>
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={item.href}>
                      Ver {item.title}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button asChild variant="default">
              <Link to="/veiculos" className="flex items-center gap-2">
                <Plus size={16} />
                Novo Veículo
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/veiculos/postos" className="flex items-center gap-2">
                <Plus size={16} />
                Novo Posto
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/veiculos/oficinas" className="flex items-center gap-2">
                <Plus size={16} />
                Nova Oficina
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            <Car className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Nenhuma atividade recente nos cadastros</p>
            <p className="text-sm">Comece cadastrando um novo veículo ou posto</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}