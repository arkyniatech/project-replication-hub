// Agregações reais de RH para os relatórios (headcount, folha, férias, banco de horas, ausências, docs).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function groupCount<T>(rows: T[], key: (r: T) => string) {
  const m: Record<string, number> = {};
  rows.forEach((r) => { const k = key(r) || '—'; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function useRelatoriosRh() {
  const { data: pessoas = [], isLoading } = useQuery({
    queryKey: ['rel-pessoas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pessoas').select('id, nome, cargo, situacao, loja_id, loja:lojas(nome)');
      if (error) throw error;
      return data;
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ['rel-vinculos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pessoa_vinculo')
        .select('pessoa_id, salario, loja:lojas(nome), cargo:cargos(nome)')
        .is('vigencia_fim', null);
      return data || [];
    },
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ['rel-ferias'],
    queryFn: async () => (await supabase.from('ferias_periodos').select('status, dias_saldo, loja:lojas(nome)')).data || [],
  });

  const { data: horasMov = [] } = useQuery({
    queryKey: ['rel-horas'],
    queryFn: async () =>
      (await supabase.from('banco_horas_movimentos').select('pessoa_id, saldo_apos').order('ocorrido_em', { ascending: false }).order('created_at', { ascending: false })).data || [],
  });

  const { data: ausencias = [] } = useQuery({
    queryKey: ['rel-ausencias'],
    queryFn: async () => (await supabase.from('ausencias').select('tipo, dias')).data || [],
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['rel-docs'],
    queryFn: async () => (await supabase.from('rh_documentos').select('status')).data || [],
  });

  const ativos = pessoas.filter((p) => p.situacao === 'ativo');

  // folha (soma dos salários do vínculo vigente)
  const folhaTotal = vinculos.reduce((a, v) => a + Number(v.salario || 0), 0);
  const folhaPorCargo = (() => {
    const m: Record<string, number> = {};
    vinculos.forEach((v) => { const k = v.cargo?.nome || '—'; m[k] = (m[k] || 0) + Number(v.salario || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();
  const folhaPorLoja = (() => {
    const m: Record<string, number> = {};
    vinculos.forEach((v) => { const k = v.loja?.nome || '—'; m[k] = (m[k] || 0) + Number(v.salario || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  })();

  // férias passivo
  const feriasVencidas = ferias.filter((f) => f.status === 'vencido' || f.status === 'dobro_devido');
  const diasFeriasVencidos = feriasVencidas.reduce((a, f) => a + Number(f.dias_saldo || 0), 0);

  // banco de horas: saldo corrente por pessoa (1º movimento por pessoa já vem desc)
  const saldoPorPessoa: Record<string, number> = {};
  horasMov.forEach((m) => { if (saldoPorPessoa[m.pessoa_id] === undefined) saldoPorPessoa[m.pessoa_id] = Number(m.saldo_apos); });
  const saldoHorasTotal = Object.values(saldoPorPessoa).reduce((a, b) => a + b, 0);

  return {
    isLoading,
    headcount: ativos.length,
    porCargo: groupCount(ativos, (p) => p.cargo),
    porLoja: groupCount(ativos, (p) => p.loja?.nome),
    porSituacao: groupCount(pessoas, (p) => p.situacao),
    folhaTotal,
    folhaPorCargo,
    folhaPorLoja,
    feriasVencidasCount: feriasVencidas.length,
    diasFeriasVencidos,
    saldoHorasTotal,
    ausenciasPorTipo: groupCount(ausencias, (a) => a.tipo),
    ausenciasTotal: ausencias.length,
    docsPorStatus: groupCount(documentos, (d) => d.status),
  };
}

export function exportCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(';'), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
