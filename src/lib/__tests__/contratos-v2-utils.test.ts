import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Cliente, Equipamento, Contrato } from '@/types';
import {
  validarBloqueioCliente,
  precoTabela,
  verificarDisponibilidade,
  autoIncrementContrato,
  reservarItens,
  liberarReserva,
  reservaStorage,
  agruparCobrancaCliente,
  calcularEncerramentoSemProrata,
  sugerirHorarios,
  calcularSubtotalItens,
  calcularTotalContrato,
} from '../contratos-v2-utils';


// ------------------ Helpers / Fixtures ------------------

function clienteBase(over: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    lojaId: 'loja-1',
    tipo: 'PF',
    nome: 'João',
    nomeRazao: 'João',
    documento: '123',
    contatos: [],
    endereco: {
      cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', pais: 'BR',
    },
    status: 'ATIVO',
    statusCredito: 'Ativo',
    inadimplente: false,
    anexos: [],
    lgpdAceito: true,
    auditoria: { criadoPor: 'u', criadoEm: '', atualizadoEm: '' },
    email: '',
    telefone: '',
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

function equipBase(over: Partial<Equipamento> = {}): Equipamento {
  return {
    id: 'e1',
    codigo: 'EQ-1',
    nome: 'Eq',
    grupoId: 'g1',
    grupo: { id: 'g1', nome: 'G' },
    unidadeLocacao: 'DIARIA',
    tabela: { DIARIA: 100, SEMANA: 500, QUINZENA: 900, D21: 1200, MES: 1500 },
    status: 'DISPONIVEL',
    controle: 'GRUPO',
    qtdDisponivel: 5,
    checklists: [],
    anexos: [],
    ativo: true,
    situacao: 'Disponível',
    precos: {},
    createdAt: '',
    updatedAt: '',
    ...over,
  } as Equipamento;
}

// ------------------ Suite ------------------

describe('contratos-v2-utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // -------- validarBloqueioCliente --------
  describe('validarBloqueioCliente', () => {
    it('bloqueia cliente SUSPENSO', () => {
      const c = clienteBase({ status: 'SUSPENSO', lojaId: 'loja-9' });
      const r = validarBloqueioCliente(c);
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/SUSPENSO/);
      expect(r.origemLoja).toBe('loja-9');
    });

    it('bloqueia cliente inadimplente com origem e valor', () => {
      const c = clienteBase({
        inadimplente: true,
        inadimplenteOrigem: { lojaId: 'loja-2', valor: 1234.5 },
      });
      const r = validarBloqueioCliente(c);
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/inadimplente/i);
      expect(r.origemLoja).toBe('loja-2');
      expect(r.valor).toBe(1234.5);
    });

    it('retorna ok=true para cliente ativo e adimplente', () => {
      expect(validarBloqueioCliente(clienteBase())).toEqual({ ok: true });
    });
  });

  // -------- precoTabela --------
  describe('precoTabela', () => {
    const eq = equipBase();
    it('retorna o valor da tabela para cada período', () => {
      expect(precoTabela(eq, 'DIARIA')).toBe(100);
      expect(precoTabela(eq, 'SEMANA')).toBe(500);
      expect(precoTabela(eq, 'QUINZENA')).toBe(900);
      expect(precoTabela(eq, '21DIAS')).toBe(1200);
      expect(precoTabela(eq, 'MES')).toBe(1500);
    });

    it('faz fallback para precos quando sem tabela (DIARIA/SEMANA/MES)', () => {
      const e = equipBase({
        tabela: undefined,
        precos: { diaria: 10, semana: 60, mes: 200 },
      });
      expect(precoTabela(e, 'DIARIA')).toBe(10);
      expect(precoTabela(e, 'SEMANA')).toBe(60);
      expect(precoTabela(e, 'MES')).toBe(200);
    });

    it('faz fallback coerente para QUINZENA e 21DIAS (não retorna 0 silencioso)', () => {
      const e = equipBase({
        tabela: undefined,
        precos: { diaria: 10, semana: 60 },
      });
      // QUINZENA = 2 semanas, 21DIAS = 3 semanas
      expect(precoTabela(e, 'QUINZENA')).toBe(120);
      expect(precoTabela(e, '21DIAS')).toBe(180);
    });

    it('fallback de QUINZENA/21DIAS usa diária quando não há semana', () => {
      const e = equipBase({
        tabela: undefined,
        precos: { diaria: 10 },
      });
      expect(precoTabela(e, 'QUINZENA')).toBe(150);
      expect(precoTabela(e, '21DIAS')).toBe(210);
    });
  });

  // -------- verificarDisponibilidade --------
  describe('verificarDisponibilidade', () => {
    it('SERIALIZADO disponível apenas com status DISPONIVEL', () => {
      const e1 = equipBase({ controle: 'SERIALIZADO', status: 'DISPONIVEL' });
      const e2 = equipBase({ controle: 'SERIALIZADO', status: 'LOCADO' });
      expect(verificarDisponibilidade(e1, 1)).toBe(true);
      expect(verificarDisponibilidade(e2, 1)).toBe(false);
    });

    it('GRUPO compara qtdDisponivel - limite exato e abaixo', () => {
      const e = equipBase({ controle: 'GRUPO', qtdDisponivel: 3 });
      expect(verificarDisponibilidade(e, 3)).toBe(true);
      expect(verificarDisponibilidade(e, 4)).toBe(false);
      expect(verificarDisponibilidade(e, 1)).toBe(true);
    });

    it('GRUPO usa quantidade quando qtdDisponivel ausente', () => {
      const e = equipBase({ controle: 'GRUPO', qtdDisponivel: undefined, quantidade: 2 });
      expect(verificarDisponibilidade(e, 2)).toBe(true);
      expect(verificarDisponibilidade(e, 3)).toBe(false);
    });
  });

  // -------- autoIncrementContrato --------
  describe('autoIncrementContrato', () => {
    it('incrementa por loja de forma independente e persiste', () => {
      expect(autoIncrementContrato('loja-1')).toBe(1);
      expect(autoIncrementContrato('loja-1')).toBe(2);
      expect(autoIncrementContrato('loja-2')).toBe(1);

      const raw = localStorage.getItem('locacao_contratos_counter');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed[0]).toEqual({ 'loja-1': 2, 'loja-2': 1 });
    });
  });

  // -------- reservarItens / liberarReserva --------
  describe('reservarItens / liberarReserva', () => {
    it('cria reserva ATIVA com os itens informados', () => {
      const itens = [
        { equipamentoId: 'e1', controle: 'GRUPO' as const, quantidade: 2 },
      ];
      const id = reservarItens({ lojaId: 'loja-1', itens });
      const todas = reservaStorage.getAll();
      expect(todas).toHaveLength(1);
      expect(todas[0].id).toBe(id);
      expect(todas[0].status).toBe('ATIVA');
      expect(todas[0].itens).toEqual(itens);
      expect(todas[0].lojaId).toBe('loja-1');
    });

    it('liberarReserva muda status para CANCELADA', () => {
      const id = reservarItens({
        lojaId: 'loja-1',
        itens: [{ equipamentoId: 'e1', controle: 'GRUPO', quantidade: 1 }],
      });
      liberarReserva(id);
      const r = reservaStorage.getAll().find((x) => x.id === id);
      expect(r?.status).toBe('CANCELADA');
    });
  });

  // -------- agruparCobrancaCliente --------
  describe('agruparCobrancaCliente', () => {
    it('retorna null quando não há títulos abertos', () => {
      localStorage.setItem(
        'erp-titulos',
        JSON.stringify([{ id: 't1', clienteId: 'c1', status: 'QUITADO', valor: 100 }]),
      );
      expect(agruparCobrancaCliente('c1')).toBeNull();
    });

    it('agrupa abertos do cliente somando valorTotal e juntando ids', () => {
      localStorage.setItem(
        'erp-titulos',
        JSON.stringify([
          { id: 't1', clienteId: 'c1', status: 'ABERTO', valor: 100 },
          { id: 't2', clienteId: 'c1', status: 'ABERTO', valor: 50.5 },
          { id: 't3', clienteId: 'c2', status: 'ABERTO', valor: 999 },
          { id: 't4', clienteId: 'c1', status: 'QUITADO', valor: 1 },
        ]),
      );
      const ag = agruparCobrancaCliente('c1');
      expect(ag).not.toBeNull();
      expect(ag!.clienteId).toBe('c1');
      expect(ag!.valorTotal).toBe(150.5);
      expect(ag!.titulosIds as unknown as string[]).toEqual(['t1', 't2']);
    });
  });

  // -------- calcularEncerramentoSemProrata --------
  describe('calcularEncerramentoSemProrata', () => {
    const tabela = { DIARIA: 100, SEMANA: 500, QUINZENA: 900, D21: 1200, MES: 1500 };

    it('múltiplo limpo de 28 dias = 1x MES', () => {
      const r = calcularEncerramentoSemProrata(
        '2025-01-01T00:00:00.000Z',
        '2025-01-29T00:00:00.000Z',
        'MES',
        tabela,
      );
      expect(r.melhorCombinacao).toBe('1x MES');
      expect(r.valorTotal).toBe(1500);
    });

    it('30 dias = 1x MES + 2x DIARIA', () => {
      const r = calcularEncerramentoSemProrata(
        '2025-01-01T00:00:00.000Z',
        '2025-01-31T00:00:00.000Z',
        'MES',
        tabela,
      );
      expect(r.melhorCombinacao).toBe('1x MES + 2x DIARIA');
      expect(r.valorTotal).toBe(1500 + 2 * 100);
    });

    it('KNOWN ISSUE: guloso escolhe por dias, não por custo (14 dias)', () => {
      // 2 x SEMANA (700) é mais barato que 1 x QUINZENA (900), mas o
      // algoritmo guloso atual seleciona por bloco de mais dias primeiro.
      const tab = { DIARIA: 100, SEMANA: 350, QUINZENA: 900, D21: 1200, MES: 1500 };
      const r = calcularEncerramentoSemProrata(
        '2025-01-01T00:00:00.000Z',
        '2025-01-15T00:00:00.000Z',
        'SEMANA',
        tab,
      );
      // KNOWN ISSUE: idealmente seria '2x SEMANA' = 700, mas hoje:
      expect(r.melhorCombinacao).toBe('1x QUINZENA');
      expect(r.valorTotal).toBe(900);
    });
  });

  // -------- sugerirHorarios --------
  describe('sugerirHorarios', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // 30 jun 2026, 07:00 local — antes de qualquer horário da manhã.
      vi.setSystemTime(new Date('2026-06-30T07:00:00'));
      vi.spyOn(Math, 'random').mockReturnValue(0);
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('escolhe o primeiro horário disponível da MANHA quando determinístico', () => {
      // dataEntrega = hoje, primeira opção de manhã = 08:30
      const h = sugerirHorarios('MANHA', '2026-06-30');
      expect(h).toBe('08:30');
    });

    it('quando não há horário de manhã restante hoje, sugere primeiro da TARDE', () => {
      vi.setSystemTime(new Date('2026-06-30T11:30:00')); // +30min margem > 11:00
      const h = sugerirHorarios('MANHA', '2026-06-30');
      expect(h).toBe('13:30');
    });
  });
});
