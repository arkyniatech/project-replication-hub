import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, FileText, Download, DollarSign, Calendar, CheckCircle } from "lucide-react";
import { faturaStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Faturas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [faturas, setFaturas] = useState(() => faturaStorage.getAll());
  const { toast } = useToast();

  const filteredFaturas = useMemo(() => {
    return faturas.filter((fatura) => {
      const matchesSearch = 
        fatura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fatura.contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fatura.contrato.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || fatura.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [faturas, searchTerm, statusFilter]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'Em aberto': { label: 'Em Aberto', color: 'warning' as const },
      'Parcial': { label: 'Parcial', color: 'info' as const },
      'Quitado': { label: 'Quitado', color: 'success' as const },
      'Vencido': { label: 'Vencido', color: 'destructive' as const },
    };
    return statusMap[status] || { label: status, color: 'secondary' as const };
  };

  const uniqueStatus = [...new Set(faturas.map(f => f.status))];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const calcularDiasVencimento = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleMarcarQuitado = (faturaId: string) => {
    const fatura = faturas.find(f => f.id === faturaId);
    if (fatura) {
      const faturaAtualizada = {
        ...fatura,
        status: 'Quitado' as const,
        valorPago: fatura.valor,
        dataPagamento: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      faturaStorage.update(faturaId, faturaAtualizada);
      setFaturas(faturaStorage.getAll());
      
      toast({
        title: "Fatura quitada",
        description: `Fatura ${fatura.numero} marcada como quitada.`,
      });
    }
  };

  const handleGerarSegundaVia = (fatura: any) => {
    toast({
      title: "2ª Via gerada",
      description: `Segunda via da fatura ${fatura.numero} será enviada por email.`,
    });
  };

  const totalEmAberto = filteredFaturas
    .filter(f => f.status === 'Em aberto' || f.status === 'Parcial')
    .reduce((acc, f) => acc + (f.valor - f.valorPago), 0);

  const totalVencidas = filteredFaturas
    .filter(f => {
      const dias = calcularDiasVencimento(f.dataVencimento);
      return dias < 0 && (f.status === 'Em aberto' || f.status === 'Parcial');
    }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Faturas</h1>
          <p className="text-muted-foreground">Controle de faturas e contas a receber</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Aberto</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {totalEmAberto.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturas Vencidas</p>
                <p className="text-xl font-bold text-foreground">{totalVencidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Faturas</p>
                <p className="text-xl font-bold text-foreground">{filteredFaturas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número da fatura, contrato ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 shadow-input border-input-border"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground shadow-input"
              >
                <option value="">Todos os Status</option>
                {uniqueStatus.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Faturas */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Faturas ({filteredFaturas.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFaturas.length > 0 ? (
            <div className="space-y-4">
              {filteredFaturas.map((fatura) => {
                const diasVencimento = calcularDiasVencimento(fatura.dataVencimento);
                const isVencida = diasVencimento < 0 && (fatura.status === 'Em aberto' || fatura.status === 'Parcial');
                
                return (
                  <div
                    key={fatura.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">{fatura.numero}</h3>
                          <StatusBadge status={getStatusInfo(fatura.status)} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            Contrato: {fatura.contrato.numero}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {fatura.contrato.cliente.nome}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Valor: <span className="font-bold text-foreground">
                                R$ {fatura.valor.toLocaleString('pt-BR')}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              Vencimento: <span className="font-medium text-foreground">
                                {formatDate(fatura.dataVencimento)}
                              </span>
                            </span>
                          </div>
                          {fatura.valorPago > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Pago: R$ {fatura.valorPago.toLocaleString('pt-BR')}
                              {fatura.dataPagamento && ` em ${formatDate(fatura.dataPagamento)}`}
                            </p>
                          )}
                          {isVencida && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                                Vencida há {Math.abs(diasVencimento)} dias
                              </span>
                            </div>
                          )}
                          {diasVencimento >= 0 && fatura.status !== 'Quitado' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-info/20 text-info px-2 py-1 rounded">
                                {diasVencimento === 0 ? 'Vence hoje' : `Vence em ${diasVencimento} dias`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleGerarSegundaVia(fatura)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        2ª Via
                      </Button>
                      {fatura.status !== 'Quitado' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleMarcarQuitado(fatura.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Quitar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter 
                  ? "Nenhuma fatura encontrada com os filtros aplicados" 
                  : "Nenhuma fatura cadastrada"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}