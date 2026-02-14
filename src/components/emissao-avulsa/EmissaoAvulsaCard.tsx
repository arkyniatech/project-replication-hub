import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmissaoAvulsaModal } from "./EmissaoAvulsaModal";
import { useFaturamentoStore } from "@/stores/faturamentoStore";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Info, 
  ArrowRight, 
  TrendingUp,
  Clock,
  BarChart3
} from "lucide-react";

export function EmissaoAvulsaCard() {
  const [modalOpen, setModalOpen] = useState(false);
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { emissaoAvulsaStats, config } = useFaturamentoStore();

  const podeEmitir = can('financeiro', 'emitirFatura');
  const featureEnabled = config.featureFlags?.emissaoAvulsa !== false;

  const handleIrParaFaturamento = () => {
    navigate('/faturamento');
  };

  if (!featureEnabled) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Emissão Rápida (avulsa)
            <Badge variant="secondary" className="text-xs">
              Descontinuado
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Esta funcionalidade foi descontinuada. Use a tela{" "}
              <strong>Faturamento</strong> para todas as emissões.
            </AlertDescription>
          </Alert>

          <Button
            className="w-full"
            onClick={handleIrParaFaturamento}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Ir para Faturamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Emissão Rápida (avulsa)
            <Badge variant="secondary" className="text-xs">
              Em transição
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Banner informativo */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Para faturamento mensal consolidado, use a tela{" "}
              <strong>Faturamento</strong>. Esta é para cobranças avulsas e ajustes pontuais.
            </AlertDescription>
          </Alert>

          {/* Bridge para Faturamento */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleIrParaFaturamento}
              className="flex-1"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Ir para Faturamento
            </Button>
          </div>

          {/* Estatísticas rápidas */}
          {emissaoAvulsaStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-lg font-semibold text-primary">
                  {emissaoAvulsaStats.mesAtual}
                </div>
                <div className="text-xs text-muted-foreground">Este mês</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-lg font-semibold">
                  {emissaoAvulsaStats.totalEmissoes}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-lg font-semibold text-muted-foreground">
                  {Math.round(emissaoAvulsaStats.mediaMensal)}
                </div>
                <div className="text-xs text-muted-foreground">Média/mês</div>
              </div>
            </div>
          )}

          {/* Estado vazio/ajuda */}
          <div className="text-center py-2">
            <div className="text-sm text-muted-foreground mb-3">
              Use a tela <strong>Faturamento</strong> para consolidar um período. 
              Aqui é só um documento avulso.
            </div>

            <Button
              onClick={() => setModalOpen(true)}
              disabled={!podeEmitir}
              size="sm"
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Emitir Documento Avulso
            </Button>

            {!podeEmitir && (
              <p className="text-xs text-muted-foreground mt-2">
                Sem permissão para emitir faturas
              </p>
            )}
          </div>

          {/* Links rápidos */}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <button 
              onClick={() => console.log("Ver histórico")}
              className="hover:text-foreground transition-colors"
            >
              <Clock className="h-3 w-3 inline mr-1" />
              Histórico
            </button>
            <button 
              onClick={() => console.log("Ver estatísticas")}
              className="hover:text-foreground transition-colors"
            >
              <BarChart3 className="h-3 w-3 inline mr-1" />
              Estatísticas
            </button>
          </div>
        </CardContent>
      </Card>

      <EmissaoAvulsaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}