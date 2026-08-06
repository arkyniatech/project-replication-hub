import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileStack, Plus, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseDocumentos } from '../hooks/useSupabaseDocumentos';

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  enviado: { label: 'Enviado', variant: 'outline' },
  validado: { label: 'Validado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
  vencido: { label: 'Vencido', variant: 'destructive' },
};
const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : null);
const EMPTY = { pessoaId: '', tipoId: '', validade: '', file: null as File | null };

export default function Documentos() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const { tipos, documentos, isLoading, upload, revisar } = useSupabaseDocumentos();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const tipoSel = tipos.find((t) => t.id === form.tipoId);

  const handleUpload = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === form.pessoaId);
    if (!pessoa || !form.tipoId || !form.file) {
      toast({ title: 'Erro', description: 'Selecione colaborador, tipo e arquivo.', variant: 'destructive' });
      return;
    }
    if (!pessoa.lojaId) {
      toast({ title: 'Erro', description: 'Colaborador sem loja.', variant: 'destructive' });
      return;
    }
    try {
      await upload.mutateAsync({ pessoa, tipoId: form.tipoId, validade: form.validade || undefined, file: form.file });
      toast({ title: 'Documento enviado', description: pessoa.nome });
      setShowModal(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const handleRevisar = async (id: string, status: 'validado' | 'rejeitado') => {
    const motivo = status === 'rejeitado' ? window.prompt('Motivo da rejeição:') ?? undefined : undefined;
    if (status === 'rejeitado' && !motivo) return;
    try {
      await revisar.mutateAsync({ id, status, motivo });
      toast({ title: status === 'validado' ? 'Documento validado' : 'Documento rejeitado' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Envio e validação de documentos dos colaboradores</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />Enviar Documento
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Documentos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : documentos.length === 0 ? (
            <div className="text-center py-12">
              <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum documento enviado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => {
                const s = STATUS[d.status] ?? { label: d.status, variant: 'secondary' as const };
                return (
                  <div key={d.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{d.pessoa?.nome ?? '—'} · {d.tipo?.nome ?? 'Documento'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {d.nome_arquivo}{fmt(d.validade_ate) ? ` · validade ${fmt(d.validade_ate)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      {(d.status === 'enviado' || d.status === 'pendente') && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleRevisar(d.id, 'validado')}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRevisar(d.id, 'rejeitado')}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar Documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.pessoaId} onValueChange={(v) => setForm({ ...form, pessoaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de documento *</Label>
              <Select value={form.tipoId} onValueChange={(v) => setForm({ ...form, tipoId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {tipoSel?.exige_validade && (
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={upload.isPending}>
              {upload.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
