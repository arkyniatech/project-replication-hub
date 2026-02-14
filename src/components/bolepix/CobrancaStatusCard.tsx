import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CobrancaData } from '@/types/bolepix';
import { 
  Copy, 
  Download, 
  QrCode, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';

interface CobrancaStatusCardProps {
  cobranca: CobrancaData;
  onCancel?: () => void;
  onRefresh?: () => void;
}

const statusConfig = {
  DRAFT: { label: 'Rascunho', color: 'secondary', icon: Clock },
  REQUESTED: { label: 'Solicitado', color: 'default', icon: Clock },
  PROCESSING: { label: 'Processando', color: 'default', icon: Clock },
  ISSUED: { label: 'Emitido', color: 'default', icon: CheckCircle2 },
  PAID: { label: 'Pago', color: 'default', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado', color: 'secondary', icon: XCircle },
  EXPIRED: { label: 'Expirado', color: 'destructive', icon: AlertTriangle },
} as const;

export function CobrancaStatusCard({ cobranca, onCancel, onRefresh }: CobrancaStatusCardProps) {
  const { toast } = useToast();
  const config = statusConfig[cobranca.status];
  const Icon = config.icon;

  const handleCopyPix = async () => {
    if (cobranca.pixCopiaECola) {
      try {
        await navigator.clipboard.writeText(cobranca.pixCopiaECola);
        toast({
          title: "PIX copiado!",
          description: "Código PIX copiado para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código PIX.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyLine = async () => {
    if (cobranca.linhaDigitavel) {
      try {
        await navigator.clipboard.writeText(cobranca.linhaDigitavel);
        toast({
          title: "Linha digitável copiada!",
          description: "Linha digitável copiada para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar a linha digitável.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadPdf = () => {
    if (cobranca.pdfUrl) {
      const link = document.createElement('a');
      link.href = cobranca.pdfUrl;
      link.download = `boleto_${cobranca.codigoSolicitacao}.pdf`;
      link.click();
      
      toast({
        title: "Download iniciado",
        description: "O boleto está sendo baixado.",
      });
    }
  };

  const isProcessing = ['DRAFT', 'REQUESTED', 'PROCESSING'].includes(cobranca.status);
  const isIssued = cobranca.status === 'ISSUED';
  const isPaid = cobranca.status === 'PAID';
  const isCancellable = ['REQUESTED', 'PROCESSING', 'ISSUED'].includes(cobranca.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            BolePix - Banco Inter
          </div>
          <Badge variant={config.color} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Código Solicitação:</span>
            <span className="font-mono text-xs">{cobranca.codigoSolicitacao}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chave Idempotência:</span>
            <span className="font-mono text-xs">{cobranca.idempotencyKey}</span>
          </div>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">
                {cobranca.status === 'REQUESTED' ? 'Aguardando processamento bancário...' : 'Processando no banco...'}
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Você será notificado quando o boleto estiver pronto.
            </p>
          </div>
        )}

        {/* Issued State */}
        {(isIssued || isPaid) && (
          <>
            <Separator />
            
            {/* Linha Digitável */}
            {cobranca.linhaDigitavel && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Linha Digitável</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-muted rounded font-mono text-xs break-all">
                    {cobranca.linhaDigitavel}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleCopyLine}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* PIX */}
            {cobranca.pixCopiaECola && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  PIX Copia e Cola
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-muted rounded font-mono text-xs break-all max-h-20 overflow-y-auto">
                    {cobranca.pixCopiaECola}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleCopyPix}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* QR Code */}
            {cobranca.qrCodeDataUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium">QR Code PIX</label>
                <div className="flex justify-center">
                  <img 
                    src={cobranca.qrCodeDataUrl} 
                    alt="QR Code PIX" 
                    className="w-32 h-32 border rounded"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {cobranca.pdfUrl && (
                <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              )}
              
              {isCancellable && onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </>
        )}

        {/* Paid State */}
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Cobrança liquidada</span>
            </div>
          </div>
        )}

        {/* History */}
        {cobranca.history.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">Histórico</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {cobranca.history.slice(0, 5).map((event, index) => (
                  <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{event.event}</span>
                      <span className="text-muted-foreground">
                        {new Date(event.tsISO).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {event.payloadSummary && (
                      <div className="mt-1 text-muted-foreground">
                        {JSON.stringify(event.payloadSummary, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}