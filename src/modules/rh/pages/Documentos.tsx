import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileStack, Plus, Download } from 'lucide-react';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';

export default function Documentos() {
  const { can } = useRbacPermissions();
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Documentos & Checklists</h1>
          <p className="text-muted-foreground">Gestão de processos e documentação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
          {can('rh:pessoas_edit') && (
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Processo</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="execucao">Execução</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum template cadastrado</h3>
                <p className="text-muted-foreground">Crie templates de checklist para processos de admissão, férias e desligamento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execucao">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum processo em execução</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sem dados para relatório</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
