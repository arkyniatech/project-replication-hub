import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileStack, 
  Plus, 
  Edit, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';

// Simple mock template for demo
const mockTemplates = [
  {
    id: 'tpl-admissao',
    processo: 'admissao' as const,
    nome: 'Admissão',
    itens: [
      { id: '1', titulo: 'Documentos pessoais (RG, CPF, PIS)', obrigatorio: true, responsavel: 'RH', prazoHoras: 24 },
      { id: '2', titulo: 'Comprovante de residência', obrigatorio: true, responsavel: 'RH', prazoHoras: 48 },
      { id: '3', titulo: 'Carteira de trabalho', obrigatorio: true, responsavel: 'RH', prazoHoras: 24 }
    ]
  },
  {
    id: 'tpl-ferias',
    processo: 'ferias' as const,
    nome: 'Férias',
    itens: [
      { id: '1', titulo: 'Aviso de férias (30 dias antecedência)', obrigatorio: true, responsavel: 'RH', prazoHoras: 720 },
      { id: '2', titulo: 'Recibo de férias assinado', obrigatorio: true, responsavel: 'RH', prazoHoras: 24 }
    ]
  }
];

export default function Documentos() {
  const { can } = useRbacPermissions();
  const store = useRhStore();
  const [activeTab, setActiveTab] = useState('templates');

  const getStatusBadge = (status: string) => {
    const variants = {
      pendente: 'secondary',
      concluido: 'default',
      n_aplicavel: 'outline'
    } as const;

    const colors = {
      pendente: 'text-amber-600 bg-amber-50',
      concluido: 'text-green-600 bg-green-50', 
      n_aplicavel: 'text-gray-600 bg-gray-50'
    };

    return (
      <Badge 
        variant={variants[status as keyof typeof variants]} 
        className={colors[status as keyof typeof colors]}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Documentos & Checklists</h1>
          <p className="text-muted-foreground">Gestão de processos e documentação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          {can('rh:pessoas_edit') && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Processo
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="execucao">Execução</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {mockTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {template.itens.length} itens • {template.itens.filter(i => i.obrigatorio).length} obrigatórios
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {can('rh:pessoas_edit') && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Badge variant="outline">3 execuções</Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    {template.itens.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={false} disabled />
                        <span>{item.titulo}</span>
                        {item.obrigatorio && (
                          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="execucao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-sm">Pendente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">João Silva</p>
                        <Badge variant="secondary" className="text-xs">ADMISSAO</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        2/10 itens concluídos
                      </p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{width: '20%'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm">Em Andamento</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({length: 4}).map((_, i) => (
                    <div key={i} className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">Maria Costa</p>
                        <Badge variant="secondary" className="text-xs">FERIAS</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        4/6 itens concluídos
                      </p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '67%'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm">Concluído</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({length: 2}).map((_, i) => (
                    <div key={i} className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">Pedro Santos</p>
                        <Badge variant="secondary" className="text-xs">DESLIGAMENTO</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        12/12 itens concluídos
                      </p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: '100%'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processos por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Pendentes</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full" style={{width: '60%'}} />
                      </div>
                      <span className="text-sm font-medium">12</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Em Andamento</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '40%'}} />
                      </div>
                      <span className="text-sm font-medium">8</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Concluídos</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '80%'}} />
                      </div>
                      <span className="text-sm font-medium">16</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tempo Médio por Processo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Admissão</span>
                    <Badge variant="outline">5.2 dias</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Férias</span>
                    <Badge variant="outline">2.1 dias</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Desligamento</span>
                    <Badge variant="outline">8.7 dias</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}