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
  // .select() no delete: sob RLS, delete negado NÃO é erro — afeta 0 linhas.
  // Sem isso a exclusão falhava em silêncio e o item "ressuscitava" depois.
  void db()
    .from(tabela)
    .delete()
    .eq('id', id)
    .select('id')
    .then(({ data, error }: { data: any[] | null; error: any }) => {
      if (error) {
        console.error(`frota: falha ao excluir de ${tabela}:`, error);
        toast.error(`Não foi possível excluir no servidor (${tabela}): ${error.message}`);
      } else if (!data || data.length === 0) {
        toast.error('Exclusão não aplicada no servidor (sem permissão?). Recarregue a página.');
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

/** Ordem de seed que respeita as FKs. */
export const FROTA_ORDEM: FrotaEntidade[] = [
  'postos', 'oleos', 'servicos', 'oficinas', 'veiculos',
  'veiculo_configs', 'manutencoes', 'abastecimentos', 'trocas_oleo',
];

const PAGINA = 1000;

export async function frotaFetchAll(): Promise<FrotaEstado> {
  const entradas = Object.entries(FROTA_TABELAS) as [FrotaEntidade, (typeof FROTA_TABELAS)[FrotaEntidade]][];
  const resultados = await Promise.all(
    entradas.map(async ([chave, { tabela, from }]) => {
      // paginação: o PostgREST trunca em 1000 linhas por request — sem isto,
      // abastecimentos antigos sumiriam do cache e os relatórios mentiriam.
      const todos: any[] = [];
      for (let inicio = 0; ; inicio += PAGINA) {
        const { data, error } = await db()
          .from(tabela)
          .select('*')
          .order('id')
          .range(inicio, inicio + PAGINA - 1);
        if (error) throw new Error(`${tabela}: ${error.message}`);
        todos.push(...(data ?? []));
        if (!data || data.length < PAGINA) break;
      }
      return [chave, todos.map(from)] as const;
    }),
  );
  return Object.fromEntries(resultados) as unknown as FrotaEstado;
}

// Seed one-shot resumável: a lista de entidades pendentes fica em
// localStorage até TODAS subirem — um seed interrompido no meio não faz o
// hydrate seguinte descartar o que ainda não subiu.
const SEED_PENDENTE_KEY = 'frota-seed-pendente';

export function lerSeedPendente(): Set<FrotaEntidade> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEED_PENDENTE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function gravarSeedPendente(entidades: FrotaEntidade[]): void {
  if (entidades.length === 0) localStorage.removeItem(SEED_PENDENTE_KEY);
  else localStorage.setItem(SEED_PENDENTE_KEY, JSON.stringify(entidades));
}

/**
 * Sobe os dados legados do navegador para as entidades indicadas (upsert por
 * PK, idempotente). Não aborta no primeiro erro: devolve a lista de entidades
 * que falharam, para retry no próximo hydrate.
 */
export async function frotaSeedFromLocal(
  local: FrotaEstado,
  entidades: FrotaEntidade[],
): Promise<FrotaEntidade[]> {
  const falhas: FrotaEntidade[] = [];
  for (const entidade of FROTA_ORDEM) {
    if (!entidades.includes(entidade)) continue;
    const itens = local[entidade] as any[];
    if (!itens?.length) continue;
    const { tabela, to } = FROTA_TABELAS[entidade];
    const { error } = await db().from(tabela).upsert(itens.map(to));
    if (error) {
      console.error(`frota seed: ${tabela}:`, error);
      falhas.push(entidade);
    }
  }
  return falhas;
}
