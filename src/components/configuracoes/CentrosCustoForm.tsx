import { useState, useEffect } from 'react';
import { Folder, FolderOpen, Plus, Edit2, Trash2, Power, Building, Users, Save, RotateCcw, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { usePermissions } from '@/hooks/usePermissions';
import { CCWizard } from '@/components/contas-pagar/CCWizard';
import { CCCategoryMapping } from '@/components/contas-pagar/CCCategoryMapping';
import type { CentroCusto } from '@/types';

interface CentrosCustoFormProps {
  className?: string;
}

export function CentrosCustoForm({ className }: CentrosCustoFormProps) {
  const { toast } = useToast();
  const { lojaAtual, lojasPermitidas } = useMultiunidade();
  const { can } = usePermissions();
  
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [editingCC, setEditingCC] = useState<Partial<CentroCusto> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'cc' | 'mapping'>('cc');

  // Verificar permissões
  const canEdit = can('configuracoes', 'gerirConfiguracoes');

  // Carregar centros de custo salvos
  useEffect(() => {
    const stored = localStorage.getItem('financeiro.cc');
    if (stored) {
      setCentrosCusto(JSON.parse(stored));
    }
  }, []);

  // Detectar mudanças
  useEffect(() => {
    const originalData = localStorage.getItem('financeiro.cc');
    const currentDataString = JSON.stringify(centrosCusto);
    setHasChanges(currentDataString !== (originalData || '[]'));
  }, [centrosCusto]);

  const handleSalvarTudo = () => {
    localStorage.setItem('financeiro.cc', JSON.stringify(centrosCusto));
    setHasChanges(false);
    toast({
      title: "Centros de Custo salvos",
      description: "Configurações atualizadas com sucesso!"
    });
  };

  const handleReverter = () => {
    const stored = localStorage.getItem('financeiro.cc');
    if (stored) {
      setCentrosCusto(JSON.parse(stored));
    } else {
      setCentrosCusto([]);
    }
    setHasChanges(false);
    toast({
      title: "Alterações revertidas",
      description: "Dados restaurados ao último salvamento"
    });
  };

  const handleSaveCC = () => {
    if (!editingCC?.codigo || !editingCC?.nome) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha código e nome do centro de custo",
        variant: "destructive"
      });
      return;
    }

    // Verificar duplicidade de código
    const existingCC = centrosCusto.find(cc => 
      cc.codigo === editingCC.codigo && cc.id !== editingCC.id
    );

    if (existingCC) {
      toast({
        title: "Código já existe",
        description: "Este código já está sendo usado por outro centro de custo",
        variant: "destructive"
      });
      return;
    }

    if (editingCC.id) {
      // Editar
      setCentrosCusto(prev => prev.map(cc => 
        cc.id === editingCC.id 
          ? { ...cc, ...editingCC, updatedAt: new Date().toISOString() }
          : cc
      ));
      toast({
        title: "Centro de Custo atualizado",
        description: `${editingCC.codigo} - ${editingCC.nome}`
      });
    } else {
      // Criar
      const newCC: CentroCusto = {
        id: Date.now().toString(),
        codigo: editingCC.codigo,
        nome: editingCC.nome,
        unidadeId: editingCC.unidadeId,
        ativo: editingCC.ativo ?? true,
        parentId: editingCC.parentId,
        observacoes: editingCC.observacoes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setCentrosCusto(prev => [...prev, newCC]);
      toast({
        title: "Centro de Custo criado",
        description: `${newCC.codigo} - ${newCC.nome}`
      });
    }

    setEditingCC(null);
    setIsDialogOpen(false);
  };

  const handleDeleteCC = (cc: CentroCusto) => {
    // Verificar se está sendo usado (mock - em produção verificaria nas parcelas/movimentos)
    const hasChildren = centrosCusto.some(item => item.parentId === cc.id);
    
    if (hasChildren) {
      toast({
        title: "Não é possível excluir",
        description: "Este centro de custo possui filhos vinculados",
        variant: "destructive"
      });
      return;
    }

    setCentrosCusto(prev => prev.filter(item => item.id !== cc.id));
    toast({
      title: "Centro de Custo excluído",
      description: `${cc.codigo} - ${cc.nome}`
    });
  };

  const toggleAtivo = (cc: CentroCusto) => {
    setCentrosCusto(prev => prev.map(item => 
      item.id === cc.id 
        ? { ...item, ativo: !item.ativo, updatedAt: new Date().toISOString() }
        : item
    ));
    
    toast({
      title: cc.ativo ? "Centro de Custo desativado" : "Centro de Custo ativado",
      description: `${cc.codigo} - ${cc.nome}`
    });
  };

  const getCCPath = (cc: CentroCusto): string => {
    const parent = centrosCusto.find(item => item.id === cc.parentId);
    return parent ? `${parent.nome} › ${cc.nome}` : cc.nome;
  };

  const getCCPais = () => centrosCusto.filter(cc => !cc.parentId);
  const getCCFilhos = (parentId: string) => centrosCusto.filter(cc => cc.parentId === parentId);

  if (!canEdit) {
    return (
      <div className="text-center py-8">
        <Alert>
          <AlertDescription>
            Você não tem permissão para gerenciar centros de custo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Tabs */}
      <div className="flex items-center space-x-1 mb-6">
        <Button
          variant={activeTab === 'cc' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('cc')}
          size="sm"
        >
          <Folder className="w-4 h-4 mr-2" />
          Centros de Custo
        </Button>
        <Button
          variant={activeTab === 'mapping' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('mapping')}
          size="sm"
        >
          <Building className="w-4 h-4 mr-2" />
          Mapa Categoria→CC
        </Button>
      </div>

      {activeTab === 'cc' && (
        <>
          {/* Barra de Ações */}
          <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Centros de Custo</h3>
          {hasChanges && <Badge variant="secondary">Não salvos</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReverter} size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reverter
            </Button>
          )}
          <Button onClick={handleSalvarTudo} size="sm" disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Tudo
          </Button>
          <Button onClick={() => setShowWizard(true)} variant="outline" size="sm">
            <Target className="w-4 h-4 mr-2" />
            Assistente de CC
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCC({ ativo: true })}>
                <Plus className="w-4 h-4 mr-2" />
                Novo CC
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCC?.id ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
                </DialogTitle>
                <DialogDescription>
                  Configure os dados do centro de custo. Máximo 2 níveis (Pai › Filho).
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      placeholder="ex: OPER01"
                      value={editingCC?.codigo || ''}
                      onChange={(e) => setEditingCC(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      placeholder="ex: Operações"
                      value={editingCC?.nome || ''}
                      onChange={(e) => setEditingCC(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parent">Centro de Custo Pai</Label>
                     <Select 
                       value={editingCC?.parentId || 'NENHUM'} 
                       onValueChange={(value) => setEditingCC(prev => ({ ...prev, parentId: value === 'NENHUM' ? undefined : value }))}
                     >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum (nível pai)" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="NENHUM">Nenhum (nível pai)</SelectItem>
                         {getCCPais().map(cc => (
                          <SelectItem key={cc.id} value={cc.id} disabled={cc.id === editingCC?.id}>
                            {cc.codigo} - {cc.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="unidade">Unidade</Label>
                     <Select 
                       value={editingCC?.unidadeId || 'GLOBAL'} 
                       onValueChange={(value) => setEditingCC(prev => ({ ...prev, unidadeId: value === 'GLOBAL' ? undefined : value }))}
                     >
                      <SelectTrigger>
                        <SelectValue placeholder="Global (todas)" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="GLOBAL">Global (todas as unidades)</SelectItem>
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
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Notas sobre este centro de custo..."
                    value={editingCC?.observacoes || ''}
                    onChange={(e) => setEditingCC(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={editingCC?.ativo ?? true}
                    onCheckedChange={(checked) => setEditingCC(prev => ({ ...prev, ativo: checked }))}
                  />
                  <Label htmlFor="ativo">Centro de Custo ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCC}>
                  {editingCC?.id ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Centros de Custo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Estrutura de Centros de Custo
          </CardTitle>
          <CardDescription>
            Organize seus centros de custo em até 2 níveis hierárquicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {centrosCusto.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Nenhum centro de custo cadastrado</p>
              <p className="text-sm">Clique em "Novo CC" para começar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {getCCPais().map(ccPai => (
                <div key={ccPai.id}>
                  {/* CC Pai */}
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ccPai.codigo}</span>
                          <span>{ccPai.nome}</span>
                          {!ccPai.ativo && <Badge variant="outline">Inativo</Badge>}
                          {ccPai.unidadeId && (
                            <Badge variant="secondary">
                              {lojasPermitidas.find(l => l.id === ccPai.unidadeId)?.nome || 'Unidade'}
                            </Badge>
                          )}
                        </div>
                        {ccPai.observacoes && (
                          <p className="text-sm text-muted-foreground">{ccPai.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCC(ccPai);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAtivo(ccPai)}
                      >
                        <Power className={`w-4 h-4 ${ccPai.ativo ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCC(ccPai)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* CC Filhos */}
                  {getCCFilhos(ccPai.id).map(ccFilho => (
                    <div key={ccFilho.id} className="ml-8 flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Folder className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{ccFilho.codigo}</span>
                            <span className="text-sm">{ccFilho.nome}</span>
                            {!ccFilho.ativo && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                            {ccFilho.unidadeId && (
                              <Badge variant="secondary" className="text-xs">
                                {lojasPermitidas.find(l => l.id === ccFilho.unidadeId)?.nome || 'Unidade'}
                              </Badge>
                            )}
                          </div>
                          {ccFilho.observacoes && (
                            <p className="text-xs text-muted-foreground">{ccFilho.observacoes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCC(ccFilho);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAtivo(ccFilho)}
                        >
                          <Power className={`w-3 h-3 ${ccFilho.ativo ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCC(ccFilho)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre uso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como usar Centros de Custo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Títulos:</strong> CC aplicado como padrão para todas as parcelas</p>
          <p>• <strong>Parcelas:</strong> CC individual sobrepõe o CC do título</p>
          <p>• <strong>Movimentos:</strong> Herdam CC da parcela, editável em ajustes</p>
          <p>• <strong>Relatórios:</strong> Filtre por CC no DRE para análises detalhadas</p>
          <p>• <strong>Hierarquia:</strong> Máximo 2 níveis (Pai › Filho)</p>
        </CardContent>
      </Card>
        </>
      )}

      {activeTab === 'mapping' && (
        <CCCategoryMapping />
      )}

      {/* CC Wizard */}
      <CCWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </div>
  );
}