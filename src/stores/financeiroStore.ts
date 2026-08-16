import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Conta,
  Transfer,
  Lancamento,
  Conciliacao,
  ExtratoLinha,
  Match,
  TransferConfig
} from '@/types/financeiro';

// Fonte da verdade é o Supabase: contas em contas_financeiras (tabela já
// existente) e o restante nas tabelas fin_* (migration 20260809160000).
// O estado local (persist) é cache otimista; hydrate() carrega no load do
// módulo e cada mutação faz write-through. Efetivar/estornar transferência
// são RPCs ATÔMICAS no banco (saldo + lançamentos + status numa transação).
// Dados legados deste navegador não são migrados (eram seed/mock).

const db = () => supabase as any;

const fromContaRow = (r: any): Conta => ({
  id: r.id,
  lojaId: r.loja_id,
  codigo: r.codigo,
  nome: r.nome,
  banco: r.banco ?? '',
  agencia: r.agencia ?? '',
  numero: r.numero ?? '',
  moeda: 'BRL',
  saldoAtual: Number(r.saldo_atual ?? 0),
  bloqueios: Number(r.bloqueios ?? 0),
  ativo: r.ativo,
  createdAt: r.created_at,
});
const toContaRow = (c: Partial<Conta>) => {
  const out: any = {};
  if (c.id !== undefined) out.id = c.id;
  if (c.lojaId !== undefined) out.loja_id = c.lojaId;
  if (c.codigo !== undefined) out.codigo = c.codigo;
  if (c.nome !== undefined) out.nome = c.nome;
  if (c.banco !== undefined) out.banco = c.banco;
  if (c.agencia !== undefined) out.agencia = c.agencia;
  if (c.numero !== undefined) out.numero = c.numero;
  if (c.saldoAtual !== undefined) out.saldo_atual = c.saldoAtual;
  if (c.bloqueios !== undefined) out.bloqueios = c.bloqueios;
  if (c.ativo !== undefined) out.ativo = c.ativo;
  return out;
};

const fromTransferRow = (r: any): Transfer => ({
  id: r.id,
  lojaId: r.loja_id,
  origemId: r.origem_id,
  destinoId: r.destino_id,
  valor: Number(r.valor),
  taxa: Number(r.taxa ?? 0),
  data: r.data,
  status: r.status,
  createdBy: r.created_by ?? '',
  createdAtISO: r.created_at,
  ref: r.ref ?? undefined,
  descricao: r.descricao ?? undefined,
  anexo: r.anexo ?? undefined,
  centrosCusto: r.centros_custo ?? undefined,
  observacoes: r.observacoes ?? undefined,
  estornoDe: r.estorno_de ?? undefined,
});

const fromLancamentoRow = (r: any): Lancamento => ({
  id: r.id,
  contaId: r.conta_id,
  tipo: r.tipo,
  valor: Number(r.valor),
  data: r.data,
  origem: r.origem,
  refId: r.ref_id ?? undefined,
  cc: r.cc ?? undefined,
  descricao: r.descricao ?? undefined,
  createdAtISO: r.created_at,
});

const fromConciliacaoRow = (r: any): Conciliacao => ({
  id: r.id,
  lojaId: r.loja_id,
  contaId: r.conta_id,
  periodo: { ini: r.periodo_ini, fim: r.periodo_fim },
  saldoInicialExtrato: Number(r.saldo_inicial_extrato ?? 0),
  saldoFinalExtrato: Number(r.saldo_final_extrato ?? 0),
  status: r.status,
  criadoPor: r.created_by ?? '',
  criadoEmISO: r.created_at,
});

const fromExtratoRow = (r: any): ExtratoLinha => ({
  id: r.id,
  conciliacaoId: r.conciliacao_id,
  data: r.data,
  historico: r.historico ?? '',
  valor: Number(r.valor),
  tipo: r.tipo,
  doc: r.doc ?? undefined,
  saldo: r.saldo != null ? Number(r.saldo) : undefined,
  pareado: !!r.pareado,
});

const fromMatchRow = (r: any): Match => ({
  id: r.id,
  conciliacaoId: r.conciliacao_id,
  extratoId: r.extrato_id,
  lancamentoId: r.lancamento_id,
  modo: r.modo,
  criadoEmISO: r.created_at,
});

