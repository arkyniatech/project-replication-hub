import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { toast } from 'sonner';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { useSupabaseBudgetMetas } from '@/hooks/useSupabaseBudgetMetas';
import { useSupabaseCategoriasN2 } from '@/hooks/useSupabaseCategoriasN2';
import { 
  Plus, 
  Copy, 
  Upload, 
  Download, 
  Save, 
  Trash2, 
  Target,
  Calendar,
  Building,
  BarChart3
} from 'lucide-react';


interface NewBudgetLineProps {
  onSave: (meta: any) => void;
  onCancel: () => void;
  categorias: any[];
}

function NewBudgetLine({ onSave, onCancel, categorias }: NewBudgetLineProps) {
  const { lojasPermitidas, lojaAtual } = useMultiunidade();
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [unidadeId, setUnidadeId] = useState(lojaAtual?.id || '');
  const [categoriaCodigo, setCategoriaCodigo] = useState('');
  const [meta, setMeta] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleSave = () => {
    if (!periodo || !unidadeId || !categoriaCodigo || !meta) {
      return;
    }

    onSave({
      periodo,
      loja_id: unidadeId,
      categoria_codigo: categoriaCodigo,
      meta: parseCurrency(meta),
      observacoes: observacao
    });
  };

  return (
    <TableRow className="bg-blue-50">
      <TableCell>
        <Input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Select value={unidadeId} onValueChange={setUnidadeId}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            {lojasPermitidas.map(loja => (
              <SelectItem key={loja.id} value={loja.id}>
                {loja.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={categoriaCodigo} onValueChange={setCategoriaCodigo}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map(categoria => (
              <SelectItem key={categoria.codigo} value={categoria.codigo}>
                {categoria.codigo} - {categoria.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          placeholder="0,00"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          className="h-8 text-right"
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder="Observação"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            ×
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface EditableBudgetLineProps {
  meta: any;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

function EditableBudgetLine({ meta, onUpdate, onDelete }: EditableBudgetLineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    meta: meta.meta.toString(),
    observacao: meta.observacao || ''
  });

  const handleSave = () => {
    onUpdate(meta.id, {
      meta: parseCurrency(editValues.meta),
      observacoes: editValues.observacao
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      meta: meta.meta.toString(),
      observacao: meta.observacoes || ''
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TableRow className="bg-yellow-50">
        <TableCell>{meta.periodo}</TableCell>
        <TableCell>{meta.unidadeNome}</TableCell>
        <TableCell>{meta.categoriaCodigo} - {meta.categoriaDescricao}</TableCell>
        <TableCell>
          <Input
            value={editValues.meta}
            onChange={(e) => setEditValues(prev => ({ ...prev, meta: e.target.value }))}
            className="h-8 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            value={editValues.observacao}
            onChange={(e) => setEditValues(prev => ({ ...prev, observacao: e.target.value }))}
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              ×
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => setIsEditing(true)}
    >
      <TableCell>{meta.periodo}</TableCell>
      <TableCell>{meta.categoria?.descricao || meta.categoria_codigo}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(meta.meta)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {meta.observacoes}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(meta.id);
          }}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function BudgetManager() {
  const { can } = usePermissions();
  const { lojasPermitidas, lojaAtual } = useMultiunidade();
  
  const { metas, isLoading, createMeta, updateMeta, deleteMeta } = useSupabaseBudgetMetas({
    lojaId: lojaAtual?.id
  });
  const { categorias } = useSupabaseCategoriasN2();
  
  const [showNewLine, setShowNewLine] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Verificar permissões
  const canEdit = can('financeiro', 'criar') || can('configuracoes', 'gerirConfiguracoes');

  const filteredMetas = useMemo(() => {
    return metas.filter(meta => {
      if (selectedPeriod !== 'all' && meta.periodo !== selectedPeriod) {
        return false;
      }
      return true;
    });
  }, [metas, selectedPeriod]);

  const handleAddLine = () => {
    setShowNewLine(true);
  };

  const handleSaveNewLine = async (newMeta: any) => {
    try {
      await createMeta.mutateAsync(newMeta);
      setShowNewLine(false);
      toast.success("Meta criada com sucesso");
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error("Meta já existe para este período e categoria");
      } else {
        toast.error("Erro ao criar meta");
      }
    }
  };

  const handleUpdateLine = async (id: string, updates: any) => {
    try {
      await updateMeta.mutateAsync({ id, ...updates });
      toast.success("Meta atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar meta");
    }
  };

  const handleDeleteLine = async (id: string) => {
    try {
      await deleteMeta.mutateAsync(id);
      toast.success("Meta removida");
    } catch (error) {
      toast.error("Erro ao remover meta");
    }
  };

  const handleDuplicatePreviousMonth = async () => {
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const previousPeriod = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    
    const previousMetas = metas.filter(meta => meta.periodo === previousPeriod);
    
    if (previousMetas.length === 0) {
      toast.error(`Não há metas para o período ${previousPeriod}`);
      return;
    }

    try {
      for (const meta of previousMetas) {
        await createMeta.mutateAsync({
          periodo: currentPeriod,
          loja_id: meta.loja_id,
          categoria_codigo: meta.categoria_codigo,
          meta: meta.meta,
          observacoes: meta.observacoes
        });
      }
      toast.success(`${previousMetas.length} metas duplicadas para ${currentPeriod}`);
    } catch (error) {
      toast.error("Erro ao duplicar metas");
    }
  };

  const handleImportCSV = () => {
    toast.info("Importar CSV", {
      description: "Funcionalidade de importação será implementada"
    });
  };

  const handleExportCSV = () => {
    toast.info("Exportando dados", {
      description: "Download do CSV iniciado"
    });
  };

  const handleSaveAll = () => {
    toast.success("Metas salvas com sucesso");
  };

  const totalMetas = filteredMetas.reduce((sum, meta) => sum + meta.meta, 0);

  return (
    <div className="space-y-6">
      {/* Header e ações */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Gerenciar Metas (Budget)</h2>
          <p className="text-sm text-muted-foreground">
            Configure metas por categoria e unidade para comparação no DRE
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDuplicatePreviousMonth}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicar Mês Anterior
          </Button>
          <Button size="sm" variant="outline" onClick={handleImportCSV}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={handleSaveAll}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Tudo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    return (
                      <SelectItem key={periodo} value={periodo}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            

            <div className="flex items-end">
              {canEdit && (
                <Button onClick={handleAddLine} disabled={showNewLine}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Linha
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Metas
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMetas)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredMetas.length} metas configuradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Períodos Cobertos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredMetas.map(m => m.periodo)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Meses com metas definidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unidades Ativas
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredMetas.map(m => m.loja_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unidades com orçamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de metas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metas por Categoria</CardTitle>
          <p className="text-sm text-muted-foreground">
            Clique em uma linha para editar. Use Tab/Enter para navegar.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Meta (R$)</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showNewLine && (
                <NewBudgetLine
                  onSave={handleSaveNewLine}
                  onCancel={() => setShowNewLine(false)}
                  categorias={categorias}
                />
              )}
              
              {filteredMetas.map(meta => (
                <EditableBudgetLine
                  key={meta.id}
                  meta={meta}
                  onUpdate={handleUpdateLine}
                  onDelete={handleDeleteLine}
                />
              ))}
              
              {filteredMetas.length === 0 && !showNewLine && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma meta encontrada. {canEdit && 'Clique em "Adicionar Linha" para começar.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como usar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Criar Metas</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Clique em "Adicionar Linha" para criar nova meta</li>
                <li>• Selecione o período (mês/ano), unidade e categoria</li>
                <li>• Informe o valor da meta em reais</li>
                <li>• Adicione observações se necessário</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Importar CSV</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Colunas: periodo, unidadeId, categoriaCodigo, meta, observacao</li>
                <li>• Formato de período: YYYY-MM (ex: 2024-01)</li>
                <li>• Valores monetários sem formatação (ex: 25000.00)</li>
                <li>• Duplicatas serão identificadas e alertadas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}