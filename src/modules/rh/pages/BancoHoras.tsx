import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Plus, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseBancoHoras } from '../hooks/useSupabaseBancoHoras';
import { toast } from 'sonner';

export default function BancoHoras() {
  const { pessoas } = useSupabasePessoas();
  const { saldos, movimentos, isLoading, lancar } = useSupabaseBancoHoras();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState('');
  const [horas, setHoras] = useState('');
  const [tipo, setTipo] = useState<'CREDITO' | 'DEBITO'>('CREDITO');
  const [motivo, setMotivo] = useState('');

  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');

  const handleLancarMovimento = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === selectedPessoa);
    if (!pessoa || !horas || !motivo) {
      toast.error('Preencha colaborador, horas e motivo.');
      return;
    }
    if (!pessoa.lojaId) {
      toast.error('Colaborador sem loja definida.');
      return;
    }
    try {
      await lancar.mutateAsync({
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        tipo: tipo === 'CREDITO' ? 'credito' : 'debito',
        horas: parseFloat(horas),
        observacao: motivo,
      });
      toast.success('Movimento lançado.');
      setIsModalOpen(false);
      setSelectedPessoa(''); setHoras(''); setMotivo(''); setTipo('CREDITO');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao lançar.');
    }
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

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          {saldos.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {saldos.map((s) => (
                <Card key={s.pessoa_id}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground truncate">{s.nome}</p>
                    <p className={`text-2xl font-bold ${s.saldo < 0 ? 'text-destructive' : ''}`}>
                      {s.saldo.toFixed(1)}h
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg">Movimentos</CardTitle></CardHeader>
            <CardContent>
              {movimentos.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum movimento registrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movimentos.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.pessoa?.nome ?? '—'}</p>
                        <p className="text-sm text-muted-foreground truncate">{m.observacao ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-none">
                        <span className={`text-sm font-medium ${m.tipo === 'credito' ? 'text-green-600' : 'text-destructive'}`}>
                          {m.tipo === 'credito' ? '+' : '−'}{Number(m.horas).toFixed(1)}h
                        </span>
                        <Badge variant="outline">saldo {Number(m.saldo_apos).toFixed(1)}h</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
