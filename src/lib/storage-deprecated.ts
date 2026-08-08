/**
 * @deprecated Este arquivo contém funções de localStorage para dados de negócio.
 * 
 * ⚠️ ESTAS FUNÇÕES ESTÃO EM PROCESSO DE MIGRAÇÃO PARA SUPABASE
 * 
 * Por favor, utilize os hooks do Supabase ao invés destas funções:
 * - useSupabaseClientes ao invés de clienteStorage
 * - useSupabaseEquipamentos ao invés de equipamentoStorage
 * - useSupabaseContratos ao invés de contratoStorage
 * - useSupabaseObras ao invés de obraStorage
 * - useSupabaseTitulos ao invés de tituloStorage
 * - useSupabaseRecebimentos ao invés de recebimentoStorage
 * - useSupabaseFaturas ao invés de faturaStorage
 * - useSupabaseTemplates ao invés de templateStorage
 * - useSupabaseConfigOrganizacao/Financeiro/etc ao invés de getAppConfig
 * 
 * Este arquivo será removido em versões futuras quando a migração estiver completa.
 */

import { Cliente, Equipamento, Contrato, Titulo, CaixaDoDia, AppConfig } from '@/types';

const STORAGE_KEYS = {
  CLIENTES: 'erp-clientes',
  EQUIPAMENTOS: 'erp-equipamentos',
  CONTRATOS: 'erp-contratos',
  TITULOS: 'erp-titulos',
  CAIXAS: 'erp-caixas',
  CONFIG: 'erp-config',
} as const;

// Funções genéricas para localStorage
function getStorageData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar dados do localStorage:', error);
    return [];
  }
}

function setStorageData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar dados no localStorage:', error);
  }
}

// ==================== DEPRECATED STORAGE FUNCTIONS ====================

/**
 * @deprecated Use useSupabaseClientes hook instead
 */
export const clienteStorage = {
  getAll: () => getStorageData<Cliente>(STORAGE_KEYS.CLIENTES),
  save: (clientes: Cliente[]) => setStorageData(STORAGE_KEYS.CLIENTES, clientes),
  add: (cliente: Cliente) => {
    const clientes = clienteStorage.getAll();
    clientes.push(cliente);
    clienteStorage.save(clientes);
  },
  update: (id: string, updates: Partial<Cliente>) => {
    const clientes = clienteStorage.getAll();
    const index = clientes.findIndex(c => c.id === id);
    if (index !== -1) {
      clientes[index] = { ...clientes[index], ...updates, updatedAt: new Date().toISOString() };
      clienteStorage.save(clientes);
    }
  },
  delete: (id: string) => {
    const clientes = clienteStorage.getAll().filter(c => c.id !== id);
    clienteStorage.save(clientes);
  },
  getById: (id: string) => clienteStorage.getAll().find(c => c.id === id),
};

/**
 * @deprecated Use useSupabaseEquipamentos hook instead
 */
export const equipamentoStorage = {
  getAll: () => getStorageData<Equipamento>(STORAGE_KEYS.EQUIPAMENTOS),
  save: (equipamentos: Equipamento[]) => setStorageData(STORAGE_KEYS.EQUIPAMENTOS, equipamentos),
  add: (equipamento: Equipamento) => {
    const equipamentos = equipamentoStorage.getAll();
    equipamentos.push(equipamento);
    equipamentoStorage.save(equipamentos);
  },
  update: (id: string, updates: Partial<Equipamento>) => {
    const equipamentos = equipamentoStorage.getAll();
    const index = equipamentos.findIndex(e => e.id === id);
    if (index !== -1) {
      equipamentos[index] = { ...equipamentos[index], ...updates, updatedAt: new Date().toISOString() };
      equipamentoStorage.save(equipamentos);
    }
  },
  delete: (id: string) => {
    const equipamentos = equipamentoStorage.getAll().filter(e => e.id !== id);
    equipamentoStorage.save(equipamentos);
  },
  getById: (id: string) => equipamentoStorage.getAll().find(e => e.id === id),
  getByStatus: (status: string) => equipamentoStorage.getAll().filter(e => e.status === status),
};

/**
 * @deprecated Use useSupabaseContratos hook instead
 */
