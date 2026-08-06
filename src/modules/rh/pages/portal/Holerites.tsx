import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download } from 'lucide-react';
import { usePortal, holeriteSignedUrl } from '../../hooks/usePortal';
import { toast } from '@/hooks/use-toast';

const TIPO: Record<string, string> = { mensal: 'Mensal', '13_1': '13º · 1ª', '13_2': '13º · 2ª', ferias: 'Férias', rescisao: 'Rescisão' };

export default function PortalHolerites() {
  const { holerites, isLoading } = usePortal();

  const baixar = async (path: string) => {
    const url = await holeriteSignedUrl(path);
    if (url) window.open(url, '_blank');
    else toast({ title: 'Erro ao abrir o arquivo', variant: 'destructive' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Holerites</h1>
        <p className="text-muted-foreground">Visualizar e baixar</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : holerites.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum holerite publicado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holerites.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium">{h.competencia} · {TIPO[h.lote?.tipo] ?? h.lote?.tipo}</p>
                    <p className="text-sm text-muted-foreground truncate">{h.nome_arquivo}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => baixar(h.storage_path)}>
                    <Download className="h-4 w-4 mr-1" />Baixar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
