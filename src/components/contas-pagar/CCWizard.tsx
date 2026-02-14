import { useState, useEffect } from 'react';
import { Calendar, Building, Filter, Target, Eye, CheckCircle, ArrowRight, ArrowLeft, FileUp, FileDown, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useSupabaseCategoriasN2 } from '@/hooks/useSupabaseCategoriasN2';
import { useSupabaseFornecedores } from '@/hooks/useSupabaseFornecedores';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { useSupabaseMovimentosPagar } from '@/hooks/useSupabaseMovimentosPagar';
import { getCentrosCusto, findCCPath, getCCPadraoParaCategoria } from '@/lib/centro-custo-utils';
import { formatCurrency } from '@/lib/utils';
import type { CentroCusto } from '@/types';
import { DateRange } from 'react-day-picker';

interface CCWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: {
    periodo?: DateRange;
    lojas?: string[];
    categorias?: string[];
    fornecedores?: string[];
  };
}

interface WizardFilters {
  periodo: DateRange;
  lojas: string[];
  origem: ('parcelas' | 'movimentos')[];
  status: string[];
  categorias: string[];
  fornecedores: string[];
}

interface ItemToUpdate {
  id: string;
  tipo: 'parcela' | 'movimento';
  data: string;
  categoria: string;
  fornecedor: string;
  ccAtual?: string;
  ccSugerido?: string;
  valor: number;
  conciliado?: boolean;
  selected: boolean;
}

