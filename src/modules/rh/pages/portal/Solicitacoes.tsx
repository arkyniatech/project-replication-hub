import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Clock, Calendar, UserCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PortalSolicitacoes() {
  const { ajustesPonto, ferias, aprovacoes, ausencias } = useRhStore();
  
  // Mock current employee
  const currentEmployeeId = 'pessoa-1';
  
  // Collect all requests for current employee
  const minhasSolicitacoes = [
    // Ajustes de ponto
    ...ajustesPonto
      .filter(a => a.pessoaId === currentEmployeeId)
      .map(a => ({
        id: a.id,
        tipo: 'Ajuste de Ponto' as const,
        descricao: `${a.motivo} - ${a.horas > 0 ? '+' : ''}${a.horas}h`,
        data: a.dataISO,
        status: a.status,
        criadoEm: a.criadoEm,
        detalhes: a.observacao
      })),
    
    // Férias
    ...ferias
      .filter(f => f.colaboradorId === currentEmployeeId)
      .map(f => {
        const dias = Math.ceil((new Date(f.dataFim).getTime() - new Date(f.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return {
          id: f.id,
          tipo: 'Férias' as const,
          descricao: `${format(new Date(f.dataInicio), 'dd/MM/yyyy')} a ${format(new Date(f.dataFim), 'dd/MM/yyyy')} (${dias} dias)`,
          data: f.dataInicio,
          status: f.status,
          criadoEm: f.dataInicio, // Mock - usando dataInicio como criadoEm
          detalhes: f.periodo
        };
      }),
    
    // Ausências
    ...ausencias
      .filter(a => a.pessoaId === currentEmployeeId)
      .map(a => ({
        id: a.id,
        tipo: 'Ausência' as const,
        descricao: `${a.tipo} - ${format(parseISO(a.dataInicioISO), 'dd/MM/yyyy')} a ${format(parseISO(a.dataFimISO), 'dd/MM/yyyy')}`,
        data: a.dataInicioISO,
        status: a.status.toLowerCase(),
        criadoEm: a.criadoEm,
        detalhes: a.obs
      })),
    
    // Aprovações gerais
    ...aprovacoes
      .filter(a => a.pessoaId === currentEmployeeId)
      .map(a => ({
        id: a.id,
        tipo: `Aprovação ${a.tipo}` as const,
        descricao: `Solicitação de ${a.tipo}`,
        data: a.dataSolicitacaoISO,
        status: a.status,
        criadoEm: a.dataSolicitacaoISO,
        detalhes: a.comentarios?.[0]?.mensagem
      }))
  ];
  
  // Sort by creation date (newest first)
  const solicitacoesOrdenadas = minhasSolicitacoes.sort((a, b) => 
    new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pendente':
      case 'solicitado':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pendente</Badge>;
      case 'aprovado':
      case 'agendado':
        return <Badge variant="outline" className="text-green-600 border-green-600">Aprovado</Badge>;
      case 'recusado':
      case 'recusada':
        return <Badge variant="outline" className="text-red-600 border-red-600">Recusado</Badge>;
      case 'gozado':
      case 'concluido':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pendente':
      case 'solicitado':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'aprovado':
      case 'agendado':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'recusado':
      case 'recusada':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'gozado':
      case 'concluido':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo.includes('Ajuste')) return <Clock className="h-4 w-4" />;
    if (tipo.includes('Férias')) return <Calendar className="h-4 w-4" />;
    return <FileCheck className="h-4 w-4" />;
  };

  // Summary stats
  const totalSolicitacoes = solicitacoesOrdenadas.length;
  const pendentes = solicitacoesOrdenadas.filter(s => 
    ['pendente', 'solicitado'].includes(s.status.toLowerCase())
  ).length;
  const aprovadas = solicitacoesOrdenadas.filter(s => 
    ['aprovado', 'agendado'].includes(s.status.toLowerCase())
  ).length;
  const recusadas = solicitacoesOrdenadas.filter(s => 
    ['recusado', 'recusada'].includes(s.status.toLowerCase())
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
        <p className="text-muted-foreground">Acompanhe o status de todas as suas solicitações</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <FileCheck className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{totalSolicitacoes}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{pendentes}</div>
            <div className="text-sm text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{aprovadas}</div>
            <div className="text-sm text-muted-foreground">Aprovadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{recusadas}</div>
            <div className="text-sm text-muted-foreground">Recusadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Solicitações List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {solicitacoesOrdenadas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitacoesOrdenadas.map(solicitacao => (
                <Card key={`${solicitacao.tipo}-${solicitacao.id}`} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        {getTipoIcon(solicitacao.tipo)}
                        {getStatusIcon(solicitacao.status)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{solicitacao.tipo}</span>
                          <Badge variant="secondary" className="text-xs">
                            {solicitacao.tipo}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {solicitacao.descricao}
                        </div>
                        {solicitacao.detalhes && (
                          <div className="text-xs text-muted-foreground">
                            {solicitacao.detalhes}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Solicitado em {format(parseISO(solicitacao.criadoEm), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      {getStatusBadge(solicitacao.status)}
                      {solicitacao.data && (
                        <div className="text-xs text-muted-foreground">
                          Data: {format(parseISO(solicitacao.data), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Informações sobre Solicitações</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Pendente:</strong> Aguardando análise do gestor ou RH</p>
            <p>• <strong>Aprovado:</strong> Solicitação aprovada e processada</p>
            <p>• <strong>Recusado:</strong> Solicitação não aprovada - verifique os comentários</p>
            <p>• <strong>Concluído:</strong> Processo finalizado com sucesso</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}