function finWrite(tabela: string, op: 'upsert' | 'update' | 'delete', payload: any) {
  const q = op === 'upsert'
    ? db().from(tabela).upsert(payload)
    : op === 'update'
    ? db().from(tabela).update(payload).eq('id', payload.id)
    : db().from(tabela).delete().eq('id', payload);
  return q.then(({ error }: { error: any }) => {
    if (error) {
      console.error(`financeiro: falha em ${tabela}:`, error);
      toast.error(`Não foi possível salvar no servidor (${tabela}): ${error.message}`);
    }
    return error;
  });
}

interface FinanceiroState {
  contas: Conta[];
  transferencias: Transfer[];
  lancamentos: Lancamento[];
  conciliacoes: Conciliacao[];
  extratoLinhas: ExtratoLinha[];
  matches: Match[];
  config: TransferConfig;
  financeiroHidratado: boolean;

  hydrate: (force?: boolean) => Promise<void>;

  addConta: (conta: Omit<Conta, 'id' | 'createdAt'>) => void;
  updateConta: (id: string, updates: Partial<Conta>) => void;
  getContasByLoja: (lojaId: string) => Conta[];
  updateSaldoConta: (contaId: string, valor: number, operacao: 'add' | 'subtract') => void;

  createTransfer: (transfer: Omit<Transfer, 'id' | 'createdAtISO'>) => string;
  updateTransfer: (id: string, updates: Partial<Transfer>) => void;
  efetivarTransfer: (id: string) => void;
  cancelarTransfer: (id: string) => void;
  estornarTransfer: (id: string, motivo: string) => void;
  getTransfersByLoja: (lojaId: string) => Transfer[];

  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'createdAtISO'>) => void;
  getLancamentosByConta: (contaId: string, periodo?: { ini: string; fim: string }) => Lancamento[];

  createConciliacao: (conciliacao: Omit<Conciliacao, 'id' | 'criadoEmISO'>) => string;
  addExtratoLinhas: (conciliacaoId: string, linhas: Omit<ExtratoLinha, 'id' | 'conciliacaoId'>[]) => Promise<any>;
  createMatch: (match: Omit<Match, 'id' | 'criadoEmISO'>) => void;
  removeMatch: (matchId: string) => void;
  fecharConciliacao: (conciliacaoId: string) => void;
  getConciliacaoById: (id: string) => Conciliacao | undefined;
  getExtratoByConc: (conciliacaoId: string) => ExtratoLinha[];
  getMatchesByConc: (conciliacaoId: string) => Match[];

  seedInitialData: (lojaId: string) => void;
  clearData: () => void;
}

let hidratando = false;

