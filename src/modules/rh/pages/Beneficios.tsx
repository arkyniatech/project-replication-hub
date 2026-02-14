import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BadgeCheck, Plus, Settings, Users, DollarSign, 
  FileText, Search, Filter, Download 
} from 'lucide-react';
import { useRhStore } from '../store/rhStore';

export default function Beneficios() {
  const { beneficios, pessoas } = useRhStore();
  const [selectedTab, setSelectedTab] = useState('catalogo');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data for demonstration
  const mockBeneficios = [
    { id: 'ben-vt', nome: 'Vale Transporte', tipo: 'VALE_REFEICAO', valor: 200, ativo: true, provedor: 'Sodexo', elegibilidadeCount: 45 },
    { id: 'ben-vr', nome: 'Vale Refeição', tipo: 'VALE_REFEICAO', valor: 600, ativo: true, provedor: 'Alelo', elegibilidadeCount: 58 },
    { id: 'ben-saude', nome: 'Plano de Saúde', tipo: 'PLANO_SAUDE', valor: 450, ativo: true, provedor: 'Unimed', elegibilidadeCount: 52 },
    { id: 'ben-odonto', nome: 'Plano Odontológico', tipo: 'PLANO_SAUDE', valor: 80, ativo: true, provedor: 'OdontoPrev', elegibilidadeCount: 38 },
    { id: 'ben-vida', nome: 'Seguro de Vida', tipo: 'SEGURO_VIDA', valor: 100, ativo: true, provedor: 'Bradesco Seguros', elegibilidadeCount: 60 },
    { id: 'ben-combustivel', nome: 'Auxílio Combustível', tipo: 'OUTROS', valor: 300, ativo: true, provedor: 'Interno', elegibilidadeCount: 12 },
    { id: 'ben-ferramenta', nome: 'Auxílio Ferramenta', tipo: 'OUTROS', valor: 150, ativo: false, provedor: 'Interno', elegibilidadeCount: 8 },
    { id: 'ben-custo', nome: 'Ajuda de Custo', tipo: 'OUTROS', valor: 400, ativo: true, provedor: 'Interno', elegibilidadeCount: 15 }
  ];

  const mockElegibilidade = [
    { cargo: 'Vendedor', vt: true, vr: true, saude: true, odonto: true, vida: true, combustivel: false, ferramenta: false, custo: false },
    { cargo: 'Motorista', vt: true, vr: true, saude: true, odonto: false, vida: true, combustivel: true, ferramenta: false, custo: true },
    { cargo: 'Mecânico', vt: true, vr: true, saude: true, odonto: true, vida: true, combustivel: false, ferramenta: true, custo: false },
    { cargo: 'Gerente', vt: true, vr: true, saude: true, odonto: true, vida: true, combustivel: true, ferramenta: false, custo: true }
  ];

  const filteredBeneficios = mockBeneficios.filter(ben => {
    const matchesSearch = ben.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'ativo' && ben.ativo) || 
      (filterStatus === 'inativo' && !ben.ativo);
    return matchesSearch && matchesStatus;
  });

  const totalCustoMensal = mockBeneficios
    .filter(b => b.ativo)
    .reduce((sum, b) => sum + (b.valor * b.elegibilidadeCount), 0);

  const colaboradoresElegiveis = pessoas.filter(p => p.situacao === 'ativo').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Benefícios</h1>
          <p className="text-muted-foreground">Gestão de benefícios e elegibilidade</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Benefício
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Benefício</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Benefício</Label>
                <Input id="nome" placeholder="Ex: Vale Alimentação" />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VALE_REFEICAO">Vale Refeição</SelectItem>
                    <SelectItem value="PLANO_SAUDE">Plano de Saúde</SelectItem>
                    <SelectItem value="SEGURO_VIDA">Seguro de Vida</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="valor">Valor Mensal</Label>
                <Input id="valor" type="number" placeholder="0,00" />
              </div>
              <div>
                <Label htmlFor="provedor">Provedor</Label>
                <Input id="provedor" placeholder="Ex: Sodexo" />
              </div>
              <div>
                <Label htmlFor="politica">Política de Aplicação</Label>
                <Textarea id="politica" placeholder="Descreva quando e como o benefício se aplica..." />
              </div>
              <Button className="w-full">Criar Benefício</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BadgeCheck className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Benefícios Ativos</p>
                <p className="text-2xl font-bold">{mockBeneficios.filter(b => b.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Colaboradores Elegíveis</p>
                <p className="text-2xl font-bold">{colaboradoresElegiveis}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Custo Total Mensal</p>
                <p className="text-2xl font-bold">R$ {totalCustoMensal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Vínculos Ativos</p>
                <p className="text-2xl font-bold">
                  {mockBeneficios.reduce((sum, b) => sum + b.elegibilidadeCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="elegibilidade">Matriz de Elegibilidade</TabsTrigger>
          <TabsTrigger value="vinculos">Vínculos por Colaborador</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar benefícios..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Catalog Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefício</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Elegíveis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBeneficios.map((beneficio) => (
                    <TableRow key={beneficio.id}>
                      <TableCell className="font-medium">{beneficio.nome}</TableCell>
                      <TableCell>{beneficio.tipo.replace('_', ' ')}</TableCell>
                      <TableCell>{beneficio.provedor}</TableCell>
                      <TableCell>R$ {beneficio.valor}</TableCell>
                      <TableCell>{beneficio.elegibilidadeCount}</TableCell>
                      <TableCell>
                        <Badge variant={beneficio.ativo ? "default" : "secondary"}>
                          {beneficio.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elegibilidade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Elegibilidade por Cargo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cargo</TableHead>
                    <TableHead>VT</TableHead>
                    <TableHead>VR</TableHead>
                    <TableHead>Saúde</TableHead>
                    <TableHead>Odonto</TableHead>
                    <TableHead>Vida</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Ferramenta</TableHead>
                    <TableHead>Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockElegibilidade.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.cargo}</TableCell>
                      <TableCell><Switch checked={row.vt} /></TableCell>
                      <TableCell><Switch checked={row.vr} /></TableCell>
                      <TableCell><Switch checked={row.saude} /></TableCell>
                      <TableCell><Switch checked={row.odonto} /></TableCell>
                      <TableCell><Switch checked={row.vida} /></TableCell>
                      <TableCell><Switch checked={row.combustivel} /></TableCell>
                      <TableCell><Switch checked={row.ferramenta} /></TableCell>
                      <TableCell><Switch checked={row.custo} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vinculos">
          <Card>
            <CardHeader>
              <CardTitle>Vínculos por Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um colaborador para ver seus benefícios</p>
                <Button variant="outline" className="mt-4">
                  Selecionar Colaborador
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}