import { useState, useEffect } from "react";
import { QrCode, Trash2, Wifi, WifiOff, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function WhatsAppConfigForm() {
  const [selectedLojaId, setSelectedLojaId] = useState<string>("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch lojas
  const { data: lojas = [] } = useQuery({
    queryKey: ["lojas-whatsapp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lojas")
        .select("id, nome, codigo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Auto-select first loja
  useEffect(() => {
    if (lojas.length > 0 && !selectedLojaId) {
      setSelectedLojaId(lojas[0].id);
    }
  }, [lojas, selectedLojaId]);

  // Fetch instance status
  const { data: instanceData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["whatsapp-instance", selectedLojaId],
    queryFn: async () => {
      if (!selectedLojaId) return null;
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "status", loja_id: selectedLojaId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLojaId,
    refetchInterval: qrCode ? 5000 : false, // Poll when waiting for QR scan
  });

  // If instance becomes connected while polling, clear QR and stop polling
  useEffect(() => {
    if (instanceData?.status === "conectado" && qrCode) {
      setQrCode(null);
      toast.success("WhatsApp conectado com sucesso!");
    }
  }, [instanceData?.status, qrCode]);

  // Create instance
  const createMutation = useMutation({
    mutationFn: async () => {
      const loja = lojas.find((l) => l.id === selectedLojaId);
      if (!loja) throw new Error("Loja não encontrada");
      const instanceName = `loja-${loja.codigo.toLowerCase().replace(/\s+/g, "-")}`;
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "create", loja_id: selectedLojaId, instance_name: instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Instância criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance", selectedLojaId] });
    },
    onError: (err: any) => {
      toast.error("Erro ao criar instância", { description: err.message });
    },
  });

  // Connect (get QR)
  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "connect", loja_id: selectedLojaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.qrcode) {
        setQrCode(data.qrcode);
        toast.info("Escaneie o QR Code com seu WhatsApp");
      } else {
        toast.warning("QR Code não retornado pela API");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao conectar", { description: err.message });
    },
  });

  // Delete instance
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "delete", loja_id: selectedLojaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setQrCode(null);
      toast.success("Instância removida");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance", selectedLojaId] });
    },
    onError: (err: any) => {
      toast.error("Erro ao remover instância", { description: err.message });
    },
  });

  const hasInstance = instanceData && instanceData.status !== "none";
  const isConnected = instanceData?.status === "conectado";
  const isLoading = createMutation.isPending || connectMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Seletor de Loja */}
      <div className="space-y-2">
        <Label>Loja</Label>
        <Select value={selectedLojaId} onValueChange={(v) => { setSelectedLojaId(v); setQrCode(null); }}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Selecione a loja" />
          </SelectTrigger>
          <SelectContent>
            {lojas.map((loja) => (
              <SelectItem key={loja.id} value={loja.id}>
                {loja.nome} ({loja.codigo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {statusLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Verificando status...</span>
        </div>
      ) : !hasInstance ? (
        /* Sem instância */
        <div className="space-y-3">
          <Alert>
            <AlertDescription className="text-sm">
              Nenhuma instância WhatsApp configurada para esta loja. Crie uma instância para começar.
            </AlertDescription>
          </Alert>
          <Button onClick={() => createMutation.mutate()} disabled={isLoading || !selectedLojaId}>
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            Criar Instância
          </Button>
        </div>
      ) : isConnected ? (
        /* Conectado */
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">WhatsApp Conectado</p>
              {instanceData?.phone_number && (
                <p className="text-xs text-muted-foreground">{instanceData.phone_number}</p>
              )}
            </div>
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Conectado</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Status
            </Button>
            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={isLoading}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Desconectar
            </Button>
          </div>
        </div>
      ) : (
        /* Desconectado / QR pendente */
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <WifiOff className="w-5 h-5 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Instância Desconectada</p>
              <p className="text-xs text-muted-foreground">
                {instanceData?.instance_name}
              </p>
            </div>
            <Badge variant="secondary">Desconectado</Badge>
          </div>

          {qrCode ? (
            <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-background">
              <p className="text-sm font-medium">Escaneie o QR Code com seu WhatsApp:</p>
              <div className="bg-white p-4 rounded-lg">
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button onClick={() => connectMutation.mutate()} disabled={isLoading}>
              {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
              {qrCode ? "Gerar Novo QR Code" : "Conectar"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={isLoading}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remover Instância
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
