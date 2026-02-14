import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Download } from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// Mock de holerite para demonstração
interface HoleriteMock {
  id: string;
  pessoaId: string;
  competencia: string;
  status: 'publicado' | 'arquivado';
  lido: boolean;
  publicadoEm: string;
}

export default function Holerites() {
  const { pessoas } = useRhStore();
  
  const [showCriarLoteModal, setShowCriarLoteModal] = useState(false);
  const [formData, setFormData] = useState({
    competencia: format(new Date(), 'yyyy-MM')
  });

  // Mock de holerites para demonstração
  const holerites: HoleriteMock[] = [
    {
      id: '1',
      pessoaId: pessoas[0]?.id || '1',
      competencia: '2024-11',
      status: 'publicado',
      lido: false,
      publicadoEm: new Date().toISOString()
    },
    {
      id: '2',
      pessoaId: pessoas[1]?.id || '2',
      competencia: '2024-11',
      status: 'publicado',
      lido: true,
      publicadoEm: new Date().toISOString()
    }
  ];

  const handleCriarLote = async () => {
    if (!formData.competencia) {
      toast({
        title: 'Erro',
        description: 'Informe a competência.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Lote criado com sucesso',
      description: `Holerites da competência ${formData.competencia} foram publicados.`
    });

    setShowCriarLoteModal(false);
  };

  const getStatusBadge = (status: HoleriteMock['status']) => {
    switch (status) {
      case 'publicado':
        return <Badge variant="default" className="bg-green-100 text-green-800">Publicado</Badge>;
      case 'arquivado':
        return <Badge variant="secondary">Arquivado</Badge>;
    }
  };

  const getPercentualLeitura = () => {
    const total = holerites.length;
    const lidos = holerites.filter(h => h.lido).length;
    return total > 0 ? Math.round((lidos / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Holerites</h1>
          <p className="text-muted-foreground">Publicação e controle de holerites</p>
        </div>
        <Button onClick={() => setShowCriarLoteModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Lote
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{holerites.length}</p>
                <p className="text-sm text-muted-foreground">Holerites Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">{getPercentualLeitura()}%</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{holerites.filter(h => h.lido).length}</p>
                <p className="text-sm text-muted-foreground">Visualizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">!</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{holerites.filter(h => !h.lido).length}</p>
                <p className="text-sm text-muted-foreground">Não Visualizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Holerites por Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle>Holerites por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pessoas.slice(0, 5).map((pessoa) => {
              const holeritePessoa = holerites.find(h => h.pessoaId === pessoa.id);
              
              return (
                <div key={pessoa.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{pessoa.nome}</p>
                      <p className="text-sm text-muted-foreground">{pessoa.cargo}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {holeritePessoa ? (
                      <>
                        <div className="text-center">
                          <p className="text-sm font-medium">{holeritePessoa.competencia}</p>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(holeritePessoa.status)}
                            {holeritePessoa.lido ? (
                              <Badge variant="outline" className="text-xs">Lido</Badge>
                            ) : (
                              <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">Novo</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Nenhum holerite</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação de Lote */}
      <Dialog open={showCriarLoteModal} onOpenChange={setShowCriarLoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Lote de Holerites</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Competência *</Label>
              <Input
                type="month"
                value={formData.competencia}
                onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Será criado um holerite para cada colaborador ativo.
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriarLoteModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarLote}>
              Criar Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}