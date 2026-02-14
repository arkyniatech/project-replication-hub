import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { Truck, Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { SolicitacaoManutencao, StatusSolicitacao } from '@/types/solicitacao-manutencao';
import { toast } from 'sonner';

interface SolicitacaoAcoesProps {
  solicitacao: SolicitacaoManutencao;
  onUpdate: () => void;
}

export function SolicitacaoAcoes({ solicitacao, onUpdate }: SolicitacaoAcoesProps) {
  const { mudarStatus, isMudandoStatus, criarOS, isCriandoOS } = useSupabaseSolicitacoes();
  const [loading, setLoading] = useState(false);

  const handleMudarStatus = async (novoStatus: StatusSolicitacao) => {
    setLoading(true);
    try {
      await mudarStatus({
        id: solicitacao.id,
        status: novoStatus,
      });
      onUpdate();
    } catch (error) {
      console.error('Erro ao mudar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarOS = async () => {
    setLoading(true);
    try {
      const osId = await criarOS({ id: solicitacao.id });
      toast.success(`OS criada: ${osId}`);
      onUpdate();
    } catch (error) {
      console.error('Erro ao criar OS:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAcoesPorStatus = () => {
    switch (solicitacao.status) {
      case 'ABERTA':
        return (
          <>
            <Button
              onClick={() => handleMudarStatus('AGUARDANDO_RETIRADA')}
              disabled={loading}
              className="w-full"
            >
              <Truck className="mr-2 h-4 w-4" />
              Agendar Retirada
            </Button>
            <Button
              onClick={() => handleMudarStatus('CANCELADA')}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Solicitação
            </Button>
          </>
        );

      case 'AGUARDANDO_RETIRADA':
        return (
          <Button
            onClick={() => handleMudarStatus('EM_ROTA')}
            disabled={loading}
            className="w-full"
          >
            <Truck className="mr-2 h-4 w-4" />
            Equipamento em Rota
          </Button>
        );

      case 'EM_ROTA':
        return (
          <Button
            onClick={() => handleMudarStatus('RECEBIDA_OFICINA')}
            disabled={loading}
            className="w-full"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Confirmar Recebimento na Oficina
          </Button>
        );

      case 'RECEBIDA_OFICINA':
        return (
          <>
            {!solicitacao.os_id && (
              <Button
                onClick={handleCriarOS}
                disabled={loading || isCriandoOS}
                className="w-full"
              >
                {isCriandoOS && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Wrench className="mr-2 h-4 w-4" />
                Criar Ordem de Serviço
              </Button>
            )}
            <Button
              onClick={() => handleMudarStatus('EM_DIAGNOSTICO')}
              disabled={loading}
              className="w-full"
            >
              Iniciar Diagnóstico
            </Button>
          </>
        );

      case 'EM_DIAGNOSTICO':
        return (
          <Button
            onClick={() => handleMudarStatus('AGUARDANDO_PECA')}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Aguardando Peça
          </Button>
        );

      case 'AGUARDANDO_PECA':
        return (
          <Button
            onClick={() => handleMudarStatus('CONCLUIDA')}
            disabled={loading}
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Concluir Manutenção
          </Button>
        );

      case 'CONCLUIDA':
      case 'CANCELADA':
        return (
          <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Esta solicitação já foi {solicitacao.status === 'CONCLUIDA' ? 'concluída' : 'cancelada'}.
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-3">Ações Disponíveis</h3>
        <div className="space-y-2">
          {renderAcoesPorStatus()}
        </div>
      </div>

      {solicitacao.os_id && (
        <div className="rounded-lg border bg-primary/5 p-4">
          <p className="text-sm font-medium mb-1">
            🔧 Ordem de Serviço criada
          </p>
          <p className="text-sm text-muted-foreground">
            OS ID: {solicitacao.os_id}
          </p>
        </div>
      )}

      {solicitacao.tipo === 'TROCA_COM_SUBSTITUICAO' && (
        <div className="rounded-lg border bg-orange-500/10 border-orange-500/20 p-4">
          <p className="text-sm font-medium mb-1">
            🔄 Substituição Pendente
          </p>
          <p className="text-sm text-muted-foreground">
            Esta é uma solicitação de troca. Lembre-se de gerar tarefas de logística para entrega do substituto e retirada do defeituoso.
          </p>
        </div>
      )}
    </div>
  );
}
