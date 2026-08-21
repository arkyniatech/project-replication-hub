/**
 * Resolve QUAL motorista é o usuário logado.
 *
 * Relay 67/68: o Portal do Motorista não tinha identidade nenhuma — renderizava
 * duas tarefas hardcoded, iguais para qualquer pessoa que abrisse a tela.
 *
 * A cadeia tem três saltos e espelha o usePortal.ts do RH, que já resolve os
 * dois primeiros para o portal do colaborador:
 *
 *   auth.user.id -> user_profiles.pessoa_id -> logistica_motoristas.pessoa_id
 *
 * A loja vem do próprio cadastro do motorista, não do seletor de loja do
 * cabeçalho: `useSupabaseLogisticaTarefas` exige lojaId, e o motorista não
 * escolhe onde trabalha — quem escolhe é quem o cadastrou.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MotoristaLogado {
  id: string;
  nome: string;
  lojaId: string;
}

export function useMotoristaLogado() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['motorista-logado', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MotoristaLogado | null> => {
      const { data: perfil } = await supabase
        .from('user_profiles')
        .select('pessoa_id')
        .eq('id', user!.id)
        .maybeSingle();

      if (!perfil?.pessoa_id) return null;

      // `ativo` filtra motorista desligado: ele não deve ver rota nova, mesmo
      // que o login continue funcionando.
      const { data: motorista } = await supabase
        .from('logistica_motoristas')
        .select('id, nome, loja_id')
        .eq('pessoa_id', perfil.pessoa_id)
        .eq('ativo', true)
        .maybeSingle();

      if (!motorista) return null;

      return {
        id: motorista.id as string,
        nome: motorista.nome as string,
        lojaId: motorista.loja_id as string,
      };
    },
  });

  return {
    motorista: data ?? null,
    // `isLoading` do react-query fica true enquanto a query está desabilitada
    // (sem user). Sem esse ajuste a tela ficaria em "Carregando" para sempre
    // quando não há sessão, em vez de dizer o que houve.
    isLoading: !!user?.id && isLoading,
    error,
  };
}
