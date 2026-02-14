import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { useSupabaseRecebimentos } from "@/hooks/useSupabaseRecebimentos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";

export default function RecebidasTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formaFilter, setFormaFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
  const { recebimentos: recebimentosData = [] } = useSupabaseRecebimentos(lojaAtual?.id);

  const filteredRecebimentos = useMemo(() => {
    let filtered = recebimentosData;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter((recebimento) => {
        const tituloNumero = recebimento.titulo?.numero || '';
        const clienteNome = recebimento.titulo?.cliente?.nome || recebimento.titulo?.cliente?.razao_social || '';
        const contratoNumero = recebimento.titulo?.contrato?.numero || '';
        
        return tituloNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contratoNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtro por forma
    if (formaFilter) {
      filtered = filtered.filter(recebimento => recebimento.forma === formaFilter);
    }

    // Filtro por período
    if (dataInicio) {
      filtered = filtered.filter(recebimento => new Date(recebimento.data) >= new Date(dataInicio));
    }
    if (dataFim) {
      filtered = filtered.filter(recebimento => new Date(recebimento.data) <= new Date(dataFim));
    }

    // Ordenar por data decrescente
    return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [recebimentosData, searchTerm, formaFilter, dataInicio, dataFim]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleExportarCSV = () => {
    // Mock da exportação
    const csvContent = [
      "Data,Cliente,Documento,Contrato,Forma,Valor Bruto,Desconto,Juros/Multa,Valor Líquido,Usuário",
      ...filteredRecebimentos.map(r => {
        const cliente = r.titulo?.cliente?.nome || r.titulo?.cliente?.razao_social || '';
        const tituloNum = r.titulo?.numero || '';
        const contratoNum = r.titulo?.contrato?.numero || '';
        return `${formatDate(r.data)},${cliente},${tituloNum},${contratoNum},${r.forma},${r.valor_bruto || 0},${r.desconto || 0},${r.juros_multa || 0},${r.valor_liquido || 0},${r.usuario || ''}`;
      })
    ].join('\n');

    // Simular download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recebimentos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportação realizada",
      description: "Relatório de recebimentos exportado com sucesso.",
    });
  };

  const uniqueFormas = [...new Set(recebimentosData.map(r => r.forma))];
  const totalRecebimentos = filteredRecebimentos.reduce((acc, r) => acc + (r.valor_liquido || 0), 0);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por documento, contrato ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 shadow-input border-input-border"
            />
          </div>
        </div>
        <div className="md:w-40">
          <select
            value={formaFilter}
            onChange={(e) => setFormaFilter(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input"
          >
            <option value="">Todas as Formas</option>
            {uniqueFormas.map(forma => (
              <option key={String(forma)} value={String(forma)}>{String(forma)}</option>
            ))}
          </select>
        </div>
        <div className="md:w-40">
          <Input
            type="date"
            placeholder="Data início"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="shadow-input border-input-border"
          />
        </div>
        <div className="md:w-40">
          <Input
            type="date"
            placeholder="Data fim"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="shadow-input border-input-border"
          />
        </div>
        <Button onClick={handleExportarCSV} className="md:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Resumo */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {filteredRecebimentos.length} recebimentos encontrados
          </span>
          <span className="text-lg font-bold text-foreground">
            Total: R$ {totalRecebimentos.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Tabela de recebimentos */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Valor Bruto</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Juros/Multa</TableHead>
              <TableHead>Valor Líquido</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecebimentos.length > 0 ? (
              filteredRecebimentos.map((recebimento) => (
                <TableRow key={recebimento.id} className="hover:bg-muted/50">
                  <TableCell>{formatDate(recebimento.data)}</TableCell>
                  <TableCell className="font-medium">{recebimento.titulo?.cliente?.nome || recebimento.titulo?.cliente?.razao_social || 'N/A'}</TableCell>
                  <TableCell>{recebimento.titulo?.numero || 'N/A'}</TableCell>
                  <TableCell>{recebimento.titulo?.contrato?.numero || 'N/A'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-muted rounded text-xs">
                      {recebimento.forma}
                    </span>
                  </TableCell>
                  <TableCell>R$ {(recebimento.valor_bruto || 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-destructive">
                    {(recebimento.desconto || 0) > 0 ? `- R$ ${recebimento.desconto.toLocaleString('pt-BR')}` : '-'}
                  </TableCell>
                  <TableCell className="text-warning">
                    {(recebimento.juros_multa || 0) > 0 ? `+ R$ ${recebimento.juros_multa.toLocaleString('pt-BR')}` : '-'}
                  </TableCell>
                  <TableCell className="font-bold">
                    R$ {(recebimento.valor_liquido || 0).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{recebimento.usuario || 'N/A'}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Link do título",
                          description: `Abrindo título ${recebimento.titulo?.numero || 'N/A'}...`,
                        });
                      }}
                    >
                      Ver Título
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {searchTerm || formaFilter || dataInicio || dataFim
                    ? "Nenhum recebimento encontrado com os filtros aplicados"
                    : "Nenhum recebimento registrado"
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}