export const contratoStorage = {
  getAll: () => getStorageData<Contrato>(STORAGE_KEYS.CONTRATOS),
  save: (contratos: Contrato[]) => setStorageData(STORAGE_KEYS.CONTRATOS, contratos),
  add: (contrato: Contrato) => {
    const contratos = contratoStorage.getAll();
    contratos.push(contrato);
    contratoStorage.save(contratos);
  },
  update: (id: string, updates: Partial<Contrato>) => {
    const contratos = contratoStorage.getAll();
    const index = contratos.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
      contratos[index] = { ...contratos[index], ...updates, updatedAt: new Date().toISOString() };
      contratoStorage.save(contratos);
    }
  },
  getById: (id: string) => contratoStorage.getAll().find(c => String(c.id) === String(id)),
};

/**
 * @deprecated Use useSupabaseTitulos hook instead
 */
export const tituloStorage = {
  getAll: () => getStorageData<Titulo>(STORAGE_KEYS.TITULOS),
  save: (titulos: Titulo[]) => setStorageData(STORAGE_KEYS.TITULOS, titulos),
  add: (titulo: Titulo) => {
    const titulos = tituloStorage.getAll();
    titulos.push(titulo);
    tituloStorage.save(titulos);
  },
  update: (id: string, updates: Partial<Titulo>) => {
    const titulos = tituloStorage.getAll();
    const index = titulos.findIndex(t => t.id === id);
    if (index !== -1) {
      titulos[index] = { ...titulos[index], ...updates, updatedAt: new Date().toISOString() };
      tituloStorage.save(titulos);
    }
  },
  getById: (id: string) => tituloStorage.getAll().find(t => t.id === id),
  getByStatus: (status: string) => tituloStorage.getAll().filter(t => t.status === status),
  getVencidos: () => {
    const hoje = new Date();
    return tituloStorage.getAll().filter(t => {
      const vencimento = new Date(t.vencimento);
      return vencimento < hoje && (t.status === 'Em aberto' || t.status === 'Parcial');
    });
  }
};

/**
 * @deprecated Use useSupabaseCaixa hook instead
 */
export const caixaStorage = {
  getAll: () => getStorageData<CaixaDoDia>(STORAGE_KEYS.CAIXAS),
  save: (caixas: CaixaDoDia[]) => setStorageData(STORAGE_KEYS.CAIXAS, caixas),
  add: (caixa: CaixaDoDia) => {
    const caixas = caixaStorage.getAll();
    caixas.push(caixa);
    caixaStorage.save(caixas);
  },
  update: (id: string, updates: Partial<CaixaDoDia>) => {
    const caixas = caixaStorage.getAll();
    const index = caixas.findIndex(c => c.id === id);
    if (index !== -1) {
      caixas[index] = { ...caixas[index], ...updates };
      caixaStorage.save(caixas);
    }
  },
  getById: (id: string) => caixaStorage.getAll().find(c => c.id === id),
  getCaixaAbertaUsuario: (usuarioId: string, dataISO: string) => {
    return caixaStorage.getAll().find(c => 
      c.usuarioId === usuarioId && 
      c.dataISO === dataISO && 
      c.status === 'Aberto'
    );
  },
  getCaixaUsuarioData: (usuarioId: string, dataISO: string) => {
    return caixaStorage.getAll().find(c => 
      c.usuarioId === usuarioId && 
      c.dataISO === dataISO
    );
  }
};

// ==================== DEPRECATED CONFIG ====================

const createDefaultPermissions = () => ({
  clientes: { ver: false, criar: false, editar: false, excluir: false },
  equipamentos: { ver: false, criar: false, editar: false, excluir: false },
  contratos: { ver: false, criar: false, editar: false, excluir: false, renovar: false, devolverSubstituir: false },
  financeiro: { ver: false, criar: false, editar: false, excluir: false, emitirFatura: false, receberPagamento: false },
  inadimplencia: { ver: false, criar: false, editar: false, excluir: false, enviarMensagens: false },
  manutencaoOS: { ver: false, criar: false, editar: false, excluir: false },
  logistica: { ver: false, criar: false, editar: false, excluir: false },
  caixa: { ver: false, gerirCaixa: false },
  configuracoes: { gerirConfiguracoes: false }
});

