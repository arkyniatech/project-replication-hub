import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Equal, 
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  ShieldCheck,
  Paperclip,
  X,
  FileDown,
  Settings,
  ClipboardCheck,
  Wrench,
  FileWarning,
  Lock,
  Eye,
  Printer,
  Download,
  Search,
  Filter,
  RotateCcw
} from "lucide-react";
import { useConferenciaStore, type ContagemSessao, type UserRef } from "@/stores/conferenciaStore";
import { useEquipamentosStore } from "@/stores/equipamentosStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ACOES_LABELS, STATUS_LABELS, type AcaoInventario, INVENTARIO_CFG } from "@/config/inventario";
import { PainelResumoContagem } from "./PainelResumoContagem";
import { DivergenciaItemDrawer } from "./DivergenciaItemDrawer";
import { exportContagemCSV, exportContagemPDF, printContagemResumo } from "@/utils/contagem-export";

interface ResolucaoDivergenciasProps {
  sessao: ContagemSessao;
}

export function ResolucaoDivergencias({ sessao }: ResolucaoDivergenciasProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    getDivergenciasPorSessao, 
    setJustificativa,
    setAcao,
    processarDivergencias,
    canEdit 
  } = useConferenciaStore();
  const { lojas } = useEquipamentosStore();
  
  const [showOnlyDivergent, setShowOnlyDivergent] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  
  const divergencias = getDivergenciasPorSessao(sessao.id);
  const loja = lojas.find(l => l.id === sessao.lojaId);

  // Filtrar divergências
  const filteredDivergencias = useMemo(() => {
    let filtered = showOnlyDivergent 
      ? divergencias.filter(d => d.delta !== 0)
      : divergencias;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.codigo.toLowerCase().includes(term) ||
        d.descricao.toLowerCase().includes(term)
      );
    }

    if (filtroAcao) {
      filtered = filtered.filter(d => d.acao === filtroAcao);
    }

    if (filtroStatus) {
      filtered = filtered.filter(d => d.status === filtroStatus);
    }

    return filtered;
  }, [divergencias, showOnlyDivergent, searchTerm, filtroAcao, filtroStatus]);

  const handleExportarCSV = () => {
    try {
      exportContagemCSV({
        sessao,
        divergencias: filteredDivergencias,
        lojaNome: loja?.nome || 'Loja não encontrada'
      });

      toast({
        title: "CSV exportado",
        description: "Dados das divergências exportados para CSV com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o CSV",
        variant: "destructive"
      });
    }
  };

  const handleExportarPDF = async () => {
    try {
      await exportContagemPDF({
        sessao,
        divergencias: filteredDivergencias,  
        lojaNome: loja?.nome || 'Loja não encontrada'
      });

      toast({
        title: "PDF exportado",
        description: "Relatório exportado para PDF com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o PDF",
        variant: "destructive"
      });
    }
  };

  const totalDivergencias = divergencias.filter(d => d.delta !== 0).length;
  const isReadOnly = !canEdit();

  return (
    <TooltipProvider>
      <div className="space-y-6" id="contagem-resumo-print">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/equipamentos/conferencia')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Resolução de Divergências</h1>
              <p className="text-muted-foreground">
                {loja?.nome} - Sessão {sessao.id}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            {canEdit() && (
              <>
                <Button variant="outline" onClick={handleExportarCSV} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                
                <Button variant="outline" onClick={handleExportarPDF} size="sm">
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grid">Lista de Divergências</TabsTrigger>
            <TabsTrigger value="resumo">Painel Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-6">
            <PainelResumoContagem sessao={sessao} />
          </TabsContent>

          <TabsContent value="grid" className="space-y-6">
            {/* Filtros */}
            <Card className="shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-only-divergent"
                    checked={showOnlyDivergent}
                    onCheckedChange={(checked) => setShowOnlyDivergent(checked === true)}
                  />
                  <label htmlFor="show-only-divergent" className="text-sm">
                    Mostrar apenas itens com divergência
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Divergências */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Divergências ({filteredDivergencias.length} itens)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredDivergencias.map((divergencia) => (
                    <div 
                      key={divergencia.itemId}
                      className={`p-3 border rounded-lg ${
                        divergencia.delta !== 0 
                          ? divergencia.delta > 0 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                          : 'border-border'
                      }`}
                    >
                      <div className="grid grid-cols-6 gap-4 items-center">
                        <div>
                          <Badge variant="outline" className="font-mono text-xs">
                            {divergencia.codigo}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="font-medium text-sm">
                            {divergencia.descricao}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <span className="font-mono text-sm">{divergencia.qtdSistema}</span>
                        </div>
                        
                        <div className="text-center">
                          <span className="font-mono text-sm">{divergencia.qtdContada}</span>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 font-mono text-sm">
                            {divergencia.delta > 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : divergencia.delta < 0 ? (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            ) : (
                              <Equal className="w-4 h-4 text-gray-600" />
                            )}
                            {divergencia.delta > 0 ? '+' : ''}{divergencia.delta}
                          </div>
                        </div>
                        
                        <div>
                          <Badge className="text-xs">
                            {STATUS_LABELS[divergencia.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredDivergencias.length === 0 && (
                    <div className="text-center py-12">
                      <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhuma divergência encontrada
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}