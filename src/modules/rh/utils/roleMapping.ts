import { Constants } from '@/integrations/supabase/types';
import type { AppRole } from '../hooks/useSupabaseUserRoles';

/**
 * Valores válidos do enum `app_role` no banco (fonte de verdade: Supabase types).
 * Enum atual: vendedor, motorista, mecanico, financeiro, gestor, admin, rh, master.
 */
export const VALID_APP_ROLES = Constants.public.Enums.app_role as readonly AppRole[];

export interface SelectableRole {
  value: AppRole;
  label: string;
  color: string;
  masterOnly?: boolean;
}

/**
 * Perfis selecionáveis no modal "Criar Usuário".
 * TODOS os valores DEVEM existir em `VALID_APP_ROLES` — caso contrário o
 * insert em `user_roles` falha com "invalid input value for enum app_role".
 *
 * Perfis solicitados pelo cliente que NÃO existem no enum atual e ficam de fora
 * até haver migration: "Operação" (operacao) e "Usuário" (usuario).
 */
export const SELECTABLE_ROLES: SelectableRole[] = [
  { value: 'master', label: 'Master', color: 'bg-black', masterOnly: true },
  { value: 'admin', label: 'Admin', color: 'bg-red-500' },
  { value: 'gestor', label: 'Gerente', color: 'bg-purple-500' },
  { value: 'rh', label: 'RH', color: 'bg-blue-500' },
  { value: 'financeiro', label: 'Financeiro', color: 'bg-green-500' },
  { value: 'vendedor', label: 'Vendedor', color: 'bg-yellow-500' },
  { value: 'motorista', label: 'Motorista', color: 'bg-indigo-500' },
  { value: 'mecanico', label: 'Mecânico', color: 'bg-gray-500' },
];

/**
 * Mapeamento cargo (texto livre da pessoa) → role do enum.
 * Chaves normalizadas em lowercase, sem acento não é necessário pois
 * comparamos com `cargo.toLowerCase()` — mas incluímos as duas grafias.
 */
const CARGO_TO_ROLE: Record<string, AppRole> = {
  motorista: 'motorista',
  vendedor: 'vendedor',
  mecânico: 'mecanico',
  mecanico: 'mecanico',
  gerente: 'gestor',
  gestor: 'gestor',
  financeiro: 'financeiro',
  rh: 'rh',
  admin: 'admin',
};

export function sugerirRolePorCargo(cargo?: string | null): AppRole | null {
  if (!cargo) return null;
  const key = cargo.toLowerCase().trim();
  return CARGO_TO_ROLE[key] ?? null;
}

export function isValidAppRole(value: string): value is AppRole {
  return (VALID_APP_ROLES as readonly string[]).includes(value);
}