export function CCWizard({ isOpen, onClose, initialFilters }: CCWizardProps) {
  const { lojaAtual, lojasPermitidas } = useMultiunidade();
  const { categorias } = useSupabaseCategoriasN2();
  const { fornecedores } = useSupabaseFornecedores();
  const { parcelas } = useSupabaseParcelasPagar({ lojaId: lojaAtual?.id });
  const { updateParcela } = useSupabaseParcelasPagar({ lojaId: lojaAtual?.id });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [filters, setFilters] = useState<WizardFilters>({
    periodo: initialFilters?.periodo || { 
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    },
    lojas: initialFilters?.lojas || [lojaAtual?.id || ''],
    origem: ['parcelas'],
    status: ['a_vencer', 'vencida', 'paga', 'parcial'],
    categorias: initialFilters?.categorias || [],
    fornecedores: initialFilters?.fornecedores || []
  });
  
  const [ruleMode, setRuleMode] = useState<'categoria' | 'fornecedor' | 'misto'>('categoria');
  const [conflictAction, setConflictAction] = useState<'manter' | 'sobrescrever'>('manter');
  const [ignoreReconciled, setIgnoreReconciled] = useState(true);
  const [onlyWithoutCC, setOnlyWithoutCC] = useState(false);
  
  const [items, setItems] = useState<ItemToUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar centros de custo
  useEffect(() => {
    setCentrosCusto(getCentrosCusto());
  }, []);

  const loadPreview = async () => {
    setIsLoading(true);
    
    try {
      const itemsToUpdate: ItemToUpdate[] = [];
      
      // Processar apenas parcelas (movimentos não têm suporte a CC ainda)
      if (filters.origem.includes('parcelas')) {
        const parcelasFiltradas = parcelas.filter(p => {
          if (filters.lojas.length > 0 && !filters.lojas.includes(p.loja_id)) return false;
          if (filters.status.length > 0 && !filters.status.includes(p.status)) return false;
          if (filters.categorias.length > 0 && p.categoria_codigo && !filters.categorias.includes(p.categoria_codigo)) return false;
          if (filters.fornecedores.length > 0 && !filters.fornecedores.includes(p.fornecedor_id)) return false;
          if (onlyWithoutCC && p.cc_id) return false;
          
          const dataVenc = new Date(p.vencimento);
          if (filters.periodo.from && dataVenc < filters.periodo.from) return false;
          if (filters.periodo.to && dataVenc > filters.periodo.to) return false;
          
          return true;
        });
        
        parcelasFiltradas.forEach(p => {
          const ccSugerido = ruleMode === 'categoria' && p.categoria_codigo
            ? getCCPadraoParaCategoria(p.categoria_codigo)
            : undefined;
          
          itemsToUpdate.push({
            id: p.id,
            tipo: 'parcela',
            data: p.vencimento,
            categoria: p.categoria_codigo || '',
            fornecedor: p.fornecedor?.nome || '',
            ccAtual: p.cc_id,
            ccSugerido,
            valor: p.valor,
            selected: true
          });
        });
      }
      
      setItems(itemsToUpdate);
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      toast.error("Erro ao carregar dados para o wizard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    const selectedItems = items.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      toast.error("Nenhum item selecionado");
      return;
    }
    
    setIsLoading(true);
    
    try {
      for (const item of selectedItems) {
        if (item.tipo === 'parcela' && item.ccSugerido) {
          await updateParcela.mutateAsync({
            id: item.id,
            cc_id: item.ccSugerido
          });
        }
      }
      
      toast.success(`${selectedItems.length} item(ns) atualizado(s) com sucesso`);
      onClose();
    } catch (error) {
      console.error('Erro ao aplicar alterações:', error);
      toast.error("Erro ao aplicar alterações");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = items.filter(item => item.selected).length;
  const selectedValue = items.filter(item => item.selected).reduce((sum, item) => sum + item.valor, 0);

  const stepTitles = [
    'Seleção',
    'Regras de Aplicação', 
    'Pré-visualização',
    'Aplicar'
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-w-6xl mx-auto max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Assistente de Centros de Custo
          </DrawerTitle>
          <DrawerDescription>
            Aplique centros de custo em massa por categoria ou fornecedor
          </DrawerDescription>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {stepTitles.map((title, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : index + 1 < currentStep 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1 < currentStep ? '✓' : index + 1}
                </div>
                <span className={`text-sm ${
                  index + 1 === currentStep ? 'font-medium' : 'text-muted-foreground'
                }`}>
                  {title}
                </span>
                {index < stepTitles.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </DrawerHeader>

        <div className="px-6 pb-6 flex-1 overflow-auto">
          {/* Step 1: Seleção */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros de Seleção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Período</Label>
                      <DatePickerWithRange
                        date={filters.periodo}
                        onDateChange={(range) => setFilters(prev => ({ ...prev, periodo: range || { from: new Date(), to: new Date() } }))}
                      />
                    </div>
                    <div>
                      <Label>Lojas</Label>
                      <Select 
                        value={filters.lojas[0] || ''} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, lojas: [value] }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a loja" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojasPermitidas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>
                              {loja.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Origem dos itens</Label>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="parcelas"
                          checked={filters.origem.includes('parcelas')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, origem: [...prev.origem, 'parcelas'] }));
                            } else {
                              setFilters(prev => ({ ...prev, origem: prev.origem.filter(o => o !== 'parcelas') }));
                            }
                          }}
                        />
                        <Label htmlFor="parcelas">Parcelas a pagar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="movimentos"
                          checked={filters.origem.includes('movimentos')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, origem: [...prev.origem, 'movimentos'] }));
                            } else {
                              setFilters(prev => ({ ...prev, origem: prev.origem.filter(o => o !== 'movimentos') }));
                            }
                          }}
                        />
                        <Label htmlFor="movimentos">Movimentos de saída</Label>
                      </div>
                    </div>
                    {filters.origem.includes('movimentos') && (
                      <Alert className="mt-2">
                        <AlertDescription>
                          Ajustar CC em movimentos reabre a conciliação
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categorias</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.codigo} value={cat.codigo}>
                        {cat.codigo} - {cat.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fornecedores</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os fornecedores" />
                        </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(forn => (
                      <SelectItem key={forn.id} value={forn.id}>
                        {forn.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Regras */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Modo de Aplicação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className={`cursor-pointer border-2 ${ruleMode === 'categoria' ? 'border-primary' : 'border-border'}`} 
                          onClick={() => setRuleMode('categoria')}>
                      <CardContent className="p-4 text-center">
                        <Building className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-medium">Por Categoria</h4>
                        <p className="text-sm text-muted-foreground">Usa mapa Categoria→CC</p>
                      </CardContent>
                    </Card>
                    <Card className={`cursor-pointer border-2 ${ruleMode === 'fornecedor' ? 'border-primary' : 'border-border'}`} 
                          onClick={() => setRuleMode('fornecedor')}>
                      <CardContent className="p-4 text-center">
                        <Building className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-medium">Por Fornecedor</h4>
                        <p className="text-sm text-muted-foreground">Mapear fornecedor→CC</p>
                      </CardContent>
                    </Card>
                    <Card className={`cursor-pointer border-2 ${ruleMode === 'misto' ? 'border-primary' : 'border-border'}`} 
                          onClick={() => setRuleMode('misto')}>
                      <CardContent className="p-4 text-center">
                        <Building className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-medium">Misto</h4>
                        <p className="text-sm text-muted-foreground">Fornecedor &gt; Categoria</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Regras de Conflito</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Se item já tem CC</Label>
                        <Select value={conflictAction} onValueChange={(value: 'manter' | 'sobrescrever') => setConflictAction(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manter">Manter CC atual</SelectItem>
                            <SelectItem value="sobrescrever">Sobrescrever</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ignore-reconciled"
                          checked={ignoreReconciled}
                          onCheckedChange={(checked) => setIgnoreReconciled(checked === true)}
                        />
                        <Label htmlFor="ignore-reconciled">Ignorar itens conciliados</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="only-without-cc"
                          checked={onlyWithoutCC}
                          onCheckedChange={(checked) => setOnlyWithoutCC(checked === true)}
                        />
                        <Label htmlFor="only-without-cc">Somente itens sem CC</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Pré-visualização */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    Selecionados: {selectedCount}
                  </Badge>
                  <Badge variant="outline">
                    Valor total: {formatCurrency(selectedValue)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadPreview} disabled={isLoading}>
                    <Eye className="w-4 h-4 mr-2" />
                    Pré-visualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setItems(prev => prev.map(item => ({ ...item, selected: !item.conciliado && !item.ccAtual })));
                  }}>
                    Somente sem CC
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={items.length > 0 && items.every(item => item.selected)}
                            onCheckedChange={(checked) => {
                              setItems(prev => prev.map(item => ({ ...item, selected: !!checked })));
                            }}
                          />
                        </TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>CC Atual → Sugerido</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Carregando dados...
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Clique em "Pré-visualizar" para carregar os dados
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={(checked) => {
                                  setItems(prev => prev.map(i => 
                                    i.id === item.id ? { ...i, selected: !!checked } : i
                                  ));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.tipo === 'parcela' ? 'default' : 'secondary'}>
                                {item.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(item.data).toLocaleDateString()}</TableCell>
                            <TableCell>{item.categoria}</TableCell>
                            <TableCell>{item.fornecedor}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {item.ccAtual ? findCCPath(item.ccAtual) : 'Sem CC'}
                                </span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="text-primary font-medium">
                                  {item.ccSugerido ? findCCPath(item.ccSugerido) : 'Sem CC'}
                                </span>
                                {item.ccAtual !== item.ccSugerido && (
                                  <Badge variant="outline" className="text-xs">Conflito</Badge>
                                )}
                                {item.conciliado && (
                                  <Badge variant="outline" className="text-xs">Conciliado</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(item.valor)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Aplicar */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Confirmar Aplicação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{selectedCount}</div>
                      <div className="text-sm text-muted-foreground">Itens a atualizar</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedValue)}</div>
                      <div className="text-sm text-muted-foreground">Valor total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{ruleMode}</div>
                      <div className="text-sm text-muted-foreground">Regra aplicada</div>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Resumo:</strong> Atualizar {selectedCount} itens • Valor {formatCurrency(selectedValue)} • 
                      Regra: {ruleMode} • Conflitos: {conflictAction}
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="propagate" />
                    <Label htmlFor="propagate">
                      Propagar CC da parcela para movimentos de pagamento vinculados
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              
              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleApply}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aplicar CC
                </Button>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}