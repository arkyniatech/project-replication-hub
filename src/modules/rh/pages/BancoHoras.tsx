import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Plus, Download } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { toast } from 'sonner';

export default function BancoHoras() {
  const { pessoas } = useSupabasePessoas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState('');
  const [horas, setHoras] = useState('');
  const [tipo, setTipo] = useState<'CREDITO' | 'DEBITO'>('CREDITO');
  const [motivo, setMotivo] = useState('');

  const handleLancarMovimento = () => {
    if (!selectedPessoa || !horas || !motivo) {
      toast.error('Preencha todos os campos');
      return;
    }
    toast.success('Movimento lançado com sucesso');
    setIsModalOpen(false);
    setSelectedPessoa('');
    setHoras('');
    setMotivo('');
  };

  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');

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
              <Button><Plus className="h-4 w-4 mr-2" />Compensar Horas</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançar Movimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={selectedPessoa} onValueChange={setSelectedPessoa}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {pessoasAtivas.map(pessoa => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={(v: 'CREDITO' | 'DEBITO') => setTipo(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREDITO">Crédito</SelectItem>
                        <SelectItem value="DEBITO">Débito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Horas</Label>
                    <Input type="number" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da compensação" />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleLancarMovimento} className="flex-1">Lançar</Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Exportar</Button>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum movimento registrado</h3>
            <p className="text-muted-foreground">Lance créditos ou débitos de horas para os colaboradores</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
