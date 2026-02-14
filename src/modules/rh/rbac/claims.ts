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

// Claims por categoria (para organização na UI)
export const CLAIM_CATEGORIES = {
  'Equipamentos': [
    'equipamentos:view',
    'equipamentos:edit',
    'equipamentos:create',
    'equipamentos:view-price',
    'equipamentos:renew',
    'equipamentos:close',
    'equipamentos:operar',
    'equipamentos:config'
  ] as Claim[],
  'Contratos': [
    'contratos:view',
    'contratos:create',
    'contratos:edit',
    'contratos:renew',
    'contratos:close'
  ] as Claim[],
  'Logística': [
    'logistica:view',
    'logistica:operar',
    'logistica:config'
  ] as Claim[],
  'Financeiro CR': [
    'financeiro.cr:view',
    'financeiro.cr:config'
  ] as Claim[],
  'Financeiro': [
    'fin:transferir',
    'fin:conciliar', 
    'fin:ver-saldos'
  ] as Claim[],
  'Estoque': [
    'estoque:view',
    'estoque:ajustar'
  ] as Claim[],
  'RH': [
    'rh:users',
    'rh:permissions'
  ] as Claim[],
  'Manutenção': [
    'manutencaoOS:ver',
    'manutencaoOS:operar',
    'manutencaoOS:liberar',
    'manutencaoOS:cinza',
    'manutencaoOS:config'
  ] as Claim[],
  'DRE': [
    'dre:view',
    'dre:fechar',
    'dre:reabrir'
  ] as Claim[],
  'Compras': [
    'compras:view',
    'compras:req:create',
    'compras:req:view',
    'compras:cot:create',
    'compras:cot:edit',
    'compras:po:create',
    'compras:rec:operar',
    'compras:approve'
  ] as Claim[],
  'Almoxarifado': [
    'almox:view',
    'almox:ajustar',
    'almox:patrimonial',
    'almox:contagem:processar'
  ] as Claim[],
  'Configurações': [
    'settings:templates',
    'settings:sequencias'
  ] as Claim[]
};

// Descrições das claims (para tooltips/documentação) - Partial for now
export const CLAIM_DESCRIPTIONS: Partial<Record<Claim, string>> = {
  // Equipamentos
  'equipamentos:view': 'Visualizar equipamentos e catálogo',
  'equipamentos:edit': 'Criar e editar equipamentos/grupos/modelos',
  'equipamentos:create': 'Criar novos equipamentos',
  'equipamentos:view-price': 'Visualizar preços da tabela',
  
  // Contratos
  'contratos:view': 'Visualizar contratos',
  'contratos:create': 'Criar novos contratos',
  'contratos:edit': 'Editar contratos existentes',
  'contratos:renew': 'Renovar contratos',
  'contratos:close': 'Finalizar/encerrar contratos',
  
  // Logística
  'logistica:view': 'Visualizar logística',
  'logistica:operar': 'Operar tarefas logísticas (motorista)',
  'logistica:config': 'Configurar parâmetros de logística',
  
  // Financeiro CR
  'financeiro.cr:view': 'Visualizar contas a receber',
  'financeiro.cr:config': 'Configurar parâmetros financeiros',
  
  // Estoque
  'estoque:view': 'Visualizar movimentações de estoque',
  'estoque:ajustar': 'Processar ajustes de estoque',
  
  // RH
  'rh:users': 'Gerenciar usuários do sistema',
  'rh:permissions': 'Gerenciar perfis e permissões',
  'rh:pessoas_edit': 'Editar pessoas',
  'rh:ponto_aprovar': 'Aprovar ponto',
  
  // Settings
  'settings:templates': 'Configurar templates de documentos',
  'settings:sequencias': 'Configurar numeração e séries',
  
  // Config
  'config:usuarios': 'Configurar usuários',
  
  // Dashboard
  'dashboard:view': 'Visualizar dashboard',
  
  // Relatórios
  'relatorios:view': 'Visualizar relatórios',
  
  // Clientes
  'clientes:view': 'Visualizar clientes',
  'clientes:create': 'Criar clientes',
  'clientes:edit': 'Editar clientes',
  
  // Org
  'org:multi_loja_report': 'Relatórios multi-loja',
  'org:trocar_loja': 'Trocar loja',
  
  // Compras
  'compras:view': 'Visualizar módulo de compras',
  'compras:req:create': 'Criar requisições de compra',
  'compras:req:view': 'Visualizar requisições',
  'compras:cot:create': 'Criar cotações',
  'compras:cot:edit': 'Editar cotações',
  'compras:po:create': 'Criar pedidos de compra',
  'compras:rec:operar': 'Operar recebimento',
  'compras:approve': 'Aprovar compras',
  
  // Almoxarifado
  'almox:view': 'Visualizar almoxarifado',
  'almox:ajustar': 'Ajustar estoque',
  'almox:patrimonial': 'Controle patrimonial',
  'almox:contagem:processar': 'Processar contagem'
};

// Utilitário para validar claim
export function isValidClaim(claim: string): claim is Claim {
  return ALL_CLAIMS.includes(claim as Claim);
}

// Utilitário para extrair domínio da claim
export function getClaimDomain(claim: Claim): ClaimDomain {
  return claim.split(':')[0] as ClaimDomain;
}

// Utilitário para extrair ação da claim
export function getClaimAction(claim: Claim): ClaimAction {
  return claim.split(':')[1] as ClaimAction;
}