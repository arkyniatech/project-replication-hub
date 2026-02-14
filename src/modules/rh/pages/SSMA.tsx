import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Shield, AlertTriangle, CheckCircle2, Calendar, 
  Users, Clock, TrendingUp 
} from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { buildComplianceStats } from '../utils/seedRhContent';

export default function SSMA() {
  const { examesASO, treinamentosNR, pessoas } = useRhStore();
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const stats = buildComplianceStats(examesASO, treinamentosNR);
  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SSMA</h1>
          <p className="text-muted-foreground">Segurança, Saúde e Meio Ambiente</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">ASO Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.asoVencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">ASO Vencendo (30d)</p>
                <p className="text-2xl font-bold text-orange-600">{stats.asoVencendo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">NRs Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.nrVencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Em Conformidade</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(((stats.asoOK + stats.nrOK) / (examesASO.length + treinamentosNR.length)) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="aso">ASO</TabsTrigger>
          <TabsTrigger value="treinamentos">NRs/Treinamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status ASO por Colaborador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pessoasAtivas.slice(0, 8).map(pessoa => {
                    const aso = examesASO.find(e => e.pessoaId === pessoa.id);
                    const status = aso?.status || 'pendente';
                    return (
                      <div key={pessoa.id} className="flex justify-between items-center">
                        <span className="text-sm">{pessoa.nome}</span>
                        <Badge variant={
                          status === 'realizado' ? 'default' : 
                          status === 'vencido' ? 'destructive' : 'secondary'
                        }>
                          {status === 'realizado' ? 'OK' : status === 'vencido' ? 'Vencido' : 'Agendado'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Treinamentos por NR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['NR-11', 'NR-12', 'NR-18', 'NR-35'].map(nr => {
                    const count = treinamentosNR.filter(t => t.nr === nr).length;
                    const vencidos = treinamentosNR.filter(t => t.nr === nr && t.status === 'vencido').length;
                    return (
                      <div key={nr} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{nr}</span>
                        <div className="flex gap-2">
                          <span className="text-sm text-muted-foreground">{count} colaboradores</span>
                          {vencidos > 0 && (
                            <Badge variant="destructive">{vencidos} vencidos</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aso">
          <Card>
            <CardHeader>
              <CardTitle>Exames ASO</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Realização</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examesASO.slice(0, 15).map((aso) => {
                    const pessoa = pessoas.find(p => p.id === aso.pessoaId);
                    return (
                      <TableRow key={aso.id}>
                        <TableCell className="font-medium">{pessoa?.nome}</TableCell>
                        <TableCell>{aso.tipo}</TableCell>
                        <TableCell>
                          {aso.dataRealizacao ? 
                            new Date(aso.dataRealizacao).toLocaleDateString() : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>{new Date(aso.dataVencimento).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            aso.status === 'realizado' ? 'default' : 
                            aso.status === 'vencido' ? 'destructive' : 'secondary'
                          }>
                            {aso.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treinamentos">
          <Card>
            <CardHeader>
              <CardTitle>Treinamentos NR</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>NR</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Realização</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treinamentosNR.slice(0, 15).map((treinamento) => {
                    const pessoa = pessoas.find(p => p.id === treinamento.pessoaId);
                    return (
                      <TableRow key={treinamento.id}>
                        <TableCell className="font-medium">{pessoa?.nome}</TableCell>
                        <TableCell>{treinamento.nr}</TableCell>
                        <TableCell className="text-sm">{treinamento.descricao}</TableCell>
                        <TableCell>
                          {treinamento.dataRealizacao ? 
                            new Date(treinamento.dataRealizacao).toLocaleDateString() : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>{new Date(treinamento.dataVencimento).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            treinamento.status === 'realizado' ? 'default' : 
                            treinamento.status === 'vencido' ? 'destructive' : 'secondary'
                          }>
                            {treinamento.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}