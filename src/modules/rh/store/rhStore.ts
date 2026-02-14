import { create } from 'zustand';
import { RhState, Pessoa, Vaga, Candidato, LogEvento } from '../types';

const STORAGE_KEY = 'rh_demo_state';

interface RhStore extends RhState {
  // Actions
  addPessoa: (pessoa: Pessoa) => void;
  updatePessoa: (id: string, updates: Partial<Pessoa>) => void;
  removePessoa: (id: string) => void;
  
  addVaga: (vaga: Vaga) => void;
  updateVaga: (id: string, updates: Partial<Vaga>) => void;
  
  addCandidato: (candidato: Candidato) => void;
  updateCandidato: (id: string, updates: Partial<Candidato>) => void;
  
  addLog: (log: LogEvento) => void;
  
  // Holerites
  marcarHoleriteLido: (id: string) => void;
  
  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  resetData: () => void;
}

const initialState: RhState = {
  pessoas: [],
  vagas: [],
  candidatos: [],
  admissoes: [],
  ajustesPonto: [],
  bancoHoras: [],
  ferias: [],
  ausencias: [],
  holerites: [],
  lotesHolerite: [],
  examesASO: [],
  treinamentosNR: [],
  aprovacoes: [],
  logs: [],
  // New content booster data
  beneficios: [],
  elegibilidades: [],
  vinculosBeneficio: [],
  treinamentos: [],
  participacoesTreinamento: [],
  checklistTemplates: [],
  desligamentos: [],
  // Missing screens data
  checklistInstancias: [],
  pontoMarcacoes: [],
  bancoHorasMovs: [],
};

export const useRhStore = create<RhStore>((set, get) => ({
  ...initialState,

  addPessoa: (pessoa) => {
    set((state) => ({ pessoas: [...state.pessoas, pessoa] }));
    get().saveToStorage();
  },

  updatePessoa: (id, updates) => {
    set((state) => ({
      pessoas: state.pessoas.map((p) => 
        p.id === id ? { ...p, ...updates } : p
      )
    }));
    get().saveToStorage();
  },

  removePessoa: (id) => {
    set((state) => ({
      pessoas: state.pessoas.map((p) => 
        p.id === id ? { ...p, situacao: 'inativo' as const } : p
      )
    }));
    get().saveToStorage();
  },

  addVaga: (vaga) => {
    set((state) => ({ vagas: [...state.vagas, vaga] }));
    get().saveToStorage();
  },

  updateVaga: (id, updates) => {
    set((state) => ({
      vagas: state.vagas.map((v) => 
        v.id === id ? { ...v, ...updates } : v
      )
    }));
    get().saveToStorage();
  },

  addCandidato: (candidato) => {
    set((state) => ({ candidatos: [...state.candidatos, candidato] }));
    get().saveToStorage();
  },

  updateCandidato: (id, updates) => {
    set((state) => ({
      candidatos: state.candidatos.map((c) => 
        c.id === id ? { ...c, ...updates } : c
      )
    }));
    get().saveToStorage();
  },

  addLog: (log) => {
    set((state) => ({ logs: [...state.logs, log] }));
    get().saveToStorage();
  },

  marcarHoleriteLido: (id) => {
    set((state) => ({
      holerites: state.holerites.map(h => 
        h.id === id ? { ...h, lido: true } : h
      )
    }));
    get().saveToStorage();
  },

  saveToStorage: () => {
    const state = get();
    const dataToSave = {
      pessoas: state.pessoas,
      vagas: state.vagas,
      candidatos: state.candidatos,
      admissoes: state.admissoes,
      ajustesPonto: state.ajustesPonto,
      bancoHoras: state.bancoHoras,
      ferias: state.ferias,
      ausencias: state.ausencias,
      holerites: state.holerites,
      lotesHolerite: state.lotesHolerite,
      examesASO: state.examesASO,
      treinamentosNR: state.treinamentosNR,
      aprovacoes: state.aprovacoes,
      logs: state.logs,
      // New content booster data
      beneficios: state.beneficios,
      elegibilidades: state.elegibilidades,
      vinculosBeneficio: state.vinculosBeneficio,
      treinamentos: state.treinamentos,
      participacoesTreinamento: state.participacoesTreinamento,
      checklistTemplates: state.checklistTemplates,
      checklistInstancias: state.checklistInstancias,
      desligamentos: state.desligamentos,
      pontoMarcacoes: state.pontoMarcacoes || [],
      bancoHorasMovs: state.bancoHorasMovs || [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({ ...initialState, ...data });
      }
    } catch (error) {
      console.error('Error loading RH data from storage:', error);
    }
  },

  resetData: () => {
    set(initialState);
    localStorage.removeItem(STORAGE_KEY);
  },
}));

// Helper functions
export const saveRhState = () => {
  useRhStore.getState().saveToStorage();
};

export const loadRhState = () => {
  useRhStore.getState().loadFromStorage();
};