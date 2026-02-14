import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, Fuel, Wrench, Droplets, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getFleetGridData } from "@/lib/fleet-utils";
import { useVeiculosStore } from "@/stores/veiculosStore";

export interface FleetFilters {
  busca?: string;
  loja_id?: string;
  status?: string;
  tipo?: string;
}

interface FleetGridProps {
  onAbastecimento?: (veiculoId: string) => void;
  onManutencao?: (veiculoId: string) => void;
  onTrocaOleo?: (veiculoId: string) => void;
}

export function FleetGrid({ onAbastecimento, onManutencao, onTrocaOleo }: FleetGridProps) {
  const [filtros, setFiltros] = useState<FleetFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Mock lojas - em produção viria do contexto de multiunidade
  const lojas = [
    { id: "loja-1", nome: "Loja Centro" },
    { id: "loja-2", nome: "Loja Norte" },
    { id: "loja-3", nome: "Loja Sul" }
  ];

  const frota = useMemo(() => {
    let dados = getFleetGridData(filtros.loja_id);
    
    // Aplicar filtros
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      dados = dados.filter(v => 
        v.placa.toLowerCase().includes(termo) ||
        v.codigo_interno.toLowerCase().includes(termo) ||
        v.modelo.toLowerCase().includes(termo)
      );
    }
    
    if (filtros.status) {
      dados = dados.filter(v => v.status === filtros.status);
    }
    
    if (filtros.tipo) {
      dados = dados.filter(v => v.tipo === filtros.tipo);
    }
    
    return dados;
  }, [filtros]);

  const getSemaforoIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'alerta':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'vencido':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <div className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'OPERANDO': { label: 'Operando', variant: 'success' },
      'OFICINA': { label: 'Oficina', variant: 'warning' },
      'BAIXADO': { label: 'Baixado', variant: 'secondary' }
    } as const;
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const tipoMap = {
      'carro': '🚗',
      'moto': '🏍️', 
      'furgão': '🚐',
      'caminhão': '🚛'
    };
    return tipoMap[tipo as keyof typeof tipoMap] || '🚗';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Frota ({frota.length} veículos)</span>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-2" />
                Filtros
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </CardTitle>
        
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Placa, código ou modelo..."
                  value={filtros.busca || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Loja</label>
                 <Select 
                   value={filtros.loja_id || 'all-lojas'} 
                   onValueChange={(value) => setFiltros(prev => ({ ...prev, loja_id: value === 'all-lojas' ? undefined : value }))}
                 >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-lojas">Todas as lojas</SelectItem>
                    {lojas.map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                 <Select 
                   value={filtros.status || 'all-status'} 
                   onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value === 'all-status' ? undefined : value }))}
                 >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">Todos os status</SelectItem>
                    <SelectItem value="OPERANDO">Operando</SelectItem>
                    <SelectItem value="OFICINA">Oficina</SelectItem>
                    <SelectItem value="BAIXADO">Baixado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                 <Select 
                   value={filtros.tipo || 'all-tipos'} 
                   onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value === 'all-tipos' ? undefined : value }))}
                 >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-tipos">Todos os tipos</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="furgão">Furgão</SelectItem>
                    <SelectItem value="caminhão">Caminhão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Últ. Troca Óleo</TableHead>
                <TableHead>Últ. Manutenção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frota.length > 0 ? frota.map((veiculo) => (
                <TableRow key={veiculo.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTipoBadge(veiculo.tipo)}</span>
                      <span className="font-medium">{veiculo.placa}</span>
                      {getSemaforoIcon(veiculo.alertaOleo.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{veiculo.codigo_interno}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {lojas.find(l => l.id === veiculo.loja_id)?.nome || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {veiculo.motorista_atual_id || 'Não atribuído'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {veiculo.ultimaTroca ? (
                      <div className="text-sm">
                        <div>{new Date(veiculo.ultimaTroca.data).toLocaleDateString('pt-BR')}</div>
                        <div className="text-muted-foreground">{veiculo.ultimaTroca.km.toLocaleString()} km</div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem dados</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {veiculo.ultimaManutencao ? (
                      <div className="text-sm">
                        <div>{new Date(veiculo.ultimaManutencao.data).toLocaleDateString('pt-BR')}</div>
                        <div className="text-muted-foreground truncate max-w-32" title={`${veiculo.ultimaManutencao.oficina} - ${veiculo.ultimaManutencao.servico}`}>
                          {veiculo.ultimaManutencao.oficina}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem dados</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(veiculo.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-32" title={veiculo.observacao}>
                      {veiculo.observacao || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Registrar Abastecimento"
                        onClick={() => onAbastecimento?.(veiculo.id)}
                      >
                        <Fuel className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={veiculo.status === 'OFICINA'}
                        title={veiculo.status === 'OFICINA' ? 'Veículo já em oficina' : 'Abrir OS'}
                        onClick={() => onManutencao?.(veiculo.id)}
                      >
                        <Wrench className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Registrar Troca de Óleo"
                        onClick={() => onTrocaOleo?.(veiculo.id)}
                      >
                        <Droplets className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum veículo encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}