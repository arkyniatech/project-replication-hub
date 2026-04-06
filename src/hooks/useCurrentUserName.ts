import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

/**
 * Retorna o nome de exibição do usuário autenticado.
 * Prioridade: nome da pessoa vinculada > email > 'Usuário'
 */
export function useCurrentUserName(): string {
  const { user } = useAuth();
  const { profile } = useSupabaseAuth();

  const pessoaNome = (profile as any)?.pessoas?.nome;
  if (pessoaNome) return pessoaNome;

  if (user?.email) return user.email.split('@')[0];

  return 'Usuário';
}

/**
 * Versão não-hook para uso fora de componentes React.
 * Busca do Supabase Auth diretamente.
 */
export async function getCurrentUserName(): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Usuário';

  // Try to get pessoa name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('pessoas(nome)')
    .eq('id', user.id)
    .single();

  const pessoaNome = (profile as any)?.pessoas?.nome;
  if (pessoaNome) return pessoaNome;

  return user.email?.split('@')[0] || 'Usuário';
}
