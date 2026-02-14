import { Usuario, Perfil } from '../types';

// Catálogo oficial de permissões do sistema (domínio:ação)
export const RBAC_CATALOG = [
  // Gerais
  'dashboard:view',
  'relatorios:view',

  // Cadastros & Contratos
  'clientes:view', 'clientes:create', 'clientes:edit',
  'equipamentos:view', 'equipamentos:edit', 'equipamentos:maint',
  'contratos:view', 'contratos:create', 'contratos:edit', 'contratos:renew', 'contratos:devolver', 'contratos:substituir', 'contratos:pdf_send',

  // Logística
  'logistica:view', 'logistica:schedule', 'logistica:reschedule', 'logistica:nao_entrega', 'logistica:checkin',

  // Financeiro (CR/CP/Caixa)
  'cr:view', 'cr:emitir_doc', 'cr:registrar_receb', 'cr:quitar', 'cr:reemitir', 'cr:agrupar_fatura', 'cr:aging_view', 'cr:notificar',
  'cp:view', 'cp:lancar', 'cp:aprovar', 'cp:pagar',
  'caixa:abrir', 'caixa:fechar', 'caixa:lancar',

  // RH / SSMA / Benefícios
  'rh:pessoas_view', 'rh:pessoas_edit', 'rh:ferias_aprovar', 'rh:ponto_aprovar', 'rh:holerite_publicar', 'rh:acessos_gerir',
  'ssma:view', 'ssma:edit',
  'beneficios:view', 'beneficios:edit',

  // Configurações
  'config:view', 'config:financeiro', 'config:usuarios', 'config:perfis', 'config:integracoes', 'config:numeracao',

  // Multiunidade
  'org:trocar_loja', 'org:multi_loja_report'
] as const;

export type Permission = typeof RBAC_CATALOG[number];

// Mapa de permissões para UI
export const PERMISSIONS_MAP: Record<Permission, string> = {
  // Gerais
  'dashboard:view': 'Visualizar dashboard',
  'relatorios:view': 'Visualizar relatórios',

  // Cadastros & Contratos
  'clientes:view': 'Visualizar clientes',
  'clientes:create': 'Criar clientes',
  'clientes:edit': 'Editar clientes',
  'equipamentos:view': 'Visualizar equipamentos',
  'equipamentos:edit': 'Editar equipamentos e preços',
  'equipamentos:maint': 'Gerenciar manutenção',
  'contratos:view': 'Visualizar contratos',
  'contratos:create': 'Criar contratos',
  'contratos:edit': 'Editar contratos',
  'contratos:renew': 'Renovar contratos',
  'contratos:devolver': 'Processar devoluções',
  'contratos:substituir': 'Substituir equipamentos',
  'contratos:pdf_send': 'Enviar documentos',

  // Logística
  'logistica:view': 'Visualizar logística',
  'logistica:schedule': 'Agendar entregas',
  'logistica:reschedule': 'Reagendar entregas',
  'logistica:nao_entrega': 'Marcar não entrega',
  'logistica:checkin': 'Check-in entregas',

  // Financeiro
  'cr:view': 'Visualizar contas a receber',
  'cr:emitir_doc': 'Emitir faturas',
  'cr:registrar_receb': 'Registrar recebimentos',
  'cr:quitar': 'Quitar títulos',
  'cr:reemitir': 'Reemitir documentos',
  'cr:agrupar_fatura': 'Agrupar em fatura',
  'cr:aging_view': 'Visualizar inadimplência',
  'cr:notificar': 'Enviar cobranças',
  'cp:view': 'Visualizar contas a pagar',
  'cp:lancar': 'Lançar títulos a pagar',
  'cp:aprovar': 'Aprovar pagamentos',
  'cp:pagar': 'Efetuar pagamentos',
  'caixa:abrir': 'Abrir caixa',
  'caixa:fechar': 'Fechar caixa',
  'caixa:lancar': 'Lançar no caixa',

  // RH / SSMA / Benefícios
  'rh:pessoas_view': 'Visualizar colaboradores',
  'rh:pessoas_edit': 'Editar colaboradores',
  'rh:ferias_aprovar': 'Aprovar férias',
  'rh:ponto_aprovar': 'Aprovar ajustes de ponto',
  'rh:holerite_publicar': 'Publicar holerites',
  'rh:acessos_gerir': 'Gerenciar acessos',
  'ssma:view': 'Visualizar SSMA',
  'ssma:edit': 'Editar SSMA',
  'beneficios:view': 'Visualizar benefícios',
  'beneficios:edit': 'Editar benefícios',

  // Configurações
  'config:view': 'Visualizar configurações',
  'config:financeiro': 'Config. financeiras',
  'config:usuarios': 'Gerenciar usuários',
  'config:perfis': 'Gerenciar perfis',
  'config:integracoes': 'Config. integrações',
  'config:numeracao': 'Config. numeração',

  // Multiunidade
  'org:trocar_loja': 'Trocar de loja',
  'org:multi_loja_report': 'Relatórios multi-loja'
};