export const useFinanceiroStore = create<FinanceiroState>()(
  persist(
    (set, get) => ({
      contas: [],
      transferencias: [],
      lancamentos: [],
      conciliacoes: [],
      extratoLinhas: [],
      matches: [],
      config: {
        allowOverdraft: false,
        toleranciaDias: 3,
        taxaPadrao: 5.00
      },
      financeiroHidratado: false,

      hydrate: async (force = false) => {
        if (hidratando || (get().financeiroHidratado && !force)) return;
        hidratando = true;
        try {
          const [contas, transf, lanc, conc, extrato, matches] = await Promise.all([
            db().from('contas_financeiras').select('*').order('nome'),
            db().from('fin_transferencias').select('*').order('created_at', { ascending: false }),
            db().from('fin_lancamentos').select('*').order('data', { ascending: false }),
            db().from('fin_conciliacoes').select('*').order('created_at', { ascending: false }),
            db().from('fin_extrato_linhas').select('*'),
            db().from('fin_matches').select('*'),
          ]);
          const err = contas.error ?? transf.error ?? lanc.error ?? conc.error ?? extrato.error ?? matches.error;
          if (err) throw err;
          set({
            contas: (contas.data ?? []).map(fromContaRow),
            transferencias: (transf.data ?? []).map(fromTransferRow),
            lancamentos: (lanc.data ?? []).map(fromLancamentoRow),
            conciliacoes: (conc.data ?? []).map(fromConciliacaoRow),
            extratoLinhas: (extrato.data ?? []).map(fromExtratoRow),
            matches: (matches.data ?? []).map(fromMatchRow),
            financeiroHidratado: true,
          });
        } catch (e: any) {
          console.error('financeiro: falha ao carregar do servidor:', e);
          toast.error(`Financeiro: usando dados locais (${e?.message ?? e})`);
        } finally {
          hidratando = false;
        }
      },

      // Actions - Contas
      addConta: (conta) => {
        const nova: Conta = { ...conta, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ contas: [...state.contas, nova] }));
        finWrite('contas_financeiras', 'upsert', { ...toContaRow(nova), tipo: 'BANCO' });
      },

      updateConta: (id, updates) => {
        set((state) => ({
          contas: state.contas.map((c) => (c.id === id ? { ...c, ...updates } : c))
        }));
        finWrite('contas_financeiras', 'upsert', { id, ...toContaRow(updates) });
      },

      getContasByLoja: (lojaId) => {
        // sem auto-seed: a verdade vem do banco (hydrate)
        return get().contas.filter(c => c.lojaId === lojaId && c.ativo);
      },

      updateSaldoConta: (contaId, valor, operacao) => {
        set((state) => ({
          contas: state.contas.map((c) =>
            c.id === contaId
              ? { ...c, saldoAtual: operacao === 'add' ? c.saldoAtual + valor : c.saldoAtual - valor }
              : c
          )
        }));
        const conta = get().contas.find((c) => c.id === contaId);
        if (conta) finWrite('contas_financeiras', 'upsert', { id: contaId, saldo_atual: conta.saldoAtual });
      },

      // Actions - Transferências
      createTransfer: (transfer) => {
        const id = crypto.randomUUID();
        const nova: Transfer = { ...transfer, id, createdAtISO: new Date().toISOString() };
        set((state) => ({ transferencias: [...state.transferencias, nova] }));
        finWrite('fin_transferencias', 'upsert', {
          id,
          loja_id: nova.lojaId,
          origem_id: nova.origemId,
          destino_id: nova.destinoId,
          valor: nova.valor,
          taxa: nova.taxa ?? 0,
          data: nova.data,
          status: 'PENDENTE',
          ref: nova.ref ?? null,
          descricao: nova.descricao ?? null,
          anexo: nova.anexo ?? null,
          centros_custo: nova.centrosCusto ?? null,
          observacoes: nova.observacoes ?? null,
          estorno_de: nova.estornoDe ?? null,
        });
        return id;
      },

      updateTransfer: (id, updates) => {
        set((state) => ({
          transferencias: state.transferencias.map((t) => (t.id === id ? { ...t, ...updates } : t))
        }));
      },

      // ATÔMICO no banco: status + 2 lançamentos + 2 saldos numa transação.
      efetivarTransfer: (id) => {
        void db().rpc('fin_efetivar_transferencia', { p_id: id })
          .then(({ error }: { error: any }) => {
            if (error) {
              toast.error(`Não foi possível efetivar: ${error.message}`);
              return;
            }
            return get().hydrate(true);
          });
      },

      cancelarTransfer: (id) => {
        const t = get().transferencias.find((x) => x.id === id);
        if (!t || t.status !== 'PENDENTE') {
          toast.error('Só transferência pendente pode ser cancelada.');
          return;
        }
        get().updateTransfer(id, { status: 'CANCELADA' });
        void finWrite('fin_transferencias', 'update', { id, status: 'CANCELADA' })
          .then((error: any) => {
            if (error) get().updateTransfer(id, { status: t.status });
          });
      },

      estornarTransfer: (id, motivo) => {
        void db().rpc('fin_estornar_transferencia', { p_id: id, p_motivo: motivo })
          .then(({ error }: { error: any }) => {
            if (error) {
              toast.error(`Não foi possível estornar: ${error.message}`);
              return;
            }
            return get().hydrate(true);
          });
      },

      getTransfersByLoja: (lojaId) => {
        return get().transferencias.filter(t => t.lojaId === lojaId);
      },

      // Actions - Lançamentos
      addLancamento: (lancamento) => {
        const id = crypto.randomUUID();
        const novo: Lancamento = { ...lancamento, id, createdAtISO: new Date().toISOString() };
        set((state) => ({ lancamentos: [...state.lancamentos, novo] }));
        const conta = get().contas.find((c) => c.id === lancamento.contaId);
        finWrite('fin_lancamentos', 'upsert', {
          id,
          conta_id: novo.contaId,
          loja_id: conta?.lojaId ?? null,
          tipo: novo.tipo,
          valor: novo.valor,
          data: novo.data,
          origem: novo.origem,
          ref_id: novo.refId ?? null,
          cc: novo.cc ?? null,
          descricao: novo.descricao ?? null,
        });
      },

      getLancamentosByConta: (contaId, periodo) => {
        let filtered = get().lancamentos.filter(l => l.contaId === contaId);
        if (periodo) {
          filtered = filtered.filter(l => l.data >= periodo.ini && l.data <= periodo.fim);
        }
        return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      // Actions - Conciliação
      createConciliacao: (conciliacao) => {
        const id = crypto.randomUUID();
        const nova: Conciliacao = { ...conciliacao, id, criadoEmISO: new Date().toISOString() };
        set((state) => ({ conciliacoes: [...state.conciliacoes, nova] }));
        finWrite('fin_conciliacoes', 'upsert', {
          id,
          loja_id: nova.lojaId,
          conta_id: nova.contaId,
          periodo_ini: nova.periodo.ini,
          periodo_fim: nova.periodo.fim,
          saldo_inicial_extrato: nova.saldoInicialExtrato,
          saldo_final_extrato: nova.saldoFinalExtrato,
          status: nova.status,
        });
        return id;
      },

      addExtratoLinhas: (conciliacaoId, linhas) => {
        const novas: ExtratoLinha[] = linhas.map((linha) => ({
          ...linha,
          id: crypto.randomUUID(),
          conciliacaoId,
          pareado: false,
        }));
        set((state) => ({ extratoLinhas: [...state.extratoLinhas, ...novas] }));
        // Devolve a promise: quem importa precisa saber se o banco aceitou antes
        // de dizer "importado com sucesso". Em caso de erro desfaz o otimismo,
        // senao a tela mostra linhas que nao existem no servidor.
        return finWrite('fin_extrato_linhas', 'upsert', novas.map((l) => ({
          id: l.id,
          conciliacao_id: conciliacaoId,
          data: l.data,
          historico: l.historico,
          valor: l.valor,
          tipo: l.tipo,
          doc: l.doc ?? null,
          saldo: l.saldo ?? null,
          pareado: false,
        }))).then((error: any) => {
          if (error) {
            const ids = new Set(novas.map((l) => l.id));
            set((state) => ({
              extratoLinhas: state.extratoLinhas.filter((l) => !ids.has(l.id)),
            }));
          }
          return error;
        });
      },

      createMatch: (match) => {
        const id = crypto.randomUUID();
        set((state) => ({
          matches: [...state.matches, { ...match, id, criadoEmISO: new Date().toISOString() }],
          extratoLinhas: state.extratoLinhas.map(linha =>
            linha.id === match.extratoId ? { ...linha, pareado: true } : linha
          )
        }));
        finWrite('fin_matches', 'upsert', {
          id,
          conciliacao_id: match.conciliacaoId,
          extrato_id: match.extratoId,
          lancamento_id: match.lancamentoId,
          modo: match.modo,
        });
        finWrite('fin_extrato_linhas', 'upsert', { id: match.extratoId, pareado: true });
      },

      removeMatch: (matchId) => {
        const match = get().matches.find(m => m.id === matchId);
        if (!match) return;
        set((state) => ({
          matches: state.matches.filter(m => m.id !== matchId),
          extratoLinhas: state.extratoLinhas.map(linha =>
            linha.id === match.extratoId ? { ...linha, pareado: false } : linha
          )
        }));
        finWrite('fin_matches', 'delete', matchId);
        finWrite('fin_extrato_linhas', 'upsert', { id: match.extratoId, pareado: false });
      },

      fecharConciliacao: (conciliacaoId) => {
        set((state) => ({
          conciliacoes: state.conciliacoes.map(c =>
            c.id === conciliacaoId ? { ...c, status: 'FECHADA' } : c
          )
        }));
        finWrite('fin_conciliacoes', 'upsert', { id: conciliacaoId, status: 'FECHADA' });
      },

      getConciliacaoById: (id) => get().conciliacoes.find(c => c.id === id),
      getExtratoByConc: (conciliacaoId) => get().extratoLinhas.filter(e => e.conciliacaoId === conciliacaoId),
      getMatchesByConc: (conciliacaoId) => get().matches.filter(m => m.conciliacaoId === conciliacaoId),

      // legado: o seed mock morreu — a verdade vem do banco
      seedInitialData: () => {},

      clearData: () =>
        set({
          contas: [],
          transferencias: [],
          lancamentos: [],
          conciliacoes: [],
          extratoLinhas: [],
          matches: []
        })
    }),
    {
      name: 'financeiro-store',
      version: 2, // v2: cache do Supabase (dados locais v1 eram seed/mock)
      partialize: (state) => {
        const { financeiroHidratado, ...rest } = state as any;
        return rest;
      },
    }
  )
);

// Setup dos observers de account balances
if (typeof window !== 'undefined') {
  import('@/utils/account-balances-observer').then(({ setupAccountBalancesObserver }) => {
    setupAccountBalancesObserver();
  });
}
