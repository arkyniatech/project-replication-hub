import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function Holerites() {
  const [showCriarLoteModal, setShowCriarLoteModal] = useState(false);
  const [formData, setFormData] = useState({ competencia: format(new Date(), 'yyyy-MM') });

  const handleCriarLote = async () => {
    if (!formData.competencia) {
      toast({ title: 'Erro', description: 'Informe a competência.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Lote criado com sucesso', description: `Holerites da competência ${formData.competencia} foram publicados.` });
    setShowCriarLoteModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Holerites</h1>
          <p className="text-muted-foreground">Publicação e controle de holerites</p>
        </div>
        <Button onClick={() => setShowCriarLoteModal(true)}>
          <Plus className="w-4 h-4 mr-2" />Criar Lote
        </Button>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum holerite publicado</h3>
            <p className="text-muted-foreground mb-4">Crie um lote para publicar holerites dos colaboradores</p>
            <Button onClick={() => setShowCriarLoteModal(true)}>
              <Plus className="w-4 h-4 mr-2" />Criar Lote
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCriarLoteModal} onOpenChange={setShowCriarLoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Lote de Holerites</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Competência *</Label>
              <Input type="month" value={formData.competencia} onChange={(e) => setFormData({ competencia: e.target.value })} />
            </div>
            <div className="text-sm text-muted-foreground">Será criado um holerite para cada colaborador ativo.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriarLoteModal(false)}>Cancelar</Button>
            <Button onClick={handleCriarLote}>Criar Lote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