export const DOMAINS = {
  'clientes': 'Clientes',
  'equipamentos': 'Equipamentos', 
  'contratos': 'Contratos',
  'cr': 'Contas a Receber',
  'cp': 'Contas a Pagar',
  'inadimplencia': 'Inadimplência',
  'logistica': 'Logística',
  'manutencao': 'Manutenção',
  'rh': 'Recursos Humanos',
  'config': 'Configurações'
} as const;

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasPerm(usuario: Usuario | null, perfis: Perfil[], permission: string): boolean {
  if (!usuario || usuario.status !== 'ativo') {
    return false;
  }

  // Admin tem tudo
  if (usuario.perfis.includes('admin')) {
    return true;
  }

  // Buscar permissões de todos os perfis do usuário
  const todasPermissoes = usuario.perfis.flatMap(perfilId => {
    const perfil = perfis.find(p => p.id === perfilId);
    return perfil?.permissoes || [];
  });

  // Verificar se tem permissão exata ou wildcard
  return todasPermissoes.includes(permission) || 
         todasPermissoes.includes('*') ||
         todasPermissoes.some(p => {
           // Verificar permissões de CRUD que englobam outras
           const [domain] = permission.split(':');
           return p === `${domain}:crud`;
         });
}

/**
 * Hook para verificar permissões
 */
export function usePermissions(usuario: Usuario | null, perfis: Perfil[]) {
  const can = (permission: string) => hasPerm(usuario, perfis, permission);

  const canAny = (permissions: string[]) => 
    permissions.some(p => can(p));

  const canAll = (permissions: string[]) => 
    permissions.every(p => can(p));

  return { can, canAny, canAll };
}

/**
 * Agrupa permissões por domínio para UI
 */
export function groupPermissionsByDomain(permissions: string[]) {
  const grouped: Record<string, string[]> = {};

  permissions.forEach(perm => {
    if (perm === '*') {
      grouped['*'] = ['*'];
      return;
    }

    const [domain, action] = perm.split(':');
    if (!grouped[domain]) {
      grouped[domain] = [];
    }
    grouped[domain].push(action);
  });

  return grouped;
}

/**
 * Sugestões de perfis por cargo
 */
export function sugerirPerfisPorCargo(cargo: string): string[] {
  const cargoLower = cargo.toLowerCase();
  
  if (cargoLower.includes('gerente') || cargoLower.includes('gestor')) {
    return ['gerente'];
  }
  
  if (cargoLower.includes('vendedor') || cargoLower.includes('comercial')) {
    return ['vendedor'];
  }
  
  if (cargoLower.includes('motorista')) {
    return ['motorista'];
  }
  
  if (cargoLower.includes('operador') || cargoLower.includes('operação')) {
    return ['operacao'];
  }
  
  if (cargoLower.includes('financeiro') || cargoLower.includes('contas')) {
    return ['financeiro'];
  }
  
  if (cargoLower.includes('rh') || cargoLower.includes('recursos humanos')) {
    return ['rh'];
  }
  
  return ['vendedor']; // padrão
}