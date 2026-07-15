import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package } from "lucide-react";
import { useSupabaseOrdensServico } from "@/hooks/useSupabaseOrdensServico";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  RASCUNHO: { color: "bg-gray-500", label: "Rascunho" },
  FINALIZADO: { color: "bg-blue-500", label: "Finalizado" },
  COMPRADO: { color: "bg-yellow-500", label: "Comprado" },
  PARCIAL: { color: "bg-orange-500", label: "Parcial" },
  TOTAL: { color: "bg-green-500", label: "Recebido" },
};

export default function PedidosPecasList() {
  const navigate = useNavigate();
  const { ordens, isLoading } = useSupabaseOrdensServico();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Pedidos de peças são armazenados como jsonb dentro da OS (os.pedido_pecas).
  // Listamos apenas as OS que já possuem um pedido iniciado.
  const pedidos = ordens.filter((os) => {
    const p = os.pedido_pecas as any;
    return p && (p.status || (Array.isArray(p.itens) && p.itens.length > 0));
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos de Peças</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de peças abertos a partir das ordens de serviço
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos ({pedidos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido de peças aberto</p>
              <p className="text-xs mt-1">
                Abra um pedido a partir de uma OS na Área Azul (Aguardando Peças)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pedidos.map((os) => {
                const p = os.pedido_pecas as any;
                const itens = Array.isArray(p.itens) ? p.itens : [];
                const total = itens.reduce(
                  (acc: number, item: any) => acc + (item.custo || 0) * (item.qtd || 0),
                  0
                );
                const statusInfo = p.status ? STATUS_CONFIG[p.status] : undefined;

                return (
                  <div
                    key={os.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/manutencao/pecas/${os.id}`)}
                  >
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{os.numero}</span>
                        {statusInfo && (
                          <Badge className={`text-white text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {os.area_atual}
                        </Badge>
                      </div>
                      {os.equipamento && (
                        <div className="text-sm text-muted-foreground">
                          {os.equipamento.codigo_interno}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {itens.length} {itens.length === 1 ? "item" : "itens"}
                        {p.fornecedor ? ` • ${p.fornecedor}` : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">R$ {total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Estimado</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
