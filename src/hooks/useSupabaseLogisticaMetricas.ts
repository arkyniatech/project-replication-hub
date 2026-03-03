// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LogisticaMetrica {
  id: string;
  loja_id: string;
  data_iso: string;
  motorista_id?: string;
  planejadas: number;
  concluidas: number;
  on_window: number;
  reagendadas: number;
  km_total: number;
  motivos_falha: Array<{ motivo: string; count: number }>;
  created_at: string;
  updated_at: string;
}

interface MetricasFilters {
  lojaId: string;
  dataInicio: string;
  dataFim: string;
  motoristaId?: string;
}

export function useSupabaseLogisticaMetricas(filters: MetricasFilters) {
  return useQuery({
    queryKey: ["logistica-metricas", filters],
    queryFn: async () => {
      let query = supabase
        .from("logistica_metricas_diarias")
        .select("*")
        .eq("loja_id", filters.lojaId)
        .gte("data_iso", filters.dataInicio)
        .lte("data_iso", filters.dataFim);

      if (filters.motoristaId) {
        query = query.eq("motorista_id", filters.motoristaId);
      }

      const { data, error } = await query.order("data_iso", { ascending: true });

      if (error) throw error;
      return data as LogisticaMetrica[];
    },
    enabled: !!filters.lojaId && !!filters.dataInicio && !!filters.dataFim,
  });
}

// Hook auxiliar para calcular KPIs agregados
export function useLogisticaKPIs(metricas: LogisticaMetrica[] | undefined) {
  if (!metricas || metricas.length === 0) {
    return {
      totalPlanejadas: 0,
      totalConcluidas: 0,
      taxaConclusao: 0,
      taxaOnWindow: 0,
      totalReagendadas: 0,
      kmTotal: 0,
      kmPorEntrega: 0,
      topMotivos: [],
    };
  }

  const totalPlanejadas = metricas.reduce((sum, m) => sum + m.planejadas, 0);
  const totalConcluidas = metricas.reduce((sum, m) => sum + m.concluidas, 0);
  const totalOnWindow = metricas.reduce((sum, m) => sum + m.on_window, 0);
  const totalReagendadas = metricas.reduce((sum, m) => sum + m.reagendadas, 0);
  const kmTotal = metricas.reduce((sum, m) => sum + m.km_total, 0);

  const taxaConclusao = totalPlanejadas > 0 ? (totalConcluidas / totalPlanejadas) * 100 : 0;
  const taxaOnWindow = totalConcluidas > 0 ? (totalOnWindow / totalConcluidas) * 100 : 0;
  const kmPorEntrega = totalConcluidas > 0 ? kmTotal / totalConcluidas : 0;

  // Agregar motivos de falha
  const motivosMap = new Map<string, number>();
  metricas.forEach((metrica) => {
    if (metrica.motivos_falha && Array.isArray(metrica.motivos_falha)) {
      metrica.motivos_falha.forEach((item: any) => {
        const count = motivosMap.get(item.motivo) || 0;
        motivosMap.set(item.motivo, count + item.count);
      });
    }
  });

  const topMotivos = Array.from(motivosMap.entries())
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPlanejadas,
    totalConcluidas,
    taxaConclusao: Math.round(taxaConclusao),
    taxaOnWindow: Math.round(taxaOnWindow),
    totalReagendadas,
    kmTotal: Math.round(kmTotal),
    kmPorEntrega: Math.round(kmPorEntrega * 10) / 10,
    topMotivos,
  };
}
