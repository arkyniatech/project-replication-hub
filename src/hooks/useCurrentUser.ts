import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { resolverUsuarioParaTimeline, type ResultadoUsuarioTimeline } from '@/lib/usuario-timeline';

/**
 * Usuário autenticado pronto para ser gravado em auditoria (ex.: timeline de
 * contato/cobrança). Mesma prioridade de nome de `useCurrentUserName`
 * (pessoas.nome > email > —), mas aqui SEM fallback final: enquanto sessão
 * ou perfil estiverem carregando, ou faltar id/nome real, devolve
 * `pronto: false` em vez de inventar um nome.
 */
export function useCurrentUser(): ResultadoUsuarioTimeline {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useSupabaseAuth();

  const pessoaNome = (profile as any)?.pessoas?.nome;
  const nome = pessoaNome || (user?.email ? user.email.split('@')[0] : null);

  // `profileLoading` (isLoading do react-query) pode ler `false` por um render
  // entre o id do usuário ficar disponível e a query do perfil (enabled a
  // partir desse id) começar a buscar de fato — nesse intervalo `profile`
  // ainda é `undefined`. Tratar isso como "ainda carregando" evita gravar o
  // nome derivado do e-mail nesse instante, quando pessoas.nome está prestes
  // a chegar.
  const perfilAindaResolvendo = !!user?.id && profile === undefined;

  return resolverUsuarioParaTimeline({
    authLoading,
    profileLoading: profileLoading || perfilAindaResolvendo,
    userId: user?.id ?? null,
    nome,
  });
}
