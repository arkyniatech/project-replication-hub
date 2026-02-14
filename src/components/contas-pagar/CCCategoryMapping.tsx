import { useState, useEffect } from 'react';
import { Building, Save, FileUp, FileDown, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getCentrosCusto, findCCPath } from '@/lib/centro-custo-utils';
import type { CentroCusto } from '@/types';

interface CCCategoryMappingProps {
  className?: string;
}

interface CategoryMapping {
  categoriaCodigo: string;
  categoriaNome: string;
  ccId?: string;
}

export function CCCategoryMapping({ className }: CCCategoryMappingProps) {
  const { toast } = useToast();
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Mock de categorias N2
  const mockCategorias = [
    { codigo: 'A5.01', nome: 'Manutenção de Equipamentos' },
    { codigo: 'A5.02', nome: 'Combustíveis e Lubrificantes' },
    { codigo: 'A5.03', nome: 'Material de Consumo' },
    { codigo: 'A5.04', nome: 'Serviços Terceirizados' },
    { codigo: 'A5.05', nome: 'Despesas Administrativas' },
    { codigo: 'A5.06', nome: 'Energia Elétrica' },
    { codigo: 'A5.07', nome: 'Telecomunicações' },
    { codigo: 'A5.08', nome: 'Seguros e Taxas' }
  ];

  useEffect(() => {
    setCentrosCusto(getCentrosCusto());
    loadMappings();
  }, []);

  const loadMappings = () => {
    try {
      const configFinanceiro = localStorage.getItem('config.financeiro');
      const ccPadraoMap = configFinanceiro ? JSON.parse(configFinanceiro).ccPadraoPorCategoria || {} : {};
      
      const mappingsData: CategoryMapping[] = mockCategorias.map(cat => ({
        categoriaCodigo: cat.codigo,
        categoriaNome: cat.nome,
        ccId: ccPadraoMap[cat.codigo]
      }));
      
      setMappings(mappingsData);
    } catch (error) {
      console.error('Erro ao carregar mapeamentos:', error);
      setMappings(mockCategorias.map(cat => ({
        categoriaCodigo: cat.codigo,
        categoriaNome: cat.nome,
        ccId: undefined
      })));
    }
  };

  const detectChanges = () => {
    try {
      const configFinanceiro = localStorage.getItem('config.financeiro');
      const originalMap = configFinanceiro ? JSON.parse(configFinanceiro).ccPadraoPorCategoria || {} : {};
      
      const currentMap: Record<string, string | undefined> = {};
      mappings.forEach(mapping => {
        if (mapping.ccId) {
          currentMap[mapping.categoriaCodigo] = mapping.ccId;
        }
      });
      
      const hasChanges = JSON.stringify(originalMap) !== JSON.stringify(currentMap);
      setHasChanges(hasChanges);
    } catch (error) {
      console.error('Erro ao detectar mudanças:', error);
    }
  };

  useEffect(() => {
    detectChanges();
  }, [mappings]);

  const handleSave = () => {
    try {
      const currentConfig = localStorage.getItem('config.financeiro');
      const config = currentConfig ? JSON.parse(currentConfig) : {};
      
      const ccPadraoMap: Record<string, string> = {};
      mappings.forEach(mapping => {
        if (mapping.ccId) {
          ccPadraoMap[mapping.categoriaCodigo] = mapping.ccId;
        }
      });
      
      config.ccPadraoPorCategoria = ccPadraoMap;
      localStorage.setItem('config.financeiro', JSON.stringify(config));
      
      setHasChanges(false);
      toast({
        title: "Mapeamento salvo",
        description: "Configurações de CC por categoria atualizadas"
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    }
  };

  const handleRevert = () => {
    loadMappings();
    toast({
      title: "Alterações revertidas",
      description: "Dados restaurados ao último salvamento"
    });
  };

  const updateMapping = (categoriaCodigo: string, ccId?: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.categoriaCodigo === categoriaCodigo 
        ? { ...mapping, ccId }
        : mapping
    ));
  };

  const clearMapping = (categoriaCodigo: string) => {
    updateMapping(categoriaCodigo, undefined);
  };

  const exportCSV = () => {
    const csvContent = [
      'Categoria,CC_Codigo,CC_Nome',
      ...mappings.map(mapping => {
        const cc = centrosCusto.find(c => c.id === mapping.ccId);
        return `${mapping.categoriaCodigo},${cc?.codigo || ''},${cc?.nome || ''}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mapeamento-categoria-cc.csv';
    link.click();

    toast({
      title: "CSV exportado",
      description: "Arquivo de mapeamento salvo"
    });
  };

  const mappedCount = mappings.filter(m => m.ccId).length;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Mapa Categoria N2 → CC
                {hasChanges && <Badge variant="secondary">Não salvos</Badge>}
              </CardTitle>
              <CardDescription>
                Configure o centro de custo padrão para cada categoria de despesa ({mappedCount}/{mappings.length} mapeadas)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm">
                <FileUp className="w-4 h-4 mr-2" />
                Importar CSV
              </Button>
              {hasChanges && (
                <Button variant="outline" onClick={handleRevert} size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reverter
                </Button>
              )}
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Nome da Categoria</TableHead>
                <TableHead>Centro de Custo Padrão</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(mapping => (
                <TableRow key={mapping.categoriaCodigo}>
                  <TableCell className="font-mono">
                    {mapping.categoriaCodigo}
                  </TableCell>
                  <TableCell>{mapping.categoriaNome}</TableCell>
                  <TableCell>
                     <Select
                       value={mapping.ccId || 'NENHUM'}
                       onValueChange={(value) => updateMapping(mapping.categoriaCodigo, value === 'NENHUM' ? undefined : value)}
                     >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Nenhum CC padrão" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="NENHUM">Nenhum CC padrão</SelectItem>
                         {centrosCusto
                          .filter(cc => cc.ativo)
                          .sort((a, b) => findCCPath(a.id).localeCompare(findCCPath(b.id)))
                          .map(cc => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {findCCPath(cc.id)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping.ccId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearMapping(mapping.categoriaCodigo)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Como funciona o mapeamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Auto-aplicação:</strong> Ao criar títulos/parcelas, CC será aplicado automaticamente pela categoria</p>
          <p>• <strong>Prioridade:</strong> CC manual na parcela sobrepõe o CC do título e da categoria</p>
          <p>• <strong>Movimentos:</strong> Herdam CC da parcela; se vazio, tenta aplicar pela categoria</p>
          <p>• <strong>Assistente CC:</strong> Usa este mapa no modo "Por Categoria" para aplicação em massa</p>
        </CardContent>
      </Card>
    </div>
  );
}