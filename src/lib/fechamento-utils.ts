import { LockFechamento } from '@/types';

// Helper functions for month locking
export const locksFechamento: LockFechamento[] = JSON.parse(
  localStorage.getItem('locksFechamento') || '[]'
);

export const saveLocksFechamento = (locks: LockFechamento[]) => {
  localStorage.setItem('locksFechamento', JSON.stringify(locks));
};

export const isFechado = (unidadeId: string, dataISO: string): boolean => {
  const periodo = dataISO.substring(0, 7); // "YYYY-MM"
  const lock = locksFechamento.find(
    l => l.unidadeId === unidadeId && l.periodo === periodo && l.fechado
  );
  return !!lock;
};

export const canAlterarNoPeriodo = (unidadeId: string, dataISO: string): boolean => {
  return !isFechado(unidadeId, dataISO);
};

export const getLockInfo = (unidadeId: string, periodo: string): LockFechamento | null => {
  return locksFechamento.find(
    l => l.unidadeId === unidadeId && l.periodo === periodo
  ) || null;
};

export const fecharMes = (
  periodo: string,
  unidadeIds: string[],
  usuario: { id: string; nome: string },
  checklist: {
    extratosConciliados: boolean;
    parcelasQuitadas: boolean;
    transferenciasConferidas: boolean;
    dreRevisado: boolean;
  }
): void => {
  const updatedLocks = [...locksFechamento];
  
  unidadeIds.forEach(unidadeId => {
    const existingIndex = updatedLocks.findIndex(
      l => l.unidadeId === unidadeId && l.periodo === periodo
    );
    
    const lock: LockFechamento = {
      periodo,
      unidadeId,
      fechado: true,
      ts: Date.now(),
      usuario,
      checklist
    };
    
    if (existingIndex >= 0) {
      updatedLocks[existingIndex] = lock;
    } else {
      updatedLocks.push(lock);
    }
  });
  
  saveLocksFechamento(updatedLocks);
  
  // Audit log
  const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
  auditLogs.push({
    ts: Date.now(),
    tipo: 'FECHAMENTO_MES_CRIADO',
    usuario: usuario.nome,
    payload: { periodo, unidades: unidadeIds, checklistSnapshot: checklist }
  });
  localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
};

export const reabrirMes = (
  periodo: string,
  unidadeIds: string[],
  usuario: { id: string; nome: string },
  motivo: string
): void => {
  const updatedLocks = [...locksFechamento];
  
  unidadeIds.forEach(unidadeId => {
    const existingIndex = updatedLocks.findIndex(
      l => l.unidadeId === unidadeId && l.periodo === periodo
    );
    
    if (existingIndex >= 0) {
      updatedLocks[existingIndex] = {
        ...updatedLocks[existingIndex],
        fechado: false,
        ts: Date.now(),
        usuario,
        motivo
      };
    }
  });
  
  saveLocksFechamento(updatedLocks);
  
  // Audit log
  const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
  auditLogs.push({
    ts: Date.now(),
    tipo: 'FECHAMENTO_MES_REABERTO',
    usuario: usuario.nome,
    payload: { periodo, unidades: unidadeIds, motivo }
  });
  localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
};

export const logBloqueioAcao = (
  acao: string,
  entidade: string,
  id: string,
  periodo: string,
  unidadeId: string,
  usuario: string
): void => {
  const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
  auditLogs.push({
    ts: Date.now(),
    tipo: 'BLOQUEIO_ACAO_PERIODO_FECHADO',
    usuario,
    payload: { acao, entidade, id, periodo, unidadeId }
  });
  localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
};

export const formatPeriodo = (periodo: string): string => {
  const [year, month] = periodo.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

export const getPeriodoFromDate = (date: Date): string => {
  return date.toISOString().substring(0, 7);
};

export const getUltimos6Meses = (): string[] => {
  const meses = [];
  const hoje = new Date();
  
  for (let i = 0; i < 6; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(getPeriodoFromDate(data));
  }
  
  return meses;
};