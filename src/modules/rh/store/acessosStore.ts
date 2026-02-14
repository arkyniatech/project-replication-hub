import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Claim, ALL_CLAIMS } from '../rbac/claims';

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  perfilIds: string[];
  lojasPermitidas: string[];
  lojaPadrao?: string;
  ativo: boolean;
  criadoEm: string;
  ultimoLogin?: string;
  // Legacy fields for compatibility
  funcionarioId?: string;
  status?: 'ATIVO' | 'SUSPENSO' | 'INATIVO';
  username?: string;
  criadoPor?: string;
  perfis?: string[];
  centrosCusto?: string[];
  exigeTrocaSenha?: boolean;
  twoFA?: boolean;
  convites?: any[];
  sessoes?: any[];
}

export interface Perfil {
  id: string;
  nome: string;
  descricao: string;
  claims: Claim[];
  sistema: boolean; // perfis do sistema não podem ser editados
  // Legacy fields for compatibility
  travado?: boolean;
  permissoes?: string[];
}

interface AcessosState {
  usuarios: Usuario[];
  perfis: Perfil[];
  
  // Ações
  createUser: (userData: Omit<Usuario, 'id' | 'criadoEm'>) => void;
  updateUser: (id: string, userData: Partial<Usuario>) => void;
  deleteUser: (id: string) => void;
  
  createPerfil: (perfilData: Omit<Perfil, 'id'>) => void;
  updatePerfil: (id: string, perfilData: Partial<Perfil>) => void;
  deletePerfil: (id: string) => void;
  
  // Helpers
  getUserById: (id: string) => Usuario | undefined;
  getPerfilById: (id: string) => Perfil | undefined;
  getUserClaims: (userId: string) => Claim[];
  getPerfilAtivo: () => string;
  setPerfilAtivo: (perfilId: string) => void;
  
  // Legacy methods for compatibility
  gerarConvite?: (userId: string) => void;
  suspenderUsuario?: (userId: string) => void;
  revogarUsuario?: (userId: string) => void;
  encerrarSessoes?: (userId: string) => void;
  provisionarUsuario?: (userData: any) => Usuario;
  updateUsuario?: (id: string, data: any) => void;
  criarSolicitacaoAcesso?: (data: any) => void;
  config?: any;
  solicitacoes?: any[];
  loadFromStorage?: () => void;
}

// Perfis padrão do sistema com claims granulares
const PERFIS_SISTEMA: Perfil[] = [
  {
    id: 'vendedor',
    nome: 'Vendedor',
    descricao: 'Acesso básico para vendas e atendimento',
    claims: ['equipamentos:view', 'contratos:create', 'contratos:view', 'clientes:view', 'financeiro.cr:view'],
    sistema: true
  },
  {
    id: 'motorista', 
    nome: 'Motorista',
    descricao: 'Operação logística e entregas',
    claims: ['logistica:operar'],
    sistema: true
  },
  {
    id: 'mecanico',
    nome: 'Mecânico', 
    descricao: 'Manutenção de equipamentos',
    claims: ['equipamentos:view', 'manutencaoOS:ver', 'manutencaoOS:operar'],
    sistema: true
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    descricao: 'Controle financeiro e cobrança',
    claims: [
      'financeiro.cr:view', 'financeiro.cr:config', 
      'fin:transferir', 'fin:conciliar', 'fin:ver-saldos',
      'dre:view', 'dre:fechar',
      'compras:view', 'compras:approve'
    ],
    sistema: true
  },
  {
    id: 'gestor',
    nome: 'Gestor',
    descricao: 'Gestão geral exceto RH/usuários',
    claims: [
      'equipamentos:view', 'equipamentos:edit', 'equipamentos:view-price', 
      'contratos:create', 'contratos:edit', 'contratos:renew', 'contratos:close', 'contratos:view',
      'logistica:operar', 'logistica:config', 
      'financeiro.cr:view', 'financeiro.cr:config',
      'fin:transferir', 'fin:conciliar', 'fin:ver-saldos',
      'estoque:view', 'estoque:ajustar', 
      'manutencaoOS:ver', 'manutencaoOS:operar', 'manutencaoOS:liberar', 'manutencaoOS:cinza', 'manutencaoOS:config',
      'dre:view', 'dre:fechar', 'dre:reabrir',
      'settings:templates', 'settings:sequencias',
      'clientes:view', 'clientes:create', 'clientes:edit',
      'dashboard:view', 'relatorios:view',
      'org:multi_loja_report', 'org:trocar_loja',
      'compras:view', 'compras:req:view', 'compras:cot:create', 'compras:approve',
      'almox:view', 'almox:ajustar'
    ],
    sistema: true
  },
  {
    id: 'admin',
    nome: 'Administrador',
    descricao: 'Acesso total ao sistema',
    claims: ALL_CLAIMS,
    sistema: true
  }
];

