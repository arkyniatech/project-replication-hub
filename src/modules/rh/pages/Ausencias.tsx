import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, FileText, Check, X, Plus, Download } from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { seedRhMissing8 } from '../utils/seedRhMissing8';
import { toast } from 'sonner';

export default function Ausencias() {
  const { ausencias, pessoas, addLog } = useRhStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState<string>('');
  const [tipo, setTipo] = useState<'Atestado' | 'Falta' | 'Licenca'>('Atestado');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Initialize seed data if empty
  useEffect(() => {
    if (ausencias.length === 0) {
      const seedData = seedRhMissing8();
      // Add to store - simplified for demo
    }
  }, []);

  // KPI calculations
  const kpis = {
    total: ausencias.length,
    atestados: ausencias.filter(a => a.tipo === 'Atestado').length,
    faltas: ausencias.filter(a => a.tipo === 'Falta').length,
    licencas: ausencias.filter(a => a.tipo === 'Licenca').length,
    pendentes: ausencias.filter(a => a.status === 'ABERTA').length
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ABERTA: 'secondary',
      APROVADA: 'default', 
      RECUSADA: 'destructive'
    } as const;
    
    const labels = {
      ABERTA: 'Pendente',
      APROVADA: 'Aprovada',
      RECUSADA: 'Recusada'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleRegistrarAusencia = () => {
    if (!selectedPessoa || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novaAusencia = {
      id: `ausencia-${Date.now()}`,
      pessoaId: selectedPessoa,
      tipo,
      dataInicioISO: dataInicio,
      dataFimISO: dataFim,
      obs: observacao || undefined,
      status: 'ABERTA' as const,
      criadoEm: new Date().toISOString(),
      criadoPor: 'admin'
    };

    // Add to store and log (simplified)
    addLog({
      id: `log-${Date.now()}`,
      tipo: 'AUSENCIA_REGISTRADA',
      pessoaId: selectedPessoa,
      descricao: `${tipo} registrada de ${dataInicio} a ${dataFim}`,
      dataISO: new Date().toISOString(),
      usuario: 'admin'
    });

    toast.success('Ausência registrada com sucesso');
    setIsModalOpen(false);
    // Reset form
    setSelectedPessoa('');
    setDataInicio('');
    setDataFim('');
    setObservacao('');
  };

  const handleAprovarRecusar = (ausenciaId: string, acao: 'aprovar' | 'recusar') => {
    const ausencia = ausencias.find(a => a.id === ausenciaId);
    if (!ausencia) return;

    const novoStatus = acao === 'aprovar' ? 'APROVADA' : 'RECUSADA';
    
    addLog({
      id: `log-${Date.now()}`,
      tipo: `AUSENCIA_${acao.toUpperCase()}DA`,
      pessoaId: ausencia.pessoaId,
      descricao: `Ausência ${acao}da`,
      dataISO: new Date().toISOString(),
      usuario: 'admin'
    });

    toast.success(`Ausência ${acao}da com sucesso`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ausências</h1>
          <p className="text-muted-foreground">Controle de ausências e afastamentos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Ausência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Ausência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Colaborador *</Label>
                  <Select value={selectedPessoa} onValueChange={setSelectedPessoa}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoas.map(pessoa => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={tipo} onValueChange={(value: 'Atestado' | 'Falta' | 'Licenca') => setTipo(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atestado">Atestado Médico</SelectItem>
                      <SelectItem value="Falta">Falta</SelectItem>
                      <SelectItem value="Licenca">Licença</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início *</Label>
                    <Input 
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim *</Label>
                    <Input 
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea 
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações adicionais..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleRegistrarAusencia} className="flex-1">
                    Registrar
                  </Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atestados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.atestados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.faltas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Licenças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{kpis.licencas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{kpis.pendentes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Ausências */}
      <Card>
        <CardHeader>
          <CardTitle>Ausências Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anexo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ausencias.slice(0, 15).map(ausencia => {
                const pessoa = pessoas.find(p => p.id === ausencia.pessoaId);
                const dias = Math.ceil((new Date(ausencia.dataFimISO).getTime() - new Date(ausencia.dataInicioISO).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                return (
                  <TableRow key={ausencia.id}>
                    <TableCell>{pessoa?.nome || 'N/A'}</TableCell>
                    <TableCell>{ausencia.tipo}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(ausencia.dataInicioISO).toLocaleDateString('pt-BR')} - {new Date(ausencia.dataFimISO).toLocaleDateString('pt-BR')}
                        <div className="text-xs text-muted-foreground">{dias} dia{dias > 1 ? 's' : ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ausencia.status)}</TableCell>
                    <TableCell>
                      {ausencia.anexoMock ? (
                        <Badge variant="outline">
                          <FileText className="h-3 w-3 mr-1" />
                          Anexo
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ausencia.status === 'ABERTA' && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleAprovarRecusar(ausencia.id, 'aprovar')}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleAprovarRecusar(ausencia.id, 'recusar')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}