import { create } from 'zustand';

export interface TimelineEntry {
  id: string;
  clienteId: string;
  contratoNumero?: string;
  tituloId?: string;
  canal: 'EMAIL' | 'WHATSAPP' | 'TELEFONE' | 'INTERNO';
  tipo: 'COBRANCA' | 'LEMBRETE' | 'ANOTACAO';
  mensagem: string;
  user: {
    id: string;
    nome: string;
  };
  dataISO: string;
}

interface TimelineState {
  timeline: TimelineEntry[];
  
  // Actions
  addEntry: (entry: Omit<TimelineEntry, 'id'>) => void;
  getTimelineByClient: (clienteId: string) => TimelineEntry[];
  getLastContact: (clienteId: string) => TimelineEntry | undefined;
  exportTimelineCSV: (clienteIds?: string[]) => void;
  clearTimeline: () => void;
}

// Mock user for development
const mockUser = {
  id: 'user-1',
  nome: 'Admin'
};

export const timelineStore = create<TimelineState>((set, get) => ({
  timeline: JSON.parse(localStorage.getItem('timeline_data') || '[]'),

  addEntry: (entry) => {
    const newEntry: TimelineEntry = {
      ...entry,
      id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user: entry.user || mockUser,
      dataISO: entry.dataISO || new Date().toISOString()
    };

    set((state) => {
      const newTimeline = [...state.timeline, newEntry];
      localStorage.setItem('timeline_data', JSON.stringify(newTimeline));
      return { timeline: newTimeline };
    });
  },

  getTimelineByClient: (clienteId) => {
    return get().timeline
      .filter(entry => entry.clienteId === clienteId)
      .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
  },

  getLastContact: (clienteId) => {
    const clientTimeline = get().getTimelineByClient(clienteId);
    return clientTimeline.length > 0 ? clientTimeline[0] : undefined;
  },

  exportTimelineCSV: (clienteIds) => {
    const timeline = get().timeline;
    const filteredTimeline = clienteIds ? 
      timeline.filter(entry => clienteIds.includes(entry.clienteId)) : 
      timeline;

    if (filteredTimeline.length === 0) {
      alert('Nenhum registro de timeline encontrado para exportar.');
      return;
    }

    // Carregar dados dos clientes para o CSV
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const clientesMap = new Map(clientes.map((c: any) => [c.id, c]));

    const csvHeader = 'Cliente,Documento,Contrato,Título,Canal,Tipo,Mensagem/Observação,Usuário,Data/Hora\n';
    const csvData = filteredTimeline
      .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime())
      .map(entry => {
        const cliente = clientesMap.get(entry.clienteId);
        const dataFormatada = new Date(entry.dataISO).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return [
          (cliente as any)?.nomeRazao || 'N/A',
          (cliente as any)?.documento || 'N/A',
          entry.contratoNumero || '',
          entry.tituloId || '',
          entry.canal,
          entry.tipo,
          `"${entry.mensagem.replace(/"/g, '""')}"`, // Escape quotes
          entry.user.nome,
          dataFormatada
        ].join(',');
      })
      .join('\n');

    const csv = csvHeader + csvData;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timeline_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  clearTimeline: () => {
    set({ timeline: [] });
    localStorage.removeItem('timeline_data');
  }
}));

// Template de mensagens padrão
export const MENSAGEM_TEMPLATES = {
  COBRANCA_VENCIDO: "Olá {cliente}, identificamos o vencimento do título {titulo} ref. ao contrato {contrato} no valor de {valor} com vencimento em {vencimento}. Podemos ajudar com a regularização?",
  LEMBRETE_PROXIMO_VENC: "Olá {cliente}, lembramos que o título {titulo} do contrato {contrato} vence em {vencimento}. Qualquer dúvida, estamos à disposição."
};

// Helper para formatar mensagens com placeholders
export const formatMensagem = (template: string, payload: {
  cliente?: string;
  titulo?: string;
  contrato?: string;
  valor?: string;
  vencimento?: string;
}) => {
  let mensagem = template;
  Object.entries(payload).forEach(([key, value]) => {
    if (value) {
      mensagem = mensagem.replace(new RegExp(`{${key}}`, 'g'), value);
    }
  });
  return mensagem;
};