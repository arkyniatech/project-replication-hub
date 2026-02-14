import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Eye, 
  Filter, 
  RotateCcw,
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { useRelatorioUtilizacaoStore } from '@/stores/relatorioUtilizacaoStore';
import { useEquipamentosStore } from '@/stores/equipamentosStore';
import { DetalhamentoModal } from './DetalhamentoModal';
import { useNavigate } from 'react-router-dom';

interface UtilizacaoTabProps {
  periodo: {
    inicio: string;
    fim: string;
  };
}

export function UtilizacaoTab({ periodo }: UtilizacaoTabProps) {
  const navigate = useNavigate();
  const [modalDetalheItem, setModalDetalheItem] = useState<any>(null);
  
  const {
    filtros,
    setFiltros,
    limparFiltros,
    setPeriodo,
    getResumoUtilizacao,
    getKPIs
  } = useRelatorioUtilizacaoStore();
  
  const { lojas, grupos, modelos } = useEquipamentosStore();
  
  // Sync período quando alterado externamente
  useEffect(() => {
    setPeriodo(periodo);
  }, [periodo, setPeriodo]);
  
  const itens = getResumoUtilizacao();
  const kpis = getKPIs();
  
  const modelosFiltrados = filtros.grupoId 
    ? modelos.filter(m => m.grupoId === filtros.grupoId)
    : modelos;
  
  const formatMoney = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  
  const getStatusColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600 bg-green-50';
    if (percent >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Filtros Locais */}
      <Card className="shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Loja
              </label>
              <Select value={filtros.lojaId} onValueChange={(value) => setFiltros({ lojaId: value })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Grupo
              </label>
              <Select 
                value={filtros.grupoId || "todos"} 
                onValueChange={(value) => setFiltros({ grupoId: value === "todos" ? undefined : value, modeloId: undefined })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os grupos</SelectItem>
                  {grupos.map(grupo => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Modelo
              </label>
              <Select 
                value={filtros.modeloId || "todos"} 
                onValueChange={(value) => setFiltros({ modeloId: value === "todos" ? undefined : value })}
                disabled={!filtros.grupoId}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os modelos</SelectItem>
                  {modelosFiltrados.map(modelo => (
                    <SelectItem key={modelo.id} value={modelo.id}>
                      {modelo.nomeComercial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[120px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Tipo
              </label>
              <Select value={filtros.tipoControle} onValueChange={(value: any) => setFiltros({ tipoControle: value })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="SERIE">Série</SelectItem>
                  <SelectItem value="SALDO">Saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Exibição
              </label>
              <Select value={filtros.exibicao} onValueChange={(value: any) => setFiltros({ exibicao: value })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EQUIPAMENTO">Por Equipamento</SelectItem>
                  <SelectItem value="MODELO">Por Modelo</SelectItem>
                  <SelectItem value="GRUPO">Por Grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Ordenar por
              </label>
              <Select value={filtros.ordenarPor} onValueChange={(value: any) => setFiltros({ ordenarPor: value })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILIZACAO">Utilização %</SelectItem>
                  <SelectItem value="DIAS_LOCADOS">Dias Locados</SelectItem>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="CODIGO">Código</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={limparFiltros}
                className="h-8"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
          
          {/* Link para Disponibilidade */}
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/equipamentos/agenda-disponibilidade')}
              className="text-primary hover:text-primary/80"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Disponibilidade (30 dias)
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-primary mr-2" />
              <span className="text-xs font-medium text-muted-foreground">Utilização Média</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatPercent(kpis.utilizacaoMedia)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-amber-600 mr-2" />
              <span className="text-xs font-medium text-muted-foreground">Dias Locados</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {kpis.totalDiasLocados.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-xs font-medium text-muted-foreground">Dias Disponíveis</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {kpis.totalDiasDisponiveis.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600 mr-2" />
              <span className="text-xs font-medium text-muted-foreground">Receita Estimada</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatMoney(kpis.receitaEstimada)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabela */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Utilização por {filtros.exibicao === 'EQUIPAMENTO' ? 'Equipamento' : 
                           filtros.exibicao === 'MODELO' ? 'Modelo' : 'Grupo'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código/Nome</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-center">Dias Período</TableHead>
                  <TableHead className="text-center">Locados</TableHead>
                  <TableHead className="text-center">Manutenção</TableHead>
                  <TableHead className="text-center">Disponíveis</TableHead>
                  <TableHead>Utilização %</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Nenhum equipamento encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium text-sm">{item.codigo}</div>
                          <div className="text-xs text-muted-foreground">{item.nome}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.lojaNome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-center">{item.diasPeriodo}</TableCell>
                      <TableCell className="text-center font-medium">
                        {item.diasLocados}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {item.diasManutencao}
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {item.diasDisponiveis}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${getStatusColor(item.utilizacaoPercent)} px-2 py-0.5 rounded text-xs`}>
                              {formatPercent(item.utilizacaoPercent)}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(item.utilizacaoPercent, 100)} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(item.receitaEstimada)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModalDetalheItem(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Informações da tabela */}
          {itens.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Exibindo {itens.length} {itens.length === 1 ? 'item' : 'itens'} • 
              Período: {new Date(periodo.inicio).toLocaleDateString('pt-BR')} até {new Date(periodo.fim).toLocaleDateString('pt-BR')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Detalhamento */}
      {modalDetalheItem && (
        <DetalhamentoModal
          item={modalDetalheItem}
          onClose={() => setModalDetalheItem(null)}
        />
      )}
    </div>
  );
}