import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileText, Download, Eye } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { Holerite } from '../../types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function PortalHolerites() {
  const { 
    holerites, 
    pessoas,
    marcarHoleriteLido 
  } = useRhStore();
  
  const [filtros, setFiltros] = useState({
    competencia: '',
    ano: new Date().getFullYear().toString()
  });
  
  const [selectedHolerite, setSelectedHolerite] = useState<Holerite | null>(null);

  // Mock - colaborador atual
  const colaboradorAtual = pessoas.find(p => p.situacao === 'ativo') || pessoas[0];
  
  const holeritesDoColaborador = useMemo(() => {
    if (!colaboradorAtual) return [];
    
    return holerites
      .filter(h => h.pessoaId === colaboradorAtual.id && h.status === 'publicado')
      .filter(h => {
        const [ano, mes] = h.comp.split('-');
        return (
          (filtros.ano === 'all' || ano === filtros.ano) &&
          (filtros.competencia === '' || h.comp.includes(filtros.competencia))
        );
      })
      .sort((a, b) => b.comp.localeCompare(a.comp));
  }, [holerites, colaboradorAtual, filtros]);

  const anosDisponiveis = useMemo(() => {
    const anos = Array.from(new Set(
      holerites
        .filter(h => h.pessoaId === colaboradorAtual?.id)
        .map(h => h.comp.split('-')[0])
    )).sort().reverse();
    
    return anos;
  }, [holerites, colaboradorAtual]);

  const handleVisualizarHolerite = (holerite: Holerite) => {
    setSelectedHolerite(holerite);
    
    // Marcar como lido se ainda não foi
    if (!holerite.lido) {
      marcarHoleriteLido(holerite.id);
      toast({
        title: 'Holerite visualizado',
        description: 'O holerite foi marcado como lido.'
      });
    }
  };

  const handleBaixarHolerite = (holerite: Holerite) => {
    // Mock download
    const link = document.createElement('a');
    link.href = '#'; // Mock URL
    link.download = `holerite_${holerite.comp}.pdf`;
    link.click();

    toast({
      title: 'Download iniciado',
      description: 'O holerite está sendo baixado.'
    });

    // Marcar como lido se ainda não foi
    if (!holerite.lido) {
      marcarHoleriteLido(holerite.id);
    }
  };

  if (!colaboradorAtual) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Holerites</h1>
          <p className="text-muted-foreground">Consulta de holerites</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Colaborador não encontrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Holerites</h1>
        <p className="text-muted-foreground">
          Olá, {colaboradorAtual.nome}! Aqui estão seus holerites disponíveis.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Buscar por competência..."
                value={filtros.competencia}
                onChange={(e) => setFiltros({ ...filtros, competencia: e.target.value })}
              />
            </div>
            
            <div>
              <Select
                value={filtros.ano}
                onValueChange={(value) => setFiltros({ ...filtros, ano: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {anosDisponiveis.map((ano) => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Holerites */}
      <Card>
        <CardHeader>
          <CardTitle>Holerites Disponíveis ({holeritesDoColaborador.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {holeritesDoColaborador.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum holerite disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {holeritesDoColaborador.map((holerite) => (
                <Card key={holerite.id} className="relative">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {format(new Date(`${holerite.comp}-01`), 'MMMM yyyy')}
                        </h4>
                        {!holerite.lido && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            Novo
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Competência: {holerite.comp}</p>
                        <p>Publicado em: {format(new Date(holerite.publicadoEmISO), 'dd/MM/yyyy')}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleVisualizarHolerite(holerite)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBaixarHolerite(holerite)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet de Detalhes do Holerite */}
      <Sheet open={!!selectedHolerite} onOpenChange={() => setSelectedHolerite(null)}>
        <SheetContent className="w-[600px] sm:w-[600px]">
          {selectedHolerite && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Holerite - {format(new Date(`${selectedHolerite.comp}-01`), 'MMMM yyyy')}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Mock do conteúdo do holerite */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium">Colaborador</label>
                      <p>{colaboradorAtual.nome}</p>
                    </div>
                    <div>
                      <label className="font-medium">Matrícula</label>
                      <p>{colaboradorAtual.matricula}</p>
                    </div>
                    <div>
                      <label className="font-medium">Cargo</label>
                      <p>{colaboradorAtual.cargo}</p>
                    </div>
                    <div>
                      <label className="font-medium">Competência</label>
                      <p>{selectedHolerite.comp}</p>
                    </div>
                  </div>

                  {/* Mock dos valores */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Demonstrativo de Pagamento (Mock)</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Salário Base</span>
                        <span>R$ 3.500,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vale Transporte</span>
                        <span>R$ 220,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vale Refeição</span>
                        <span>R$ 550,00</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>Total de Proventos</span>
                        <span>R$ 4.270,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>INSS</span>
                        <span>-R$ 280,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IRRF</span>
                        <span>-R$ 120,00</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>Total de Descontos</span>
                        <span>-R$ 400,00</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-bold text-lg">
                        <span>Valor Líquido</span>
                        <span>R$ 3.870,00</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleBaixarHolerite(selectedHolerite)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}