export const useAcessosStore = create<AcessosState>()(
  persist(
    (set, get) => ({
      usuarios: [],
      perfis: PERFIS_SISTEMA,

      createUser: (userData) => {
        const newUser: Usuario = {
          ...userData,
          id: crypto.randomUUID(),
          criadoEm: new Date().toISOString(),
        };
        set((state) => ({
          usuarios: [...state.usuarios, newUser],
        }));
      },

      updateUser: (id, userData) => {
        set((state) => ({
          usuarios: state.usuarios.map((user) =>
            user.id === id ? { ...user, ...userData } : user
          ),
        }));
      },

      deleteUser: (id) => {
        set((state) => ({
          usuarios: state.usuarios.filter((user) => user.id !== id),
        }));
      },

      createPerfil: (perfilData) => {
        const newPerfil: Perfil = {
          ...perfilData,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          perfis: [...state.perfis, newPerfil],
        }));
      },

      updatePerfil: (id, perfilData) => {
        set((state) => ({
          perfis: state.perfis.map((perfil) =>
            perfil.id === id && !perfil.sistema ? { ...perfil, ...perfilData } : perfil
          ),
        }));
      },

      deletePerfil: (id) => {
        set((state) => ({
          perfis: state.perfis.filter((perfil) => perfil.id !== id && !perfil.sistema),
        }));
      },

      // Helpers
      getUserById: (id) => get().usuarios.find(u => u.id === id),
      getPerfilById: (id) => get().perfis.find(p => p.id === id),
      getUserClaims: (userId) => {
        const user = get().getUserById(userId);
        if (!user) return [];
        
        const allClaims = new Set<Claim>();
        user.perfilIds.forEach(perfilId => {
          const perfil = get().getPerfilById(perfilId);
          if (perfil) {
            perfil.claims.forEach(claim => allClaims.add(claim));
          }
        });
        
        return Array.from(allClaims);
      },
      getPerfilAtivo: () => {
        return localStorage.getItem('rh-dev-profile') || 'admin';
      },
      setPerfilAtivo: (perfilId) => {
        localStorage.setItem('rh-dev-profile', perfilId);
      },

      // Legacy methods - mock implementations
      gerarConvite: (userId) => console.log('Mock: gerarConvite', userId),
      suspenderUsuario: (userId) => console.log('Mock: suspenderUsuario', userId),
      revogarUsuario: (userId) => console.log('Mock: revogarUsuario', userId),
      encerrarSessoes: (userId) => console.log('Mock: encerrarSessoes', userId),
      provisionarUsuario: (userData) => ({ 
        id: 'mock-' + Date.now(), 
        ...userData,
        criadoEm: new Date().toISOString()
      }),
      updateUsuario: (id, data) => get().updateUser(id, data),
      criarSolicitacaoAcesso: (data) => console.log('Mock: criarSolicitacaoAcesso', data),
      config: {},
      solicitacoes: [],
      loadFromStorage: () => console.log('Mock: loadFromStorage')
    }),
    {
      name: 'acessos-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);