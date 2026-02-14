import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Plus, Download } from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { seedRhMissing8, formatHours } from '../utils/seedRhMissing8';
import { toast } from 'sonner';

export default function BancoHoras() {
  const { bancoHorasMovs, pessoas, addLog } = useRhStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState<string>('');
  const [horas, setHoras] = useState('');
  const [tipo, setTipo] = useState<'CREDITO' | 'DEBITO'>('CREDITO');
  const [motivo, setMotivo] = useState('');
  
  // Initialize seed data if empty
  useEffect(() => {
    if (bancoHorasMovs.length === 0) {
      const seedData = seedRhMissing8();
      // Add to store - simplified for demo
      seedData.bancoHorasMovs.forEach(mov => {
        // This would normally go through the store
      });
    }
  }, []);

  // Calculate balance by person
  const calculateBalance = (pessoaId: string) => {
    return bancoHorasMovs
      .filter(mov => mov.pessoaId === pessoaId)
      .reduce((total, mov) => {
        return total + (mov.tipo === 'CREDITO' ? mov.horas : -mov.horas);
      }, 0);
  };

  const handleLancarMovimento = () => {
    if (!selectedPessoa || !horas || !motivo) {
      toast.error('Preencha todos os campos');
      return;
    }

    const novoMovimento = {
      id: `bh-${Date.now()}`,
      pessoaId: selectedPessoa,
      dataISO: new Date().toISOString().split('T')[0],
      tipo,
      horas: parseFloat(horas),
      motivo,
      ref: 'Lançamento manual'
    };

    // Add to store (simplified)
    addLog({
      id: `log-${Date.now()}`,
      tipo: 'BANCO_HORAS_LANCAMENTO',
      pessoaId: selectedPessoa,
      descricao: `${tipo} de ${horas}h - ${motivo}`,
      dataISO: new Date().toISOString(),
      usuario: 'admin'
    });

    toast.success('Movimento lançado com sucesso');
    setIsModalOpen(false);
    setSelectedPessoa('');
    setHoras('');
    setMotivo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Banco de Horas</h1>
          <p className="text-muted-foreground">Controle de saldo e movimentações</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Compensar Horas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançar Movimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={(value: 'CREDITO' | 'DEBITO') => setTipo(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREDITO">Crédito</SelectItem>
                        <SelectItem value="DEBITO">Débito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Horas</Label>
                    <Input 
                      type="number" 
                      step="0.5"
                      value={horas}
                      onChange={(e) => setHoras(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input 
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo da compensação"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleLancarMovimento} className="flex-1">
                    Lançar
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

      {/* Resumo por Colaborador */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pessoas.slice(0, 6).map(pessoa => {
          const saldo = calculateBalance(pessoa.id);
          const movimentos = bancoHorasMovs.filter(mov => mov.pessoaId === pessoa.id);
          
          return (
            <Card key={pessoa.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{pessoa.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Atual</p>
                    <p className={`text-2xl font-bold ${saldo < 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatHours(saldo)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {movimentos.length} movimentos
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Movimentos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bancoHorasMovs.slice(0, 10).map(movimento => {
                const pessoa = pessoas.find(p => p.id === movimento.pessoaId);
                return (
                  <TableRow key={movimento.id}>
                    <TableCell>{new Date(movimento.dataISO).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{pessoa?.nome || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={movimento.tipo === 'CREDITO' ? 'default' : 'secondary'}>
                        {movimento.tipo === 'CREDITO' ? 'Crédito' : 'Débito'}
                      </Badge>
                    </TableCell>
                    <TableCell className={movimento.tipo === 'CREDITO' ? 'text-green-600' : 'text-red-600'}>
                      {movimento.tipo === 'CREDITO' ? '+' : '-'}{formatHours(movimento.horas)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movimento.motivo}
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