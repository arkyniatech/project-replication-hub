import { describe, it, expect } from 'vitest';
import { resolverUsuarioParaTimeline } from '@/lib/usuario-timeline';

/**
 * RELAY 35 — item 6.7
 *
 * RegistrarContatoModal e EnviarAvisoModal gravavam
 * `user: { id: 'user-1', nome: 'Admin' }` fixo no addEntry do timelineStore —
 * toda entrada de histórico aparecia como feita por "Admin", não importa quem
 * de fato executou a ação.
 *
 * resolverUsuarioParaTimeline é a decisão pura: dado o estado de autenticação
 * (ainda carregando? tem id? tem nome?), decide se há usuário pronto para
 * gravar. Nunca inventa um nome — se faltar dado real, devolve `pronto: false`
 * e quem chama não grava nada (ao invés de gravar outro fallback disfarçado).
 */

describe('resolverUsuarioParaTimeline', () => {
  it('devolve pronto:false enquanto a sessão de auth está carregando', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: true,
      profileLoading: false,
      userId: null,
      nome: null,
    });

    expect(r.pronto).toBe(false);
  });

  it('devolve pronto:false enquanto o perfil (nome) está carregando', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: false,
      profileLoading: true,
      userId: 'auth-user-123',
      nome: null,
    });

    expect(r.pronto).toBe(false);
  });

  it('devolve pronto:false quando terminou de carregar mas não há id', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: false,
      profileLoading: false,
      userId: null,
      nome: 'Alguém',
    });

    expect(r.pronto).toBe(false);
  });

  it('devolve pronto:true com id e nome reais quando tudo carregou', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: false,
      profileLoading: false,
      userId: 'auth-user-123',
      nome: 'Financeiro Teste',
    });

    expect(r).toEqual({ pronto: true, user: { id: 'auth-user-123', nome: 'Financeiro Teste' } });
  });

  it('usa o email como nome quando pessoas.nome não veio, mas não inventa um nome fixo', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: false,
      profileLoading: false,
      userId: 'auth-user-123',
      nome: 'financeiro', // já resolvido pelo hook a partir do email, não é fallback fixo
    });

    expect(r).toEqual({ pronto: true, user: { id: 'auth-user-123', nome: 'financeiro' } });
  });

  it('devolve pronto:false quando userId é string vazia', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: false,
      profileLoading: false,
      userId: '',
      nome: 'Alguém',
    });

    expect(r.pronto).toBe(false);
  });

  it('devolve pronto:false quando nome é string vazia', () => {
    const r = resolverUsuarioParaTimeline({
      authLoading: false,
      profileLoading: false,
      userId: 'auth-user-123',
      nome: '',
    });

    expect(r.pronto).toBe(false);
  });

  it('nunca devolve "Admin" como nome', () => {
    const casos = [
      { authLoading: true, profileLoading: false, userId: null, nome: null },
      { authLoading: false, profileLoading: true, userId: 'x', nome: null },
      { authLoading: false, profileLoading: false, userId: 'x', nome: 'Qualquer Um' },
    ];

    for (const c of casos) {
      const r = resolverUsuarioParaTimeline(c);
      if (r.pronto) {
        expect(r.user.nome).not.toBe('Admin');
      }
    }
  });
});
