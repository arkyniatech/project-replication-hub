import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Clock } from "lucide-react";
import { useSupabaseObras } from "@/hooks/useSupabaseObras";
import { useMultiunidade } from "@/hooks/useMultiunidade";

interface ObrasBlockProps {
  clienteId: string;
}

export function ObrasBlock({ clienteId }: ObrasBlockProps) {
  const { lojaAtual } = useMultiunidade();
  const { obras = [], isLoading, setAsPadrao } = useSupabaseObras(lojaAtual?.id, clienteId);
  
  const obrasVisiveis = obras.slice(0, 4);

  const handleDefinirPadrao = (obraId: string) => {
    setAsPadrao.mutate({ obraId, clienteId });
  };

  const handleVerNoMapa = (obraId: string) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    
    const endereco = obra.endereco as any;
    if (endereco) {
      const query = encodeURIComponent(
        `${endereco.logradouro}, ${endereco.numero}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.uf}`
      );
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Obras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Carregando obras...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Obras ({obras.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {obrasVisiveis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma obra cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {obrasVisiveis.map((obra) => (
                         <div 
                key={obra.id}
                className="p-4 border rounded-lg hover:bg-muted/20 transition-colors relative"
              >
                {obra.is_padrao && (
                  <div className="absolute top-2 right-2">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">
                      {obra.nome}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const endereco = obra.endereco as any;
                        if (!endereco) return 'Endereço não cadastrado';
                        return `${endereco.logradouro}, ${endereco.numero}${endereco.complemento ? ' - ' + endereco.complemento : ''} - ${endereco.bairro}, ${endereco.cidade}/${endereco.uf}`;
                      })()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerNoMapa(obra.id)}
                      className="h-7 px-2 text-xs"
                    >
                      Ver no mapa
                    </Button>
                    
                    {!obra.is_padrao && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDefinirPadrao(obra.id)}
                        className="h-7 px-2 text-xs"
                        disabled={setAsPadrao.isPending}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Definir padrão
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}