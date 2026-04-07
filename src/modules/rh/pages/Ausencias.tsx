import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Download } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { toast } from 'sonner';

export default function Ausencias() {
  const { pessoas } = useSupabasePessoas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ausências</h1>
          <p className="text-muted-foreground">Controle de atestados, faltas e licenças</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Registrar Ausência</Button>
            </DialogTrigger>
            <DialogContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {pessoasAtivas.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atestado">Atestado</SelectItem>
                      <SelectItem value="Falta">Falta</SelectItem>
                      <SelectItem value="Licenca">Licença</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Data Início</Label><Input type="date" /></div>
                  <div className="space-y-2"><Label>Data Fim</Label><Input type="date" /></div>
                </div>
                <div className="space-y-2"><Label>Observação</Label><Textarea placeholder="Observações..." /></div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">Registrar</Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Exportar</Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma ausência registrada</h3>
            <p className="text-muted-foreground">Registre atestados, faltas e licenças dos colaboradores</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
