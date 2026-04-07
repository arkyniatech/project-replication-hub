import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeCheck, Plus, Search, Download, DollarSign, Users } from 'lucide-react';

export default function Beneficios() {
  const [selectedTab, setSelectedTab] = useState('catalogo');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Benefícios</h1>
          <p className="text-muted-foreground">Gestão de benefícios e elegibilidade</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Benefício</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Benefício</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome do Benefício</Label><Input placeholder="Ex: Vale Alimentação" /></div>
              <div>
                <Label>Tipo</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VALE_REFEICAO">Vale Refeição</SelectItem>
                    <SelectItem value="PLANO_SAUDE">Plano de Saúde</SelectItem>
                    <SelectItem value="SEGURO_VIDA">Seguro de Vida</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor Mensal</Label><Input type="number" placeholder="0,00" /></div>
              <div><Label>Provedor</Label><Input placeholder="Ex: Sodexo" /></div>
              <div><Label>Política</Label><Textarea placeholder="Descreva quando e como o benefício se aplica..." /></div>
              <Button className="w-full">Criar Benefício</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="elegibilidade">Elegibilidade</TabsTrigger>
          <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Buscar benefícios..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <Button variant="outline"><Download className="h-4 w-4 mr-2" />Exportar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <BadgeCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum benefício cadastrado</h3>
                <p className="text-muted-foreground">Adicione benefícios para gerenciar a elegibilidade dos colaboradores</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elegibilidade">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Cadastre benefícios para configurar a matriz de elegibilidade</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vinculos">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Selecione um colaborador para ver seus benefícios</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
