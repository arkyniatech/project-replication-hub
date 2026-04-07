import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock } from 'lucide-react';

export default function Aprovacoes() {
  const [filtros, setFiltros] = useState({ tipo: 'all', status: 'all', busca: '' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Central de Aprovações</h1>
        <p className="text-muted-foreground">Gerencie todas as solicitações pendentes</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input placeholder="Buscar por colaborador..." value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
            <Select value={filtros.tipo} onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="ponto">Ponto</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="ausencia">Ausência</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="recusado">Recusados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
