import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Truck, Calculator, ArrowRight } from 'lucide-react';
import { checkEquipmentInTransfer, checkEquipmentInBlindCount } from '@/utils/contract-integrations';

interface IntegrationAlertsProps {
  contratoId: string;
  contratoNumero: string;
  lojaId: string;
  equipamentoIds: string[];
  onSubstituicaoSugerida?: (equipamentoId: string) => void;
}

export function IntegrationAlerts({ 
  contratoId, 
  contratoNumero, 
  lojaId, 
  equipamentoIds,
  onSubstituicaoSugerida 
}: IntegrationAlertsProps) {
  const [transferIssues, setTransferIssues] = useState<Array<{ equipamentoId: string; transferencia: any }>>([]);
  const [countIssues, setCountIssues] = useState<Array<{ equipamentoId: string; sessao: any }>>([]);

  useEffect(() => {
    const transfers: typeof transferIssues = [];
    const counts: typeof countIssues = [];

    equipamentoIds.forEach(equipId => {
      // Check transfers
      const transferCheck = checkEquipmentInTransfer(equipId, lojaId);
      if (transferCheck.isInTransfer && transferCheck.transferencia) {
        transfers.push({
          equipamentoId: equipId,
          transferencia: transferCheck.transferencia
        });
      }

      // Check blind count
      const countCheck = checkEquipmentInBlindCount(equipId, lojaId);
      if (countCheck.isBlocked && countCheck.sessao) {
        counts.push({
          equipamentoId: equipId,
          sessao: countCheck.sessao
        });
      }
    });

    setTransferIssues(transfers);
    setCountIssues(counts);
  }, [equipamentoIds, lojaId]);

  if (transferIssues.length === 0 && countIssues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Alertas de Transferência */}
      {transferIssues.map(issue => (
        <Alert key={`transfer-${issue.equipamentoId}`} className="border-orange-200 bg-orange-50">
          <Truck className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  Equipamento {issue.equipamentoId} em transferência
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Status: <Badge variant="outline" className="text-orange-700">
                    {issue.transferencia.status}
                  </Badge> - 
                  De: <strong>{issue.transferencia.origemLojaNome}</strong> → 
                  Para: <strong>{issue.transferencia.destinoLojaNome}</strong>
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Este item pode não estar disponível para novas operações até a conclusão da transferência.
                </p>
              </div>
              {onSubstituicaoSugerida && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSubstituicaoSugerida(issue.equipamentoId)}
                  className="ml-3 text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Substituir
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Alertas de Contagem Cega */}
      {countIssues.map(issue => (
        <Alert key={`count-${issue.equipamentoId}`} className="border-blue-200 bg-blue-50">
          <Calculator className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  Equipamento {issue.equipamentoId} em contagem
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Sessão: <Badge variant="outline" className="text-blue-700">
                    {issue.sessao.displayNo || issue.sessao.id}
                  </Badge> - 
                  Status: <strong>{issue.sessao.status}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Este item está bloqueado para ajuste de estoque até o processamento da contagem.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="ml-3 text-blue-700 border-blue-300"
              >
                Aguardando Contagem
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Alerta Geral */}
      {(transferIssues.length > 0 || countIssues.length > 0) && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <p className="font-medium text-amber-800">
              Atenção: Operações Limitadas
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {transferIssues.length > 0 && `${transferIssues.length} item(s) em transferência`}
              {transferIssues.length > 0 && countIssues.length > 0 && ' e '}
              {countIssues.length > 0 && `${countIssues.length} item(s) em contagem`}.
              Algumas operações podem estar indisponíveis até a conclusão destes processos.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}