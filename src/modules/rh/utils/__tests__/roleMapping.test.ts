import { describe, it, expect } from 'vitest';
import {
  SELECTABLE_ROLES,
  VALID_APP_ROLES,
  sugerirRolePorCargo,
  isValidAppRole,
} from '../roleMapping';

describe('roleMapping', () => {
  it('todos os chips selecionáveis mapeiam para um valor válido do enum app_role', () => {
    for (const role of SELECTABLE_ROLES) {
      expect(VALID_APP_ROLES).toContain(role.value);
    }
  });

  it('nenhum chip envia valores fora do enum', () => {
    const values = SELECTABLE_ROLES.map((r) => r.value as string);
    // 'user' e 'gerente' NÃO existem no enum — jamais podem aparecer.
    expect(values).not.toContain('user');
    expect(values).not.toContain('gerente');
  });

  it('inclui os perfis operacionais principais + operacao e usuario', () => {
    const values = SELECTABLE_ROLES.map((r) => r.value);
    for (const expected of ['master', 'admin', 'gestor', 'rh', 'financeiro', 'vendedor', 'motorista', 'mecanico', 'operacao', 'usuario'] as const) {
      expect(values).toContain(expected);
    }
  });

  it('mapeia cargo "Gerente" para gestor (enum válido)', () => {
    expect(sugerirRolePorCargo('Gerente')).toBe('gestor');
    expect(sugerirRolePorCargo('gestor')).toBe('gestor');
  });

  it('mapeia cargos operacionais para roles válidos', () => {
    expect(sugerirRolePorCargo('Motorista')).toBe('motorista');
    expect(sugerirRolePorCargo('Vendedor')).toBe('vendedor');
    expect(sugerirRolePorCargo('Mecânico')).toBe('mecanico');
    expect(sugerirRolePorCargo('mecanico')).toBe('mecanico');
    expect(sugerirRolePorCargo('Financeiro')).toBe('financeiro');
  });

  it('retorna null para cargo desconhecido ou vazio', () => {
    expect(sugerirRolePorCargo(undefined)).toBeNull();
    expect(sugerirRolePorCargo('')).toBeNull();
    expect(sugerirRolePorCargo('Cargo Inexistente')).toBeNull();
  });

  it('isValidAppRole valida contra o enum real', () => {
    expect(isValidAppRole('master')).toBe(true);
    expect(isValidAppRole('gestor')).toBe(true);
    expect(isValidAppRole('operacao')).toBe(true);
    expect(isValidAppRole('usuario')).toBe(true);
    // valores que NÃO existem no enum
    expect(isValidAppRole('user')).toBe(false);
    expect(isValidAppRole('gerente')).toBe(false);
  });
});
