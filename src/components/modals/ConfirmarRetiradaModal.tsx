import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Package, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ConfirmarRetiradaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: {
    numero: string;
    cliente: { nomeRazao: string; documento: string };
    itens: Array<{
      id: string;
      nome?: string;
      patrimonioOuSerie?: string;
      equipamento?: { 
        nome?: string; 
        codigo?: string;
        codigo_interno?: string;
        numero_serie?: string;
      };
      modelo?: { 
        nome?: string;
        nome_comercial?: string;
      };
      grupo?: { nome: string };
      quantidade: number;
      controle?: string;
    }>;
    dataInicio: string;
    dataPrevistaFim: string;
  };
  onConfirm: () => Promise<void>;
}

export default function ConfirmarRetiradaModal({
  open,
  onOpenChange,
  contrato,
  onConfirm,
}: ConfirmarRetiradaModalProps) {
  const [equipamentosConferidos, setEquipamentosConferidos] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [clienteOrientado, setClienteOrientado] = useState(false);
  const [loading, setLoading] = useState(false);

  const podeConfirmar = equipamentosConferidos && documentoVerificado && clienteOrientado;

  const handleConfirm = async () => {
    if (!podeConfirmar) return;

    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
      
      // Reset checklist
      setEquipamentosConferidos(false);
      setDocumentoVerificado(false);
      setClienteOrientado(false);
    } catch (error) {
      console.error("Erro ao confirmar retirada:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Confirmar Retirada do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Contrato */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-sm">Contrato: {contrato.numero}</p>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  <span>Início: {format(new Date(contrato.dataInicio), "dd/MM/yyyy")}</span>
                  <span>•</span>
                  <span>Fim previsto: {format(new Date(contrato.dataPrevistaFim), "dd/MM/yyyy")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{contrato.cliente.nomeRazao}</p>
                <p className="text-sm text-muted-foreground">{contrato.cliente.documento}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Equipamentos */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Equipamentos a Retirar ({contrato.itens.length})
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {contrato.itens.map((item) => {
                const nomeEquipamento = item.modelo?.nome_comercial || item.modelo?.nome || item.grupo?.nome || item.nome || "Item";
                const identificacao = item.equipamento?.codigo_interno || 
                                     item.equipamento?.numero_serie || 
                                     item.equipamento?.codigo ||
                                     item.patrimonioOuSerie || 
                                     "";
                const tipoControle = item.controle || (item.quantidade > 1 ? 'GRUPO' : 'SERIE');
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm bg-background"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{nomeEquipamento}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {identificacao && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {identificacao}
                          </span>
                        )}
                        {tipoControle === 'GRUPO' && item.quantidade > 1 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {item.quantidade}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Checklist */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              Checklist de Confirmação
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="equipamentos"
                  checked={equipamentosConferidos}
                  onCheckedChange={(checked) => setEquipamentosConferidos(checked as boolean)}
                />
                <Label htmlFor="equipamentos" className="text-sm cursor-pointer">
                  Equipamentos conferidos e em bom estado (fotos/vídeos registrados, se necessário)
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="documento"
                  checked={documentoVerificado}
                  onCheckedChange={(checked) => setDocumentoVerificado(checked as boolean)}
                />
                <Label htmlFor="documento" className="text-sm cursor-pointer">
                  Documento de identificação do responsável verificado
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="orientacao"
                  checked={clienteOrientado}
                  onCheckedChange={(checked) => setClienteOrientado(checked as boolean)}
                />
                <Label htmlFor="orientacao" className="text-sm cursor-pointer">
                  Cliente orientado sobre uso seguro, devolução e responsabilidades contratuais
                </Label>
              </div>
            </div>
          </div>

          {!podeConfirmar && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning">
                Complete todos os itens do checklist para confirmar a retirada
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!podeConfirmar || loading}
            className="min-w-32"
          >
            {loading ? "Confirmando..." : "✅ Confirmar Retirada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
