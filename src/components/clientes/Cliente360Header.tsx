import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Plus, 
  CreditCard, 
  MessageSquare, 
  FileText,
  Search
} from "lucide-react";
import { useState } from "react";

interface Cliente360HeaderProps {
  clienteId: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  statusCredito: 'ATIVO' | 'SUSPENSO' | 'EM_ANALISE';
  vip?: boolean;
  kpis: {
    emAberto: number;
    emAtraso: number;
    prox7d: number;
    ultimoPgtoISO?: string;
  };
  onAbrirFinanceiro: () => void;
  onCriarContrato: () => void;
  onNovaCobranca: () => void;
  onWhatsApp: () => void;
  onExportPDF: () => void;
}

export function Cliente360Header({
  nome,
  tipo,
  statusCredito,
  vip,
  kpis,
  onAbrirFinanceiro,
  onCriarContrato,
  onNovaCobranca,
  onWhatsApp,
  onExportPDF
}: Cliente360HeaderProps) {
  const [busca, setBusca] = useState("");

  const getStatusBadge = (status: string) => {
    const variants = {
      ATIVO: "bg-emerald-100 text-emerald-700",
      SUSPENSO: "bg-rose-100 text-rose-700",
      EM_ANALISE: "bg-amber-100 text-amber-700"
    };
    return variants[status as keyof typeof variants];
  };

  const formatDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  return (
    <div className="sticky top-0 z-30 border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Identificação */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold truncate">{nome}</h1>
                <Badge variant="outline" className="text-xs">
                  {tipo}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusBadge(statusCredito)}>
                  {statusCredito === 'EM_ANALISE' ? 'Em Análise' : statusCredito}
                </Badge>
                
                {kpis.emAtraso > 0 && (
                  <Badge className="bg-rose-100 text-rose-700">
                    INADIMPLENTE
                  </Badge>
                )}
                
                {vip && (
                  <Badge className="bg-purple-100 text-purple-700">
                    VIP
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Chip Financeiro */}
          <div 
            className="hidden md:flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors border"
            onClick={onAbrirFinanceiro}
          >
            <div className="text-sm text-center">
              <div className="font-medium text-foreground">
                Em aberto: {formatCurrency(kpis.emAberto)}
              </div>
              <div className="text-xs text-muted-foreground">
                Em atraso: {formatCurrency(kpis.emAtraso)} • 
                Próx. 7d: {formatCurrency(kpis.prox7d)}
              </div>
              <div className="text-xs text-muted-foreground">
                Último pgto: {kpis.ultimoPgtoISO ? formatDate(kpis.ultimoPgtoISO) : '—'}
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCriarContrato}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Contrato</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onNovaCobranca}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Cobrança</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onWhatsApp}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPDF}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Busca Contextual */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos, títulos, OS... (pressione / para focar)"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 text-sm"
              onKeyDown={(e) => {
                if (e.key === '/') {
                  e.preventDefault();
                  e.currentTarget.focus();
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}