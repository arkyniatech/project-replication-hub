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

export const getLockInfo = (unidadeId: string, periodo: string): LockFechamento | null => {
  return locksFechamento.find(
    l => l.unidadeId === unidadeId && l.periodo === periodo
  ) || null;
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