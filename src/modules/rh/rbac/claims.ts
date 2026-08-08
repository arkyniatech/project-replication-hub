// Catálogo de Claims/Permissões do Sistema
export type ClaimDomain = 
  | 'equipamentos'
  | 'contratos' 
  | 'logistica'
  | 'financeiro.cr'
  | 'fin'
  | 'estoque'
  | 'rh'
  | 'settings'
  | 'config'
  | 'dashboard'
  | 'relatorios'
  | 'clientes'
  | 'manutencaoOS'
  | 'dre'
  | 'org'
  | 'compras'
  | 'almox';

export type ClaimAction = 
  | 'view'
  | 'edit'
  | 'create'
  | 'view-price'
  | 'renew'
  | 'close'
  | 'operar'
  | 'config'
  | 'ajustar'
  | 'users'
  | 'permissions'
  | 'templates'
  | 'sequencias'
  | 'usuarios'
  | 'pessoas_edit'
  | 'ponto_aprovar'
  | 'multi_loja_report'
  | 'trocar_loja'
  | 'ver'
  | 'liberar'
  | 'cinza'
  | 'fechar'
  | 'reabrir'
  | 'transferir'
  | 'conciliar'
  | 'ver-saldos'
  | 'emitir-bolepix'
  | 'cancelar-bolepix'
  | 'ver-bolepix'
  | 'req:create'
  | 'req:view'
  | 'cot:create'
  | 'cot:edit'
  | 'po:create'
  | 'rec:operar'
  | 'approve'
  | 'patrimonial'
  | 'contagem:processar';

export type Claim = `${ClaimDomain}:${ClaimAction}`;

// Catálogo completo de Claims disponíveis  
export const AVAILABLE_CLAIMS: Record<ClaimDomain, ClaimAction[]> = {
  'equipamentos': ['view', 'edit', 'create', 'view-price'],
  'contratos': ['view', 'create', 'edit', 'renew', 'close'],
  'logistica': ['view', 'operar', 'config'],
  'financeiro.cr': ['view', 'config', 'emitir-bolepix', 'cancelar-bolepix', 'ver-bolepix'],
  'fin': ['transferir', 'conciliar', 'ver-saldos'],
  'estoque': ['ajustar', 'view'],
  'rh': ['users', 'permissions', 'pessoas_edit', 'ponto_aprovar'],
  'settings': ['templates', 'sequencias'],
  'config': ['usuarios'],
  'dashboard': ['view'],
  'relatorios': ['view'],
  'clientes': ['view', 'create', 'edit'],
  'manutencaoOS': ['ver', 'operar', 'liberar', 'cinza', 'config'],
  'dre': ['view', 'fechar', 'reabrir'],
  'org': ['multi_loja_report', 'trocar_loja'],
  'compras': ['view', 'req:create', 'req:view', 'cot:create', 'cot:edit', 'po:create', 'rec:operar', 'approve'],
  'almox': ['view', 'ajustar', 'patrimonial', 'contagem:processar']
};

// Lista flat de todas as claims disponíveis
export const ALL_CLAIMS: Claim[] = Object.entries(AVAILABLE_CLAIMS)
  .flatMap(([domain, actions]) => 
    actions.map(action => `${domain}:${action}` as Claim)
  );
