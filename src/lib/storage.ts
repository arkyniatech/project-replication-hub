/**
 * ⚠️ ATENÇÃO: Este arquivo está em processo de depreciação
 * 
 * A maioria das funções foi movida para `storage-deprecated.ts`
 * 
 * Funções de negócio (clientes, contratos, equipamentos, etc) devem usar hooks do Supabase.
 * Este arquivo mantém apenas funções genéricas de storage e preferências de UI.
 * 
 * ========================================================================
 * 
 * ❌ NÃO USE MAIS:
 * - clienteStorage -> USE: useSupabaseClientes
 * - equipamentoStorage -> USE: useSupabaseEquipamentos  
 * - contratoStorage -> USE: useSupabaseContratos
 * - obraStorage -> USE: useSupabaseObras
 * - tituloStorage -> USE: useSupabaseTitulos
 * - recebimentoStorage -> USE: useSupabaseRecebimentos
 * - faturaStorage -> USE: useSupabaseFaturas
 * - templateStorage -> USE: useSupabaseTemplates
 * - getAppConfig/setAppConfig -> USE: useSupabaseConfig*
 * 
 * ✅ PODE USAR:
 * - getStorageData / setStorageData (para preferências de UI apenas)
 * 
 * ========================================================================
 */

// Re-export das funções deprecated para não quebrar código existente
// Estas exportações serão removidas em versões futuras
export {
  obraStorage,
  clienteStorage,
  grupoStorage,
  equipamentoStorage,
  contratoStorage,
  faturaStorage,
  tituloStorage,
  recebimentoStorage,
  templateStorage,
  avisoStorage,
  contatoCobrancaStorage,
  caixaStorage,
  getAppConfig,
  setAppConfig
} from './storage-deprecated';

// ==================== FUNÇÕES GENÉRICAS (OK para usar) ====================

/**
 * Função genérica para carregar dados do localStorage
 * @param key - Chave do localStorage
 * @returns Array de dados tipados
 */
export function getStorageData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar dados do localStorage:', error);
    return [];
  }
}

/**
 * Função genérica para salvar dados no localStorage
 * @param key - Chave do localStorage
 * @param data - Array de dados a serem salvos
 */
export function setStorageData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar dados no localStorage:', error);
  }
}

/**
 * Chaves do localStorage (para referência)
 */
export const STORAGE_KEYS = {
  CLIENTES: 'erp-clientes',
  EQUIPAMENTOS: 'erp-equipamentos',
  CONTRATOS: 'erp-contratos',
  FATURAS: 'erp-faturas',
  GRUPOS: 'erp-grupos-equipamentos',
  TITULOS: 'erp-titulos',
  RECEBIMENTOS: 'erp-recebimentos',
  TEMPLATES: 'erp-templates',
  AVISOS: 'erp-avisos',
  CONTATOS_COBRANCA: 'erp-contatos-cobranca',
  CAIXAS: 'erp-caixas',
  CONFIG: 'erp-config',
  OBRAS: 'erp-obras',
} as const;
