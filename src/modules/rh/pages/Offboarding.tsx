import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DoorOpen, Plus, Search, Download } from 'lucide-react';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';

export default function Offboarding() {
  const { can } = useRbacPermissions();
  const { pessoas } = useSupabasePessoas();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNovoDesligamento, setShowNovoDesligamento] = useState(false);

  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Offboarding</h1>
          <p className="text-muted-foreground">Processo de desligamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar</Button>
          {can('rh:pessoas_edit') && (
            <Button size="sm" onClick={() => setShowNovoDesligamento(true)}>
              <Plus className="h-4 w-4 mr-2" />Novo Desligamento
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberto">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum desligamento em andamento</h3>
            <p className="text-muted-foreground">Desligamentos aparecerão aqui quando iniciados</p>
          </div>
        </CardContent>
      </Card>

      {showNovoDesligamento && (
        <Dialog open={showNovoDesligamento} onOpenChange={setShowNovoDesligamento}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Desligamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Colaborador</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                  <SelectContent>
                    {pessoasAtivas.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pedido">Pedido</SelectItem>
                    <SelectItem value="sem_justa">Sem Justa Causa</SelectItem>
                    <SelectItem value="justa">Justa Causa</SelectItem>
                    <SelectItem value="acordo">Acordo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Alvo</label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Textarea placeholder="Observações sobre o desligamento..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNovoDesligamento(false)}>Cancelar</Button>
                <Button>Criar Desligamento</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
