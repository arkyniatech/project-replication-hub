// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface DepreciacaoEquipamento {
  id: string;
  codigo_interno: string;
  modelo_nome: string;
  grupo_nome: string;
  valor_aquisicao: number;
  data_aquisicao: string;
  vida_util_meses: number;
  meses_uso: number;
  depreciacao_mensal: number;
  depreciacao_acumulada: number;
  valor_contabil: number;
  valor_residual: number;
  percentual_depreciado: number;
}

export default function AnalisePatrimonial() {
  const { lojaAtual } = useMultiunidade();
  const { equipamentos } = useSupabaseEquipamentos(lojaAtual?.id);
  const { grupos } = useSupabaseGrupos();
  const { modelos } = useSupabaseModelos();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "totalmente_depreciado">("todos");

  // Query para buscar dados de depreciação
  const { data: depreciacaoData = [], isLoading, error: depError } = useQuery({
    queryKey: ["equipamentos-depreciacao", lojaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamentos_depreciacao" as any)
        .select("*")
        .order("percentual_depreciado", { ascending: false });

      if (error) {
        console.warn("[AnalisePatrimonial] view ausente ou sem permissão:", error);
        return [] as DepreciacaoEquipamento[];
      }
      return ((data || []) as unknown) as DepreciacaoEquipamento[];
    },
    enabled: !!lojaAtual?.id,
    retry: false,
  });

  // KPIs calculados
  const kpis = useMemo(() => {
    const totalAquisicao = depreciacaoData.reduce((sum, eq) => sum + (eq.valor_aquisicao || 0), 0);
    const totalContabil = depreciacaoData.reduce((sum, eq) => sum + (eq.valor_contabil || 0), 0);
    const totalDepreciado = depreciacaoData.reduce((sum, eq) => sum + (eq.depreciacao_acumulada || 0), 0);
    const totalEquipamentos = depreciacaoData.length;
    const totalmenteDepreciados = depreciacaoData.filter(eq => eq.percentual_depreciado >= 100).length;

    return {
      totalAquisicao,
      totalContabil,
      totalDepreciado,
      totalEquipamentos,
      totalmenteDepreciados,
      percentualDepreciacao: totalAquisicao > 0 ? (totalDepreciado / totalAquisicao) * 100 : 0,
    };
  }, [depreciacaoData]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    let filtered = depreciacaoData;

    if (searchTerm) {
      filtered = filtered.filter(
        (eq) =>
          eq.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eq.modelo_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (grupoFilter) {
      filtered = filtered.filter((eq) => {
        const equipamento = equipamentos.find(e => e.codigo_interno === eq.codigo_interno);
        return equipamento?.grupo_id === grupoFilter;
      });
    }

    if (statusFilter === "ativo") {
      filtered = filtered.filter((eq) => eq.percentual_depreciado < 100);
    } else if (statusFilter === "totalmente_depreciado") {
      filtered = filtered.filter((eq) => eq.percentual_depreciado >= 100);
    }

    return filtered;
  }, [depreciacaoData, searchTerm, grupoFilter, statusFilter, equipamentos]);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const exportToCSV = () => {
    const headers = [
      "Código Interno",
      "Modelo",
      "Grupo",
      "Valor Aquisição",
      "Data Aquisição",
      "Vida Útil (meses)",
      "Meses em Uso",
      "Depreciação Mensal",
      "Depreciação Acumulada",
      "Valor Contábil",
      "% Depreciado",
    ];

    const rows = filteredData.map((eq) => [
      eq.codigo_interno,
      eq.modelo_nome,
      eq.grupo_nome,
      eq.valor_aquisicao.toFixed(2),
      eq.data_aquisicao,
      eq.vida_util_meses,
      eq.meses_uso.toFixed(1),
      eq.depreciacao_mensal.toFixed(2),
      eq.depreciacao_acumulada.toFixed(2),
      eq.valor_contabil.toFixed(2),
      eq.percentual_depreciado.toFixed(1) + "%",
    ]);

    const csvContent =
      "\ufeff" + // BOM for UTF-8
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analise_patrimonial_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando análise patrimonial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Análise Patrimonial</h1>
          <p className="text-muted-foreground">
            Depreciação e valor contábil dos equipamentos
            {lojaAtual && ` - ${lojaAtual.nome}`}
          </p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Equipamentos</p>
                <p className="text-2xl font-bold">{kpis.totalEquipamentos}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor de Aquisição</p>
                <p className="text-2xl font-bold">{formatMoney(kpis.totalAquisicao)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Contábil Atual</p>
                <p className="text-2xl font-bold">{formatMoney(kpis.totalContabil)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Depreciação Acumulada</p>
                <p className="text-2xl font-bold">{formatMoney(kpis.totalDepreciado)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.percentualDepreciacao.toFixed(1)}% do total
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totalmente Depreciados</p>
                <p className="text-2xl font-bold">{kpis.totalmenteDepreciados}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.totalEquipamentos > 0
                    ? ((kpis.totalmenteDepreciados / kpis.totalEquipamentos) * 100).toFixed(1)
                    : 0}
                  % do total
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={grupoFilter} onValueChange={setGrupoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os Grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os Grupos</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos (&lt; 100%)</SelectItem>
                <SelectItem value="totalmente_depreciado">Totalmente Depreciados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Equipamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Equipamentos ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-3 font-medium">Código</th>
                  <th className="p-3 font-medium">Modelo / Grupo</th>
                  <th className="p-3 font-medium text-right">Aquisição</th>
                  <th className="p-3 font-medium text-right">Data Aquisição</th>
                  <th className="p-3 font-medium text-right">Vida Útil</th>
                  <th className="p-3 font-medium text-right">Meses de Uso</th>
                  <th className="p-3 font-medium text-right">Depreciação</th>
                  <th className="p-3 font-medium text-right">Valor Contábil</th>
                  <th className="p-3 font-medium text-center">% Depreciado</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((eq) => {
                  const isFullyDepreciated = eq.percentual_depreciado >= 100;
                  
                  return (
                    <tr key={eq.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono">
                          {eq.codigo_interno}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{eq.modelo_nome}</p>
                          <p className="text-sm text-muted-foreground">{eq.grupo_nome}</p>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatMoney(eq.valor_aquisicao)}
                      </td>
                      <td className="p-3 text-right text-sm text-muted-foreground">
                        {formatDate(eq.data_aquisicao)}
                      </td>
                      <td className="p-3 text-right text-sm">
                        {eq.vida_util_meses} meses
                      </td>
                      <td className="p-3 text-right text-sm">
                        {eq.meses_uso.toFixed(1)} meses
                      </td>
                      <td className="p-3 text-right text-sm text-red-600">
                        {formatMoney(eq.depreciacao_acumulada)}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        {formatMoney(eq.valor_contabil)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={isFullyDepreciated ? "destructive" : "secondary"}
                          className={
                            !isFullyDepreciated && eq.percentual_depreciado >= 80
                              ? "bg-orange-100 text-orange-800"
                              : ""
                          }
                        >
                          {eq.percentual_depreciado.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || grupoFilter
                    ? "Nenhum equipamento encontrado com os filtros aplicados"
                    : "Nenhum equipamento com dados patrimoniais cadastrados"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
