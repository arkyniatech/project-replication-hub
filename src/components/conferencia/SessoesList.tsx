import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Eye, Play, CheckCircle, Printer, Calendar, User, Building2, Loader2
} from "lucide-react";
import { useSupabaseConferencia, type StatusConferencia } from "@/hooks/useSupabaseConferencia";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SessionDisplayChip } from "./SessionDisplayChip";

const STATUS_COLORS: Record<StatusConferencia, string> = {
  ABERTA: "bg-blue-100 text-blue-800",
  EM_CONTAGEM: "bg-yellow-100 text-yellow-800",
  EM_REVISAO: "bg-orange-100 text-orange-800",
  AJUSTADA: "bg-purple-100 text-purple-800",
  FECHADA: "bg-green-100 text-green-800"
};

const STATUS_LABELS: Record<StatusConferencia, string> = {
  ABERTA: "Aberta",
  EM_CONTAGEM: "Em Contagem", 
  EM_REVISAO: "Em Revisão",
  AJUSTADA: "Ajustada",
  FECHADA: "Fechada"
};

export function SessoesList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessoes, useItensPorSessao, canEdit, loadingSessoes } = useSupabaseConferencia();
  const { lojas } = useMultiunidade();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusConferencia | "">("");

  const filteredSessoes = sessoes.filter(sessao => {
    const loja = lojas.find(l => l.id === sessao.lojaId);
    const matchesSearch = !searchTerm || 
      (loja?.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sessao.criadaPor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sessao.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sessao.displayNo?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || sessao.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAbrirSessao = (sessaoId: string) => {
    navigate(`/equipamentos/conferencia?sessao=${sessaoId}`);
  };

  const getActionButton = (sessao: any) => {
    switch (sessao.status) {
      case 'ABERTA':
      case 'EM_CONTAGEM':
        return canEdit() ? (
          <Button size="sm" variant="outline" onClick={() => handleAbrirSessao(sessao.id)}>
            <Play className="w-4 h-4 mr-1" /> Continuar
          </Button>
        ) : null;
      case 'EM_REVISAO':
      case 'AJUSTADA':
        return canEdit() ? (
          <Button size="sm" variant="outline" onClick={() => handleAbrirSessao(sessao.id)}>
            <CheckCircle className="w-4 h-4 mr-1" /> Revisar
          </Button>
        ) : null;
      default:
        return (
          <Button size="sm" variant="ghost" onClick={() => handleAbrirSessao(sessao.id)}>
            <Eye className="w-4 h-4 mr-1" /> Visualizar
          </Button>
        );
    }
  };

  if (loadingSessoes) {
    return (
      <Card className="shadow-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Sessões de Contagem</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por loja, usuário, número da sessão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusConferencia | "")}
            className="px-3 py-2 bg-background border border-input rounded-md"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredSessoes.length > 0 ? (
          <div className="space-y-4">
            {filteredSessoes.map((sessao) => {
              const loja = lojas.find(l => l.id === sessao.lojaId);
              
              return (
                <div
                  key={sessao.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <SessionDisplayChip sessao={sessao} showCopyButton={true} />
                        <Badge className={STATUS_COLORS[sessao.status]}>
                          {STATUS_LABELS[sessao.status]}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {loja?.nome || 'Loja não encontrada'}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {sessao.criadaPor.nome}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(sessao.criadaEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                      
                      {sessao.filtros.tipo && (
                        <div className="text-sm text-muted-foreground">
                          Tipo: <span className="font-medium text-foreground">
                            {sessao.filtros.tipo === 'AMBOS' ? 'Série + Saldo' : sessao.filtros.tipo}
                          </span>
                        </div>
                      )}
                      
                      {sessao.observacao && (
                        <p className="text-xs text-muted-foreground italic">{sessao.observacao}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getActionButton(sessao)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter
                ? "Nenhuma sessão encontrada com os filtros aplicados"
                : "Nenhuma sessão de contagem criada"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
