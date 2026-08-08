// Sincronização do módulo Frota (/veiculos) com o Supabase.
// O veiculosStore continua sendo a fonte síncrona da UI; cada mutação faz
// write-through para o banco, e hydrate() carrega o estado no load do módulo.
// As tabelas frota_* ainda não estão em types.ts — casts via (supabase as any).
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Veiculo, Posto, Oleo, Oficina, Servico, VeiculoConfig,
  Manutencao, Abastecimento, TrocaOleo,
} from '@/types/veiculos';

const db = () => supabase as any;

// Colunas do banco são snake_case puras; só os campos *ISO precisam de mapa.
const toVeiculoRow = (v: Veiculo) => ({
  ...strip(v, ['criado_emISO']),
  criado_em: v.criado_emISO || new Date().toISOString(),
  loja_id: v.loja_id || null,
});
const fromVeiculoRow = (r: any): Veiculo => ({ ...strip(r, ['criado_em', 'created_by']), criado_emISO: r.criado_em });
const toConfigRow = (c: VeiculoConfig) => ({ ...strip(c, ['desde_dataISO']), desde_data: c.desde_dataISO });
const fromConfigRow = (r: any): VeiculoConfig => ({ ...strip(r, ['desde_data']), desde_dataISO: r.desde_data });
const toManutRow = (m: Manutencao) => ({
  ...strip(m, ['dt_entradaISO', 'dt_saidaISO']),
  dt_entrada: m.dt_entradaISO ?? null,
  dt_saida: m.dt_saidaISO ?? null,
});
const fromManutRow = (r: any): Manutencao => ({
  ...strip(r, ['dt_entrada', 'dt_saida', 'created_by']),
  dt_entradaISO: r.dt_entrada ?? undefined,
  dt_saidaISO: r.dt_saida ?? undefined,
});
const identity = (x: any) => strip(x, ['created_by']);

function strip(obj: any, keys: string[]) {
  const out = { ...obj };
  keys.forEach((k) => delete out[k]);
  return out;
}

export const FROTA_TABELAS = {
  veiculos: { tabela: 'frota_veiculos', to: toVeiculoRow, from: fromVeiculoRow },
  postos: { tabela: 'frota_postos', to: identity, from: identity },
  oleos: { tabela: 'frota_oleos', to: identity, from: identity },
  oficinas: { tabela: 'frota_oficinas', to: identity, from: identity },
  servicos: { tabela: 'frota_servicos', to: identity, from: identity },
  veiculo_configs: { tabela: 'frota_veiculo_configs', to: toConfigRow, from: fromConfigRow },
  manutencoes: { tabela: 'frota_manutencoes', to: toManutRow, from: fromManutRow },
  abastecimentos: { tabela: 'frota_abastecimentos', to: identity, from: identity },
  trocas_oleo: { tabela: 'frota_trocas_oleo', to: identity, from: identity },
} as const;

export type FrotaEntidade = keyof typeof FROTA_TABELAS;

export function frotaUpsert(entidade: FrotaEntidade, item: any, onConflict = 'id') {
  const { tabela, to } = FROTA_TABELAS[entidade];
  void db()
    .from(tabela)
    .upsert(to(item), { onConflict })
    .then(({ error }: { error: any }) => {
      if (error) {
        console.error(`frota: falha ao salvar em ${tabela}:`, error);
        toast.error(`Não foi possível salvar no servidor (${tabela}): ${error.message}`);
      }
    });
}

export function frotaDelete(entidade: FrotaEntidade, id: string) {
  const { tabela } = FROTA_TABELAS[entidade];
  void db()
    .from(tabela)
    .delete()
    .eq('id', id)
    .then(({ error }: { error: any }) => {
      if (error) {
        console.error(`frota: falha ao excluir de ${tabela}:`, error);
        toast.error(`Não foi possível excluir no servidor (${tabela}): ${error.message}`);
      }
    });
}

export interface FrotaEstado {
  veiculos: Veiculo[];
  postos: Posto[];
  oleos: Oleo[];
  oficinas: Oficina[];
  servicos: Servico[];
  veiculo_configs: VeiculoConfig[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  trocas_oleo: TrocaOleo[];
}

export async function frotaFetchAll(): Promise<FrotaEstado> {
  const entradas = Object.entries(FROTA_TABELAS) as [FrotaEntidade, (typeof FROTA_TABELAS)[FrotaEntidade]][];
  const resultados = await Promise.all(
    entradas.map(async ([chave, { tabela, from }]) => {
      const { data, error } = await db().from(tabela).select('*');
      if (error) throw new Error(`${tabela}: ${error.message}`);
      return [chave, (data ?? []).map(from)] as const;
    }),
  );
  return Object.fromEntries(resultados) as unknown as FrotaEstado;
}

/**
 * Migração one-shot: se o banco está vazio e este navegador tem dados legados
 * do localStorage, sobe tudo (ordem respeita as FKs). IDs legados (Date.now)
 * são aceitos porque as PKs são text.
 */
export async function frotaSeedFromLocal(local: FrotaEstado): Promise<void> {
  const ordem: FrotaEntidade[] = [
    'postos', 'oleos', 'servicos', 'oficinas', 'veiculos',
    'veiculo_configs', 'manutencoes', 'abastecimentos', 'trocas_oleo',
  ];
  for (const entidade of ordem) {
    const itens = local[entidade] as any[];
    if (!itens?.length) continue;
    const { tabela, to } = FROTA_TABELAS[entidade];
    const { error } = await db().from(tabela).upsert(itens.map(to));
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}
