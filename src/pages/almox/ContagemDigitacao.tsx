import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer, Save, Search, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useContagem, useSupabaseContagens, type ContagemItemRow } from '@/modules/almox/hooks/useSupabaseContagens';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useCurrentUserName } from '@/hooks/useCurrentUserName';
import { imprimirFolhaContagem } from '@/utils/contagem-almox-print';
import { toast } from 'sonner';

interface Props {
  contagemId: string;
  onVoltar: () => void;
  onRevisar: () => void;
  podeRevisar: boolean;
}

type Digitado = Record<string, { qtd: string; obs: string }>;

/**
 * Tela de digitação da contagem — usada no galpão, muitas vezes no celular.
 *
 * Regra que define esta tela: o saldo do sistema NÃO aparece em lugar nenhum.
 * É o que torna a contagem cega; quem conta registra o que viu na prateleira.
 */
export default function ContagemDigitacao({ contagemId, onVoltar, onRevisar, podeRevisar }: Props) {
  const { contagem, isLoading } = useContagem(contagemId);
  const { lojaAtual } = useMultiunidade();
  const { lancarContagem } = useSupabaseContagens(lojaAtual?.id);
  const usuarioNome = useCurrentUserName();

  const [busca, setBusca] = useState('');
  const [digitado, setDigitado] = useState<Digitado>({});
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // carrega o que já foi contado antes (a contagem pode ser retomada depois)
  useEffect(() => {
    if (!contagem) return;
    setDigitado(prev => {
      if (Object.keys(prev).length > 0) return prev;
      const inicial: Digitado = {};
      for (const item of contagem.itens) {
        inicial[item.id] = {
          qtd: item.quantidade_contada === null ? '' : String(item.quantidade_contada),
          obs: item.observacao ?? '',
        };
      }
      return inicial;
    });
  }, [contagem]);

  const itensFiltrados = useMemo(() => {
    if (!contagem) return [] as ContagemItemRow[];
    const termo = busca.trim().toLowerCase();
    const ordenados = [...contagem.itens].sort((a, b) =>
      (a.sku || a.descricao).localeCompare(b.sku || b.descricao)
    );
    if (!termo) return ordenados;
    return ordenados.filter(i =>
      (i.sku || '').toLowerCase().includes(termo) ||
      i.descricao.toLowerCase().includes(termo) ||
      (i.grupo || '').toLowerCase().includes(termo)
    );
  }, [contagem, busca]);

  const total = contagem?.itens.length ?? 0;
  const contados = useMemo(
    () => Object.values(digitado).filter(d => d.qtd.trim() !== '').length,
    [digitado]
  );
  const progresso = total > 0 ? Math.round((contados / total) * 100) : 0;

  const atualizar = (itemId: string, campo: 'qtd' | 'obs', valor: string) => {
    setDigitado(prev => ({ ...prev, [itemId]: { ...prev[itemId], [campo]: valor } }));
  };

  // Enter/setas pulam para o próximo item — digitação em série sem tirar a mão do teclado
  const aoTeclar = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      inputsRef.current[Math.min(index + 1, itensFiltrados.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      inputsRef.current[Math.max(index - 1, 0)]?.focus();
    }
  };

  /** O que ainda não foi para o banco. Usado para salvar e para avisar ao sair. */
  const pendencias = () => {
    if (!contagem) return [];
    return contagem.itens
      .filter(item => {
        const d = digitado[item.id];
        if (!d) return false;
        const qtdAtual = item.quantidade_contada === null ? '' : String(item.quantidade_contada);
        return d.qtd !== qtdAtual || (d.obs || '') !== (item.observacao ?? '');
      })
      .map(item => {
        const d = digitado[item.id];
        const bruto = d.qtd.trim().replace(',', '.');
        const num = bruto === '' ? null : Number(bruto);
        return { id: item.id, quantidade_contada: num, observacao: d.obs.trim() || null };
      });
  };

  /** Salva e retorna se deu certo — quem navega precisa esperar por isso. */
  const salvar = async (silencioso = false): Promise<boolean> => {
    const lancamentos = pendencias();

    const invalido = lancamentos.find(l =>
      l.quantidade_contada !== null && (!Number.isFinite(l.quantidade_contada) || l.quantidade_contada < 0)
    );
    if (invalido) {
      toast.error('Há quantidade inválida ou negativa — confira os campos preenchidos');
      return false;
    }
    if (!lancamentos.length) {
      if (!silencioso) toast.info('Nada novo para salvar');
      return true;
    }

    try {
      await lancarContagem.mutateAsync(lancamentos);
      return true;
    } catch {
      return false; // o hook já mostrou o erro
    }
  };

  const handleSalvar = () => { void salvar(); };

  // sair sem salvar descartaria tudo que foi digitado desde o último save
  const sairSalvando = async (destino: () => void) => {
    if (pendencias().length > 0 && !(await salvar(true))) return;
    destino();
  };

  const handleImprimir = () => {
    if (!contagem) return;
    imprimirFolhaContagem({
      numero: contagem.numero,
      lojaNome: lojaAtual?.nome ?? 'Loja',
      tipo: contagem.tipo,
      grupo: contagem.grupo,
      responsavel: usuarioNome,
      itens: contagem.itens.map(i => ({
        sku: i.sku, descricao: i.descricao, unidade: i.unidade, grupo: i.grupo,
      })),
    });
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
    <div className="space-y-4">
      {/* Cabeçalho fixo: progresso sempre à vista enquanto rola a lista */}
      <div className="sticky top-0 z-10 -mx-2 px-2 pt-2 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => void sairSalvando(onVoltar)} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Contagem {contagem.numero}</h1>
              <p className="text-sm text-muted-foreground">
                {contagem.tipo}{contagem.grupo ? ` · ${contagem.grupo}` : ''} · {total} itens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImprimir} className="min-h-[44px]">
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Folha</span>
            </Button>
            {!encerrada && (
              <Button size="sm" onClick={handleSalvar} disabled={lancarContagem.isPending} className="min-h-[44px]">
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{lancarContagem.isPending ? 'Salvando...' : 'Salvar'}</span>
              </Button>
            )}
            {podeRevisar && !encerrada && (
              <Button size="sm" variant="secondary" onClick={() => void sairSalvando(onRevisar)} className="min-h-[44px]">
                <ClipboardCheck className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Revisar</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Progress value={progresso} className="h-2 flex-1" />
          <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
            {contados}/{total}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar SKU, descrição ou grupo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>
      </div>

      {encerrada && (
        <Card>
          <CardContent className="py-3 text-sm text-muted-foreground">
            Esta contagem está <strong>{contagem.status}</strong> — os valores não podem mais ser alterados.
          </CardContent>
        </Card>
      )}

      {/* Lista: card empilhado no celular, linha no desktop.
          Nenhum saldo do sistema aparece aqui — contagem cega. */}
      <div className="space-y-2">
        {itensFiltrados.map((item, index) => {
          const d = digitado[item.id] ?? { qtd: '', obs: '' };
          const preenchido = d.qtd.trim() !== '';
          return (
            <Card key={item.id} className={preenchido ? 'border-primary/40' : undefined}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="min-w-0 md:flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{item.sku || '—'}</span>
                      {item.grupo && <Badge variant="outline" className="text-xs">{item.grupo}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.descricao}</p>
                  </div>

                  <div className="flex gap-2 md:w-[380px]">
                    <div className="w-[130px] shrink-0">
                      <label className="text-xs text-muted-foreground" htmlFor={`qtd-${item.id}`}>
                        Contado ({item.unidade})
                      </label>
                      <Input
                        id={`qtd-${item.id}`}
                        ref={(el) => (inputsRef.current[index] = el)}
                        // inputMode numérico: abre o teclado de números no celular
                        inputMode="decimal"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="—"
                        value={d.qtd}
                        onChange={(e) => atualizar(item.id, 'qtd', e.target.value)}
                        onKeyDown={(e) => aoTeclar(e, index)}
                        disabled={encerrada}
                        className="text-center text-lg min-h-[44px]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground" htmlFor={`obs-${item.id}`}>
                        Observação
                      </label>
                      <Input
                        id={`obs-${item.id}`}
                        placeholder="Avaria, item fora do lugar..."
                        value={d.obs}
                        onChange={(e) => atualizar(item.id, 'obs', e.target.value)}
                        disabled={encerrada}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {itensFiltrados.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum item encontrado para “{busca}”.
            </CardContent>
          </Card>
        )}
      </div>

      {!encerrada && (
        <div className="flex justify-end pb-8">
          <Button onClick={handleSalvar} disabled={lancarContagem.isPending} className="min-h-[44px]">
            <Save className="h-4 w-4 mr-2" />
            {lancarContagem.isPending ? 'Salvando...' : 'Salvar contagem'}
          </Button>
        </div>
      )}
    </div>
  );
}
