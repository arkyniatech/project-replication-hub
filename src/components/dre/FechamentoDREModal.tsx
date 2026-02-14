import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { 
  getVersionsMeta, 
  fecharCompetenciaDRE, 
  formatPeriodoDisplay 
} from '@/lib/dre-fechamento-utils';
import { 
  Calendar, 
  Building2, 
  Target, 
  AlertTriangle, 
  Lock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface FechamentoDREModalProps {
  open: boolean;
  onClose: () => void;
  competencia: string;
  lojas: Array<{ id: string; nome: string }>;
  mockExpensesData: any[];
  onFechamentoComplete: () => void;
}

export function FechamentoDREModal({ 
  open, 
  onClose, 
  competencia, 
  lojas,
  mockExpensesData,
  onFechamentoComplete 
}: FechamentoDREModalProps) {
  const { toast } = useToast();
  const [selectedVersionMeta, setSelectedVersionMeta] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const versions = getVersionsMeta();
  const totalReal = mockExpensesData.reduce((sum, item) => sum + item.real, 0);
  const totalMeta = mockExpensesData.reduce((sum, item) => sum + item.meta, 0);
  const deltaTotal = totalReal - totalMeta;
  const deltaPercentualTotal = totalMeta > 0 ? (deltaTotal / totalMeta) * 100 : 0;

  const handleConfirmarFechamento = async () => {
    if (!selectedVersionMeta) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione uma versão de meta para continuar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { fechamento, snapshot } = fecharCompetenciaDRE(
        competencia,
        lojas.map(l => l.id),
        selectedVersionMeta,
        'admin', // Mock user
        mockExpensesData
      );

      toast({
        title: "Competência fechada com sucesso",
        description: `${formatPeriodoDisplay(competencia)} foi fechado e selado para as lojas selecionadas`
      });

      onFechamentoComplete();
      onClose();
    } catch (error) {
      toast({
        title: "Erro no fechamento",
        description: "Houve um problema ao fechar a competência",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Fechamento Mensal DRE
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Period Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Competência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{formatPeriodoDisplay(competencia)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {lojas.map(loja => (
                        <Badge key={loja.id} variant="secondary">
                          {loja.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">KPIs Consolidados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Real</span>
                    <span className="font-semibold">{formatCurrency(totalReal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Meta</span>
                    <span className="font-semibold">{formatCurrency(totalMeta)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Delta</span>
                    <div className="flex items-center gap-1">
                      {deltaTotal >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-red-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-green-500" />
                      )}
                      <span className={`font-semibold ${deltaTotal >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {deltaTotal >= 0 ? '+' : ''}{formatCurrency(deltaTotal)}
                      </span>
                      <span className={`text-xs ${deltaTotal >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ({deltaTotal >= 0 ? '+' : ''}{deltaPercentualTotal.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Parameters */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parâmetros do Fechamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Versão de Meta *
                    </label>
                    <Select value={selectedVersionMeta} onValueChange={setSelectedVersionMeta}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a versão de meta" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map(version => (
                          <SelectItem key={version.versao} value={version.versao}>
                            <div className="flex items-center justify-between w-full">
                              <span>{version.versao}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(version.criadoEmISO).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedVersionMeta && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {versions.find(v => v.versao === selectedVersionMeta)?.observacao}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Ao fechar a competência, os dados serão selados e 
                não poderão ser alterados. Um snapshot será criado com os valores atuais.
                Apenas usuários com permissão adequada poderão reabrir posteriormente.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarFechamento} 
            disabled={!selectedVersionMeta || isProcessing}
          >
            {isProcessing ? 'Processando...' : 'Confirmar Fechamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}