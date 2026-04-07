import { useState, useMemo, useCallback, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileDown, 
  X, 
  Building, 
  ArrowLeft,
  Search,
  Edit
} from "lucide-react";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { PERIODOS, formatMoney } from "@/lib/equipamentos-utils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Estender jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export default function TabelaPrecos() {
  const navigate = useNavigate();
  const { lojaAtual, lojas } = useMultiunidade();
  
  const { grupos } = useSupabaseGrupos();
  const { modelos } = useSupabaseModelos();
  
  const [lojaSelecionada, setLojaSelecionada] = useState(lojaAtual?.id || "");
  const [searchTerm, setSearchTerm] = useState("");

  // Focar busca com "/"
  useKeyboardShortcut("/", () => {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.focus();
    }
  });

  // Exportar PDF com Ctrl/Cmd + P
  useKeyboardShortcut("Control+p", () => {
    handleExportPDF();
  });

  useKeyboardShortcut("Meta+p", () => {
    handleExportPDF();
  });

  // Atualizar loja quando mudança externa
  useEffect(() => {
    if (lojaAtual?.id && !lojaSelecionada) {
      setLojaSelecionada(lojaAtual.id);
    }
  }, [lojaAtual, lojaSelecionada]);

  // Dados filtrados e agrupados
  const dadosTabela = useMemo(() => {
    if (!lojaSelecionada) return [];

    // Filtrar modelos por busca
    const modelosFiltrados = modelos.filter(modelo => {
      const grupo = grupos.find(g => g.id === modelo.grupo_id);
      const nomeGrupo = grupo?.nome || "";
      
      return (
        modelo.nome_comercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomeGrupo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Agrupar por grupo
    const gruposMap = new Map();
    
    modelosFiltrados.forEach(modelo => {
      const grupo = grupos.find(g => g.id === modelo.grupo_id);
      if (!grupo) return;

      if (!gruposMap.has(grupo.id)) {
        gruposMap.set(grupo.id, {
          id: grupo.id,
          nome: grupo.nome,
          modelos: []
        });
      }

      gruposMap.get(grupo.id).modelos.push(modelo);
    });

    return Array.from(gruposMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [grupos, modelos, lojaSelecionada, searchTerm]);

  const lojaNome = useMemo(() => {
    return lojas.find(l => l.id === lojaSelecionada)?.nome || "";
  }, [lojas, lojaSelecionada]);

  const handleExportPDF = useCallback(() => {
    if (!lojaSelecionada || dadosTabela.length === 0) return;

    try {
      const doc = new jsPDF('landscape');
      const now = new Date();
      const dataHora = now.toLocaleString('pt-BR');

      // Cabeçalho
      doc.setFontSize(18);
      doc.text('LocaAção - Tabela de Preços', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Loja: ${lojaNome}`, 20, 35);
      doc.text(`Gerado em: ${dataHora}`, 20, 45);

      let yPosition = 60;

      // Para cada grupo
      dadosTabela.forEach((grupo) => {
        // Título do grupo
        doc.setFontSize(14);
        doc.text(`Grupo: ${grupo.nome}`, 20, yPosition);
        yPosition += 10;

        // Dados da tabela do grupo
        const tableData = grupo.modelos.map(modelo => {
          const precos = (modelo.tabela_por_loja as Record<string, any>)?.[lojaSelecionada] || {};
          return [
            modelo.nome_comercial,
            precos.DIARIA ? formatMoney(precos.DIARIA) : "—",
            precos.SEMANA ? formatMoney(precos.SEMANA) : "—",
            precos.QUINZENA ? formatMoney(precos.QUINZENA) : "—",
            precos.D21 ? formatMoney(precos.D21) : "—",
            precos.MES ? formatMoney(precos.MES) : "—"
          ];
        });

        // AutoTable
        autoTable(doc, {
          startY: yPosition,
          head: [['Modelo', 'Diária', '7 dias', '14 dias', '21 dias', '28 dias']],
          body: tableData,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22] }, // Cor primária laranja
          margin: { left: 20, right: 20 },
        });

        // Pegar posição final da tabela
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : yPosition + 40;
        yPosition = finalY + 15;

        // Nova página se necessário
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
      });

      // Rodapé simples
      doc.setFontSize(8);
      doc.text(
        'Valores não fiscais. Sujeitos à revisão.',
        20,
        (doc as any).internal.pageSize.height - 20
      );

      doc.save(`tabela-precos-${lojaNome}-${now.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      // Fallback para impressão
      window.print();
    }
  }, [lojaSelecionada, dadosTabela, lojaNome]);

  const handleLimpar = () => {
    setSearchTerm("");
  };

  if (dadosTabela.length === 0) {
    return (
      <div className="space-y-6">
      {/* Controls */}

        {/* Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Loja</label>
                <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          {loja.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Busca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-input"
                    placeholder="Buscar por grupo ou modelo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground mb-4">
              Sem dados para a combinação atual.
            </div>
            <Button variant="outline" onClick={() => navigate('/equipamentos')}>
              Voltar para Equipamentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Loja</label>
              <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {loja.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Busca</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Buscar por grupo ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/equipamentos/catalogo')}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Preços
              </Button>
              <Button onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button variant="outline" onClick={handleLimpar}>
                <X className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tabela de Preços ({dadosTabela.reduce((acc, grupo) => acc + grupo.modelos.length, 0)} modelos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[300px] font-semibold">Modelo</TableHead>
                  <TableHead className="text-right font-semibold">Diária</TableHead>
                  <TableHead className="text-right font-semibold">7 dias</TableHead>
                  <TableHead className="text-right font-semibold">14 dias</TableHead>
                  <TableHead className="text-right font-semibold">21 dias</TableHead>
                  <TableHead className="text-right font-semibold">28 dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosTabela.map((grupo) => (
                  <React.Fragment key={`grupo-${grupo.id}`}>
                    {/* Linha do Grupo */}
                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                      <TableCell colSpan={6} className="font-semibold text-sm py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          {grupo.nome}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Linhas dos Modelos */}
                    {grupo.modelos.map((modelo) => {
                      const precos = (modelo.tabela_por_loja as Record<string, any>)?.[lojaSelecionada] || {};
                      
                      return (
                        <TableRow key={modelo.id} className="text-sm">
                          <TableCell className="pl-8">
                            {modelo.nome_comercial}
                          </TableCell>
                          <TableCell className="text-right">
                            {precos.DIARIA ? formatMoney(precos.DIARIA) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {precos.SEMANA ? formatMoney(precos.SEMANA) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {precos.QUINZENA ? formatMoney(precos.QUINZENA) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {precos.D21 ? formatMoney(precos.D21) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {precos.MES ? formatMoney(precos.MES) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}