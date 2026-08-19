import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Tag, TagsIcon, RefreshCw } from "lucide-react";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR } from "@/lib/date-utils";

interface DescontosTabProps {
  periodo: { inicio: string; fim: string };
}

const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DescontosTab({ periodo }: DescontosTabProps) {
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  const { contratos = [], aditivos = [], isLoading } = useSupabaseContratos(lojaAtual?.id);

  // #14.3: "Cheio" era só o `else` de "não teve desconto" — a tela nunca
  // perguntava se houve renovação, então todo contrato renovado sem desconto
  // era rotulado como venda cheia. A informação já chegava aqui por dois
  // caminhos independentes; o que faltava era consultá-la.
  const contratosRenovados = useMemo(() => {
    const ids = new Set<string>();
    // Caminho 1: aditivo de RENOVAÇÃO vinculado ao contrato (já buscado pelo
    // hook). O tipo importa: aditivos_contratuais aceita RENOVACAO, DESCONTO,
    // TAXA, AJUSTE e OUTRO, e taxaDeslocamentoService cria TAXA sozinho em
    // venda comum — aceitar qualquer tipo rotularia venda normal de
    // "Renovação" e, pior, tiraria contrato com DESCONTO real do bucket
    // "com desconto", sumindo com o valor do totalDescontoConcedido.
    // O status também importa: cancelarRenovacao faz soft-cancel (CANCELADO)
    // e reverte data_inicio, então a renovação cancelada tem de sair das duas
    // deteções — a da data se resolve sozinha, a do aditivo não.
    (aditivos || []).forEach((a: any) => {
      if (a?.contrato_id && a.tipo === 'RENOVACAO' && a.status !== 'CANCELADO') {
        ids.add(String(a.contrato_id));
      }
    });
    // Caminho 2: data_inicio_original preservada por trigger na renovação
    // (#52) — a data_inicio passa a valer o período vigente e a original
    // guarda o nascimento do contrato. Exige avanço: o trigger congela a
    // original em QUALQUER update, então uma correção de data digitada errada
    // também faria as duas divergirem. Renovação sempre empurra para frente.
    (contratos || []).forEach((c: any) => {
      if (c?.data_inicio_original && c.data_inicio > c.data_inicio_original) {
        ids.add(String(c.id));
      }
    });
    return ids;
  }, [contratos, aditivos]);

  // Uma venda (contrato) teve desconto quando o valor final ficou abaixo do
  // valor de tabela dos itens + frete. O desconto da política comercial é
  // aplicado ao valor_total, enquanto os itens guardam o preço de tabela em
  // preco_total — então a diferença revela o desconto concedido.
  // Usa valor_original (venda inicial) e não valor_total, que acumula as
  // renovações e faria todo contrato renovado aparecer como "Cheio" (#52).
  const linhas = useMemo(() => {
    return (contratos || [])
      .filter((c: any) => {
        const d = (c.created_at || '').slice(0, 10);
        return d >= periodo.inicio && d <= periodo.fim;
      })
      .map((c: any) => {
        const grossItens = (c.contrato_itens || []).reduce(
          (s: number, i: any) => s + Number(i.preco_total || 0), 0
        );
        const frete = Number(c.logistica?.frete ?? c.logistica?.taxaDeslocamento?.valor ?? 0);
        const valorTabela = grossItens + frete;
        const valorFinal = Number(c.valor_original ?? c.valor_total ?? 0);
        const desconto = Math.max(0, valorTabela - valorFinal);
        const temDesconto = desconto > 0.01;
        const descontoPct = valorTabela > 0 ? (desconto / valorTabela) * 100 : 0;
        const ehRenovacao = contratosRenovados.has(String(c.id));
        return {
          id: c.id,
          numero: c.numero,
          cliente: c.clientes?.nome || c.clientes?.razao_social || 'N/A',
          data: (c.created_at || '').slice(0, 10),
          valorTabela,
          desconto,
          descontoPct,
          valorFinal,
          temDesconto,
          ehRenovacao,
        };
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [contratos, periodo, contratosRenovados]);

  // Renovação sai da conta de "venda cheia": não é uma venda nova sem
  // desconto, é a continuação de uma venda que já foi contada antes.
  const comDesconto = linhas.filter(l => l.temDesconto && !l.ehRenovacao);
  const renovacoes = linhas.filter(l => l.ehRenovacao);
  const semDesconto = linhas.filter(l => !l.temDesconto && !l.ehRenovacao);
  const totalDescontoConcedido = comDesconto.reduce((s, l) => s + l.desconto, 0);
  const totalComDesconto = comDesconto.reduce((s, l) => s + l.valorFinal, 0);
  const totalSemDesconto = semDesconto.reduce((s, l) => s + l.valorFinal, 0);
  const totalRenovacoes = renovacoes.reduce((s, l) => s + l.valorFinal, 0);

  const exportarCSV = () => {
    const linhasCSV = [
      "Numero,Cliente,Data,Valor Tabela,Desconto,Desconto %,Valor Final,Tipo",
      ...linhas.map(l =>
        [l.numero, l.cliente, formatDateBR(l.data), l.valorTabela.toFixed(2),
         l.desconto.toFixed(2), l.descontoPct.toFixed(1), l.valorFinal.toFixed(2),
         l.ehRenovacao ? 'RENOVACAO' : l.temDesconto ? 'COM DESCONTO' : 'SEM DESCONTO'].join(',')
      ),
    ].join('\n');
    const blob = new Blob([linhasCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_desconto_${periodo.inicio}_a_${periodo.fim}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: "Relatório de descontos exportado em CSV." });
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando vendas...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Período: {formatDateBR(periodo.inicio)} — {formatDateBR(periodo.fim)} · {linhas.length} venda(s)
      </p>

      {/* Resumo com/sem desconto + renovações */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/50 p-3 bg-amber-50/50">
          <div className="flex items-center gap-1.5 text-amber-700">
            <Tag className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Com desconto</span>
          </div>
          <p className="text-lg font-bold text-foreground mt-1">{comDesconto.length}</p>
          <p className="text-[11px] text-muted-foreground">Faturado: {brl(totalComDesconto)}</p>
          <p className="text-[11px] text-amber-700">Desconto dado: {brl(totalDescontoConcedido)}</p>
        </div>
        <div className="rounded-lg border border-border/50 p-3 bg-emerald-50/50">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <TagsIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Sem desconto</span>
          </div>
          <p className="text-lg font-bold text-foreground mt-1">{semDesconto.length}</p>
          <p className="text-[11px] text-muted-foreground">Faturado: {brl(totalSemDesconto)}</p>
        </div>
      </div>

      {/* Renovações ficam num bucket próprio: não são venda nova sem desconto,
          são a continuação de uma venda já contada. Misturá-las em "Cheio"
          inflava a base de comparação de política comercial (#14.3). */}
      {renovacoes.length > 0 && (
        <div className="rounded-lg border border-border/50 p-3 bg-sky-50/50">
          <div className="flex items-center gap-1.5 text-sky-700">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Renovações</span>
          </div>
          <p className="text-lg font-bold text-foreground mt-1">{renovacoes.length}</p>
          <p className="text-[11px] text-muted-foreground">Faturado: {brl(totalRenovacoes)}</p>
        </div>
      )}

      <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={exportarCSV} disabled={linhas.length === 0}>
        <Download className="w-3 h-3 mr-1.5" /> Exportar CSV
      </Button>

      {/* Tabela */}
      {linhas.length > 0 && (
        <div className="border rounded-lg overflow-x-auto max-h-[320px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nº</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs text-right">Tabela</TableHead>
                <TableHead className="text-xs text-right">Desconto</TableHead>
                <TableHead className="text-xs text-right">Final</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs font-medium">{l.numero}</TableCell>
                  <TableCell className="text-xs">{l.cliente}</TableCell>
                  <TableCell className="text-xs">{formatDateBR(l.data)}</TableCell>
                  <TableCell className="text-xs text-right">{brl(l.valorTabela)}</TableCell>
                  <TableCell className="text-xs text-right">
                    {l.temDesconto ? (
                      <span className="text-amber-700">{brl(l.desconto)} ({l.descontoPct.toFixed(0)}%)</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">{brl(l.valorFinal)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={l.ehRenovacao ? 'outline' : l.temDesconto ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {l.ehRenovacao ? 'Renovação' : l.temDesconto ? 'Desconto' : 'Cheio'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
