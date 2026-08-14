import { useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useContagem, useSupabaseContagens } from '@/modules/almox/hooks/useSupabaseContagens';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { toast } from 'sonner';

interface Props {
  contagemId: string;
  onVoltar: () => void;
}

/**
 * Revisão da contagem — restrita a quem processa (almox:contagem:processar).
 *
 * É a única tela do fluxo que mostra o saldo do sistema: a comparação só faz
 * sentido depois que a contagem física foi registrada.
 */
export default function ContagemRevisao({ contagemId, onVoltar }: Props) {
  const { contagem, isLoading } = useContagem(contagemId);
  const { lojaAtual } = useMultiunidade();
  const { definirAcao, processar } = useSupabaseContagens(lojaAtual?.id);
  const [soDivergentes, setSoDivergentes] = useState(true);

  const linhas = useMemo(() => {
    if (!contagem) return [];
    return contagem.itens
      .map(item => {
        const contado = item.quantidade_contada;
        const diferenca = contado === null ? null : Number(contado) - Number(item.saldo_sistema);
        const perc = diferenca === null || Number(item.saldo_sistema) === 0
          ? null
          : (diferenca / Number(item.saldo_sistema)) * 100;
        return { item, contado, diferenca, perc };
      })
      .sort((a, b) => Math.abs(b.diferenca ?? 0) - Math.abs(a.diferenca ?? 0));
  }, [contagem]);

  const naoContados = linhas.filter(l => l.contado === null).length;
  const divergentes = linhas.filter(l => l.diferenca !== null && l.diferenca !== 0);
  const visiveis = soDivergentes ? divergentes : linhas;

  const pendentesDeDecisao = divergentes.filter(l => !l.item.acao).length;
  const semJustificativa = divergentes.filter(
    l => l.item.acao === 'AJUSTAR' && !(l.item.justificativa || '').trim()
  ).length;

  const handleProcessar = () => {
    if (processar.isPending) return;
    // a contagem não pode ser reaberta: divergência sem decisão seria perdida
    if (pendentesDeDecisao > 0) {
      toast.error(`${pendentesDeDecisao} divergência(s) sem decisão. Marque cada uma como Ajustar ou Ignorar.`);
      return;
    }
    if (semJustificativa > 0) {
      toast.error(`${semJustificativa} item(ns) marcados para ajustar estão sem justificativa`);
      return;
    }
    processar.mutate(contagemId, { onSuccess: onVoltar });
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  }
  if (!contagem) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Contagem não encontrada.</p>
        <Button variant="outline" onClick={onVoltar}>Voltar</Button>
      </div>
    );
  }

  const encerrada = contagem.status !== 'aberta';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onVoltar} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Revisão da contagem {contagem.numero}</h1>
            <p className="text-sm text-muted-foreground">
              Compare o contado com o sistema e decida o que ajustar
            </p>
          </div>
        </div>

        {!encerrada && (
          <Button onClick={handleProcessar} disabled={processar.isPending} className="min-h-[44px]">
            <PlayCircle className="h-4 w-4 mr-2" />
            {processar.isPending ? 'Processando...' : 'Processar contagem'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold tabular-nums">{contagem.itens.length}</div>
          <p className="text-xs text-muted-foreground">itens na contagem</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold tabular-nums text-amber-600">{naoContados}</div>
          <p className="text-xs text-muted-foreground">não contados</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold tabular-nums text-red-600">{divergentes.length}</div>
          <p className="text-xs text-muted-foreground">com divergência</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold tabular-nums">{pendentesDeDecisao}</div>
          <p className="text-xs text-muted-foreground">aguardando decisão</p>
        </CardContent></Card>
      </div>

      {pendentesDeDecisao > 0 && !encerrada && (
        <Card className="border-red-500/40">
          <CardContent className="py-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">{pendentesDeDecisao} divergência(s) ainda sem decisão.</strong> Marque
              cada uma como <em>Ajustar</em> ou <em>Ignorar</em> — a contagem não pode ser reaberta depois de processada.
            </span>
          </CardContent>
        </Card>
      )}

      {naoContados > 0 && !encerrada && (
        <Card className="border-amber-500/40">
          <CardContent className="py-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">{naoContados} item(ns) não foram contados.</strong> Eles não entram
              no processamento — o saldo deles fica como está.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            {soDivergentes ? 'Divergências' : 'Todos os itens'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setSoDivergentes(v => !v)}>
            {soDivergentes ? 'Ver todos' : 'Só divergências'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {visiveis.map(({ item, contado, diferenca, perc }) => (
            <div key={item.id} className="border rounded-lg p-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">{item.sku || '—'}</span>
                    {item.processado && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> processado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.descricao}</p>
                  {item.observacao && (
                    <p className="text-xs text-muted-foreground mt-1">Obs. da contagem: {item.observacao}</p>
                  )}
                </div>

                <div className="text-sm text-right tabular-nums whitespace-nowrap">
                  <div className="text-muted-foreground">
                    Sistema {Number(item.saldo_sistema)} · Contado {contado === null ? '—' : Number(contado)}
                  </div>
                  {diferenca !== null && (
                    <div className={diferenca === 0 ? 'text-muted-foreground' : diferenca < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {diferenca > 0 ? '+' : ''}{diferenca} {item.unidade}
                      {perc !== null && ` (${perc > 0 ? '+' : ''}${perc.toFixed(1)}%)`}
                    </div>
                  )}
                </div>
              </div>

              {diferenca !== null && diferenca !== 0 && !encerrada && !item.processado && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Ação</Label>
                    <Select
                      value={item.acao ?? '__nenhuma__'}
                      // não reenvia a justificativa: o blur do campo ao lado
                      // acabou de gravá-la e o cache ainda tem o valor antigo,
                      // que sobrescreveria o texto recém-salvo.
                      onValueChange={(v) => definirAcao.mutate({
                        itemId: item.id,
                        acao: v === '__nenhuma__' ? null : (v as 'AJUSTAR' | 'IGNORAR'),
                      })}
                    >
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Decidir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__nenhuma__">— decidir depois —</SelectItem>
                        <SelectItem value="AJUSTAR">Ajustar estoque</SelectItem>
                        <SelectItem value="IGNORAR">Ignorar divergência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">
                      Justificativa {item.acao === 'AJUSTAR' && <span className="text-red-600">*</span>}
                    </Label>
                    <Input
                      defaultValue={item.justificativa ?? ''}
                      placeholder="Motivo da diferença"
                      className="min-h-[44px]"
                      onBlur={(e) => {
                        const valor = e.target.value.trim();
                        if (valor !== (item.justificativa ?? '')) {
                          definirAcao.mutate({ itemId: item.id, justificativa: valor || null });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {visiveis.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              {soDivergentes ? 'Nenhuma divergência — o contado bateu com o sistema.' : 'Nenhum item.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
