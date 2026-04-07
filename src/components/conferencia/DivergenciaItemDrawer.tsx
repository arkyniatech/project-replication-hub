import { useState } from "react";
import { 
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, Equal, ShieldCheck, Package, Wrench, Eye, FileWarning
} from "lucide-react";
import { useSupabaseConferencia, type Divergencia } from "@/hooks/useSupabaseConferencia";
import { ACOES_LABELS, STATUS_LABELS, type AcaoInventario } from "@/config/inventario";

interface DivergenciaItemDrawerProps {
  divergencia: Divergencia;
  sessaoId: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DivergenciaItemDrawer({ divergencia, sessaoId, children, disabled = false }: DivergenciaItemDrawerProps) {
  const { setJustificativa, setAcao, canEdit } = useSupabaseConferencia();
  const [localJustificativa, setLocalJustificativa] = useState(divergencia.justificativa || '');
  const [localAcao, setLocalAcao] = useState<AcaoInventario | undefined>(divergencia.acao);

  const handleSalvar = async () => {
    if (localJustificativa.trim()) {
      await setJustificativa.mutateAsync({ sessaoId, itemId: divergencia.itemId, texto: localJustificativa.trim() });
    }
    if (localAcao) {
      await setAcao.mutateAsync({ sessaoId, itemId: divergencia.itemId, acao: localAcao });
    }
  };

  const getDivergenceIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (delta < 0) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Equal className="w-5 h-5 text-gray-600" />;
  };

  const getDivergenceColor = (delta: number) => {
    if (delta > 0) return "text-green-600 bg-green-50 border-green-200";
    if (delta < 0) return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDENTE': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'EM_INVESTIGACAO': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'AJUSTE_GERADO': return "bg-green-100 text-green-800 border-green-200";
      case 'APROVACAO_PENDENTE': return "bg-orange-100 text-orange-800 border-orange-200";
      case 'CONCLUIDO': return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Drawer>
      <DrawerTrigger asChild disabled={disabled}>{children}</DrawerTrigger>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" /> Detalhes do Item - {divergencia.codigo}
          </DrawerTitle>
          <DrawerDescription>
            {divergencia.descricao} • Tipo: {divergencia.tipo}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Quantidades</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sistema</span>
                  <span className="font-mono text-lg font-bold">{divergencia.qtdSistema}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Contado</span>
                  <span className="font-mono text-lg font-bold">{divergencia.qtdContada}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Diferença</span>
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${getDivergenceColor(divergencia.delta)}`}>
                      {getDivergenceIcon(divergencia.delta)}
                      <span className="font-mono text-lg font-bold">
                        {divergencia.delta > 0 ? '+' : ''}{divergencia.delta}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Status</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status Atual</span>
                  <Badge className={getStatusBadgeColor(divergencia.status)}>
                    {STATUS_LABELS[divergencia.status]}
                  </Badge>
                </div>
                {divergencia.acao && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ação</span>
                    <span className="text-sm font-medium">{ACOES_LABELS[divergencia.acao]}</span>
                  </div>
                )}
                {divergencia.exigeAprovacao && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-800 font-medium">Requer aprovação gerencial</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {canEdit() && divergencia.delta !== 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Ação e Justificativa</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ação a ser tomada *</label>
                  <Select value={localAcao || ''} onValueChange={(value) => setLocalAcao(value as AcaoInventario)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma ação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AJUSTAR_ESTOQUE">
                        <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-blue-600" /> Ajustar estoque</div>
                      </SelectItem>
                      <SelectItem value="INVESTIGAR">
                        <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-yellow-600" /> Investigar</div>
                      </SelectItem>
                      <SelectItem value="BAIXA_PATRIMONIAL">
                        <div className="flex items-center gap-2"><FileWarning className="w-4 h-4 text-red-600" /> Baixa patrimonial</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Justificativa *</label>
                  <Textarea
                    placeholder="Descreva o motivo da divergência..."
                    value={localJustificativa}
                    onChange={(e) => setLocalJustificativa(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            {canEdit() && divergencia.delta !== 0 && (
              <Button onClick={handleSalvar} disabled={!localAcao || !localJustificativa.trim()}>
                Salvar Alterações
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="outline">
                {canEdit() && divergencia.delta !== 0 ? 'Cancelar' : 'Fechar'}
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
