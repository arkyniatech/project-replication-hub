import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { useSolicitacoesRealtime } from '@/hooks/useSolicitacoesRealtime';
import { SolicitacaoModal } from '@/components/solicitacoes/SolicitacaoModal';
import { SolicitacaoDetalhe } from '@/components/solicitacoes/SolicitacaoDetalhe';
import {
  getStatusLabel,
  getStatusColor,
  getPrioridadeColor,
  calcularSLARestante,
  type StatusSolicitacao,
  type PrioridadeSolicitacao,
} from '@/types/solicitacao-manutencao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SolicitacoesManutencao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | 'TODAS'>('TODAS');
  const [prioridadeFilter, setPrioridadeFilter] = useState<PrioridadeSolicitacao | 'TODAS'>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetalheOpen, setIsDetalheOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // Assumir loja ativa (em produção, pegar do contexto de autenticação)
  const lojaAtiva = 'loja-mock-id';

  const { solicitacoes, isLoading, error } = useSupabaseSolicitacoes({
    loja_id: lojaAtiva,
    status: statusFilter === 'TODAS' ? undefined : statusFilter,
    prioridade: prioridadeFilter === 'TODAS' ? undefined : prioridadeFilter,
  });

  // Realtime updates
  useSolicitacoesRealtime(lojaAtiva);

  const filteredSolicitacoes = solicitacoes.filter((sol) =>
    sol.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sol.sintomas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setIsDetalheOpen(true);
  };

  const handleNew = () => {
    setSelectedId(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedId(undefined);
  };

  const handleCloseDetalhe = () => {
    setIsDetalheOpen(false);
    setSelectedId(undefined);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          Erro ao carregar solicitações: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <h1 className="text-2xl font-semibold">Solicitações de Manutenção</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suporte em campo e trocas de equipamentos
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Solicitação
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou sintoma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusSolicitacao | 'TODAS')}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="TODAS">Todos Status</option>
            <option value="ABERTA">Aberta</option>
            <option value="AGUARDANDO_RETIRADA">Aguardando Retirada</option>
            <option value="EM_ROTA">Em Rota</option>
            <option value="RECEBIDA_OFICINA">Recebida na Oficina</option>
            <option value="EM_DIAGNOSTICO">Em Diagnóstico</option>
            <option value="AGUARDANDO_PECA">Aguardando Peça</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={prioridadeFilter}
            onChange={(e) => setPrioridadeFilter(e.target.value as PrioridadeSolicitacao | 'TODAS')}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="TODAS">Todas Prioridades</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredSolicitacoes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Filter className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSolicitacoes.map((sol) => {
              const sla = calcularSLARestante(sol);
              return (
                <Card
                  key={sol.id}
                  className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                  onClick={() => handleEdit(sol.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{sol.cliente_nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sol.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={getPrioridadeColor(sol.prioridade)}>
                        {sol.prioridade}
                      </Badge>
                      <Badge className={getStatusColor(sol.status)}>
                        {getStatusLabel(sol.status)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm mb-3 line-clamp-2">{sol.sintomas}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                    <span className="font-medium uppercase">{sol.tipo.replace('_', ' ')}</span>
                    {sol.sla_horas && (
                      <span className={sla.vencido ? 'text-destructive font-semibold' : ''}>
                        SLA: {sla.vencido ? 'VENCIDO' : `${sla.horas}h ${sla.minutos}m`}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <SolicitacaoModal
        open={isModalOpen}
        onClose={handleCloseModal}
        solicitacaoId={selectedId}
      />

      {selectedId && (
        <SolicitacaoDetalhe
          open={isDetalheOpen}
          onClose={handleCloseDetalhe}
          solicitacaoId={selectedId}
        />
      )}
    </div>
  );
}