const DEFAULT_CONFIG: AppConfig = {
  organizacao: {
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    ie: "",
    isentoIE: false,
    emailFiscal: "",
    telefone: "",
    endereco: {
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      pais: "Brasil"
    },
    cores: {
      primaria: "#F97316",
      secundaria: "#111827"
    }
  },
  seguranca: {
    politicaSenha: "PADRAO",
    doisFatores: false,
    sessaoMinutos: 30,
    exigirAceiteLGPD: true
  },
  usuarios: [
    {
      id: "1",
      nome: "Admin Sistema",
      email: "admin@sistema.com",
      perfilId: "admin",
      status: "Ativo",
      ultimoAcesso: new Date().toISOString(),
      lojasPermitidas: ["1", "2"],
      lojaPadraoId: "1"
    }
  ],
  perfis: {
    admin: {
      id: "admin",
      nome: "Administrador",
      bloqueado: true,
      permissoes: {
        ...createDefaultPermissions(),
        clientes: { ver: true, criar: true, editar: true, excluir: true },
        equipamentos: { ver: true, criar: true, editar: true, excluir: true },
        contratos: { ver: true, criar: true, editar: true, excluir: true, renovar: true, devolverSubstituir: true },
        financeiro: { ver: true, criar: true, editar: true, excluir: true, emitirFatura: true, receberPagamento: true },
        inadimplencia: { ver: true, criar: true, editar: true, excluir: true, enviarMensagens: true },
        manutencaoOS: { ver: true, criar: true, editar: true, excluir: true },
        logistica: { ver: true, criar: true, editar: true, excluir: true },
        caixa: { ver: true, gerirCaixa: true },
        configuracoes: { gerirConfiguracoes: true }
      }
    },
    financeiro: {
      id: "financeiro",
      nome: "Financeiro",
      bloqueado: true,
      permissoes: {
        ...createDefaultPermissions(),
        clientes: { ver: true, criar: false, editar: false, excluir: false },
        contratos: { ver: true, criar: false, editar: false, excluir: false, renovar: false, devolverSubstituir: false },
        financeiro: { ver: true, criar: true, editar: true, excluir: false, emitirFatura: true, receberPagamento: true },
        inadimplencia: { ver: true, criar: true, editar: true, excluir: false, enviarMensagens: true },
        caixa: { ver: true, gerirCaixa: true }
      }
    },
    comercial: {
      id: "comercial",
      nome: "Comercial",
      bloqueado: true,
      permissoes: {
        ...createDefaultPermissions(),
        clientes: { ver: true, criar: true, editar: true, excluir: false },
        contratos: { ver: true, criar: true, editar: true, excluir: false, renovar: true, devolverSubstituir: false },
        financeiro: { ver: true, criar: false, editar: false, excluir: false, emitirFatura: false, receberPagamento: false },
        inadimplencia: { ver: true, criar: false, editar: false, excluir: false, enviarMensagens: true }
      }
    },
    operacional: {
      id: "operacional",
      nome: "Operacional",
      bloqueado: true,
      permissoes: {
        ...createDefaultPermissions(),
        clientes: { ver: true, criar: false, editar: false, excluir: false },
        equipamentos: { ver: true, criar: false, editar: true, excluir: false },
        contratos: { ver: true, criar: false, editar: false, excluir: false, renovar: false, devolverSubstituir: true },
        manutencaoOS: { ver: true, criar: true, editar: true, excluir: false },
        logistica: { ver: true, criar: true, editar: true, excluir: false }
      }
    }
  },
  lojas: [
    {
      id: "1",
      nome: "Loja São Paulo",
      apelido: "SP",
      cnpj: "12.345.678/0001-90",
      endereco: {
        cep: "01310-100",
        logradouro: "Av. Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP"
      },
      ativo: true
    },
    {
      id: "2",
      nome: "Loja Rio de Janeiro",
      apelido: "RJ",
      cnpj: "12.345.678/0002-71",
      endereco: {
        cep: "20040-020",
        logradouro: "Av. Rio Branco",
        numero: "156",
        bairro: "Centro",
        cidade: "Rio de Janeiro",
        uf: "RJ"
      },
      ativo: true
    }
  ],
  logsAuditoria: []
};

/**
 * @deprecated Use useSupabaseConfigOrganizacao, useSupabaseConfigFinanceiro, etc instead
 */
export function getAppConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (stored) {
      const config = JSON.parse(stored);
      return {
        organizacao: { ...DEFAULT_CONFIG.organizacao, ...config.organizacao },
        seguranca: { ...DEFAULT_CONFIG.seguranca, ...config.seguranca },
        usuarios: config.usuarios || DEFAULT_CONFIG.usuarios,
        perfis: config.perfis || DEFAULT_CONFIG.perfis,
        lojas: config.lojas || DEFAULT_CONFIG.lojas,
        logsAuditoria: config.logsAuditoria || DEFAULT_CONFIG.logsAuditoria
      };
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * @deprecated Use useSupabaseConfigOrganizacao, useSupabaseConfigFinanceiro, etc instead
 */
export function setAppConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
}
