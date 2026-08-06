import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Upload, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseHolerites, HoleriteLote } from '../hooks/useSupabaseHolerites';

const TIPOS = [
  { value: 'mensal', label: 'Mensal' },
  { value: '13_1', label: '13º · 1ª parcela' },
  { value: '13_2', label: '13º · 2ª parcela' },
  { value: 'ferias', label: 'Férias' },
  { value: 'rescisao', label: 'Rescisão' },
];
const tipoLabel = (v: string) => TIPOS.find((t) => t.value === v)?.label ?? v;
const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  publicado: { label: 'Publicado', variant: 'default' },
  despublicado: { label: 'Despublicado', variant: 'outline' },
};

export default function Holerites() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const { lotes, isLoading, criarLote, publicarLote, uploadHolerite } = useSupabaseHolerites();

  const [showCriar, setShowCriar] = useState(false);
  const [novoLote, setNovoLote] = useState({ competencia: format(new Date(), 'yyyy-MM'), tipo: 'mensal' });

  const [uploadLote, setUploadLote] = useState<HoleriteLote | null>(null);
  const [uploadForm, setUploadForm] = useState<{ pessoaId: string; file: File | null }>({ pessoaId: '', file: null });

  const handleCriarLote = async () => {
    if (!novoLote.competencia) {
      toast({ title: 'Erro', description: 'Informe a competência.', variant: 'destructive' });
      return;
    }
    try {
      await criarLote.mutateAsync({ competencia: novoLote.competencia, tipo: novoLote.tipo });
      toast({ title: 'Lote criado', description: `${novoLote.competencia} · ${tipoLabel(novoLote.tipo)}` });
      setShowCriar(false);
    } catch (e: any) {
      toast({ title: 'Erro ao criar lote', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const handleUpload = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === uploadForm.pessoaId);
    if (!uploadLote || !pessoa || !uploadForm.file) {
      toast({ title: 'Erro', description: 'Selecione o colaborador e o PDF.', variant: 'destructive' });
      return;
    }
    if (!pessoa.lojaId) {
      toast({ title: 'Erro', description: 'Colaborador sem loja.', variant: 'destructive' });
      return;
    }
    try {
      await uploadHolerite.mutateAsync({ lote: uploadLote, pessoa, file: uploadForm.file });
      toast({ title: 'Holerite enviado', description: pessoa.nome });
      setUploadForm({ pessoaId: '', file: null });
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const handlePublicar = async (lote: HoleriteLote, publicar: boolean) => {
    try {
      await publicarLote.mutateAsync({ id: lote.id, publicar });
      toast({ title: publicar ? 'Lote publicado' : 'Lote despublicado' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const countOf = (l: HoleriteLote) => l.holerites?.[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Holerites</h1>
          <p className="text-muted-foreground">Upload e publicação (não gera folha)</p>
        </div>
        <Button onClick={() => setShowCriar(true)}>
          <Plus className="w-4 h-4 mr-2" />Criar Lote
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : lotes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum lote criado. Crie um para enviar holerites.</p>
            <Button onClick={() => setShowCriar(true)}><Plus className="w-4 h-4 mr-2" />Criar Lote</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lotes.map((l) => {
            const s = STATUS[l.status] ?? { label: l.status, variant: 'secondary' as const };
            return (
              <Card key={l.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{l.competencia} · {tipoLabel(l.tipo)}</p>
                    <p className="text-sm text-muted-foreground">{countOf(l)} holerite(s) enviado(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Button variant="outline" size="sm" onClick={() => { setUploadLote(l); setUploadForm({ pessoaId: '', file: null }); }}>
                      <Upload className="h-4 w-4 mr-1" />Enviar
                    </Button>
                    {l.status === 'publicado' ? (
                      <Button variant="outline" size="sm" onClick={() => handlePublicar(l, false)}>
                        <EyeOff className="h-4 w-4 mr-1" />Despublicar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handlePublicar(l, true)} disabled={countOf(l) === 0}>
                        <Eye className="h-4 w-4 mr-1" />Publicar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Criar Lote */}
      <Dialog open={showCriar} onOpenChange={setShowCriar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Lote de Holerites</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Competência *</Label>
              <Input type="month" value={novoLote.competencia} onChange={(e) => setNovoLote({ ...novoLote, competencia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={novoLote.tipo} onValueChange={(v) => setNovoLote({ ...novoLote, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriar(false)}>Cancelar</Button>
            <Button onClick={handleCriarLote} disabled={criarLote.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enviar holerite (upload) */}
      <Dialog open={!!uploadLote} onOpenChange={(o) => !o && setUploadLote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar holerite — {uploadLote?.competencia}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={uploadForm.pessoaId} onValueChange={(v) => setUploadForm({ ...uploadForm, pessoaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo PDF *</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] ?? null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadLote(null)}>Fechar</Button>
            <Button onClick={handleUpload} disabled={uploadHolerite.isPending}>
              {uploadHolerite.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
