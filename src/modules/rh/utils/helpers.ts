import type { Pessoa } from '../types';

export function formatHours(hours: number): string {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  const sign = hours < 0 ? '-' : '';
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

export function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function buildHeadcountSeries(pessoas: Pessoa[]) {
  const months: { mes: string; headcount: number; admissoes: number; desligamentos: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mesStr = date.toISOString().slice(0, 7);
    const admissoes = pessoas.filter(p => p.admissaoISO?.startsWith(mesStr)).length;
    const headcount = pessoas.filter(p => {
      if (!p.admissaoISO) return false;
      return p.admissaoISO <= mesStr + '-31' && p.situacao === 'ativo';
    }).length;
    months.push({ mes: mesStr, headcount, admissoes, desligamentos: 0 });
  }
  return months;
}

export function buildTurnover(pessoas: Pessoa[]): number {
  const ativos = pessoas.filter(p => p.situacao === 'ativo').length;
  const inativos = pessoas.filter(p => p.situacao === 'inativo').length;
  if (ativos + inativos === 0) return 0;
  return Math.round((inativos / (ativos + inativos)) * 100 * 10) / 10;
}

// Match the 3-arg signature expected by Compliance.tsx
export function buildComplianceStats(examesOrAsos: any[], participacoesOrNR: any[], _treinamentos?: any[]) {
  const asoVencidos = examesOrAsos.filter((e: any) => e.status === 'vencido').length;
  const asoVencendo = examesOrAsos.filter((e: any) => {
    if (!e.dataVencimento) return false;
    const venc = new Date(e.dataVencimento);
    const now = new Date();
    const diff = (venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;
  const asoOK = examesOrAsos.filter((e: any) => e.status === 'realizado').length;

  const nrVencidos = participacoesOrNR.filter((t: any) => t.status === 'vencido').length;
  const nrVencendo = participacoesOrNR.filter((t: any) => {
    if (!t.dataVencimento) return false;
    const venc = new Date(t.dataVencimento);
    const now = new Date();
    const diff = (venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;
  const nrOK = participacoesOrNR.filter((t: any) => t.status === 'realizado').length;

  return {
    asoVencidos, asoVencendo, asoOK,
    nrVencidos, nrVencendo, nrOK,
    // Nested structure expected by Compliance.tsx
    aso: { vencidos: asoVencidos, vencendo: asoVencendo, ok: asoOK },
    treinamentos: { vencidos: nrVencidos, vencendo: nrVencendo, ok: nrOK }
  };
}

export function buildRsFunnel(vagas: any[], candidatos: any[]) {
  const totalCandidatos = candidatos.length;
  const entrevistas = candidatos.filter((c: any) => ['entrevista', 'teste', 'aprovado'].includes(c.etapa)).length;
  const testes = candidatos.filter((c: any) => ['teste', 'aprovado'].includes(c.etapa)).length;
  const aprovados = candidatos.filter((c: any) => c.etapa === 'aprovado').length;
  return {
    vagas: vagas.length, candidaturas: totalCandidatos,
    entrevistas, testes, aprovados,
    taxaConversao: totalCandidatos > 0 ? Math.round((aprovados / totalCandidatos) * 100) : 0
  };
}

export function buildJornadaKPIs(pontoMarcacoes: any[], ajustesPonto: any[]) {
  const ajustesPendentes = ajustesPonto.filter((a: any) => a.status === 'pendente').length;
  const ajustesAprovados = ajustesPonto.filter((a: any) => a.status === 'aprovado').length;
  const ajustesRecusados = ajustesPonto.filter((a: any) => a.status === 'recusado').length;
  const totalMarcacoes = pontoMarcacoes.length;
  const presencas = pontoMarcacoes.filter((m: any) => m.status === 'presente').length;
  const faltas = pontoMarcacoes.filter((m: any) => m.status === 'falta').length;
  const atrasos = pontoMarcacoes.filter((m: any) => m.status === 'atraso').length;
  const taxaPresenca = totalMarcacoes > 0 ? Math.round((presencas / totalMarcacoes) * 100 * 10) / 10 : 0;
  return {
    ajustesPendentes, ajustesAprovados, ajustesRecusados,
    totalMarcacoes, presencas, faltas, atrasos, taxaPresenca,
    horasExtras: 0,
    percentualPresenca: String(taxaPresenca)
  };
}

export function buildRhFinance(pessoas: any[], _beneficios?: any[], _elegibilidades?: any[]) {
  const ativos = pessoas.filter((p: any) => p.situacao === 'ativo');
  const totalFolha = ativos.reduce((sum: number, p: any) => sum + (p.salario || 0), 0);
  const mediaSalarial = ativos.length > 0 ? totalFolha / ativos.length : 0;
  return {
    totalFolha, mediaSalarial,
    totalColaboradores: ativos.length,
    custoMedioPorColaborador: mediaSalarial,
    custoTotal: totalFolha,
    custoMedio: mediaSalarial,
    percentualBeneficios: 0
  };
}
