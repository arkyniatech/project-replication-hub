import { formatCurrency } from '@/lib/utils';

// DRE-specific types for monthly closing
export interface VersionMeta {
  versao: string;
  criadoEmISO: string;
  autor: string;
  observacao?: string;
}

export interface SnapshotDRE {
  id: string;
  competencia: string; // YYYY-MM
  lojas: string[];
  versaoMeta: string;
  totals: {
    totalReal: number;
    totalMeta: number;
    deltaTotal: number;
    deltaPercentualTotal: number;
  };
  porCategoria: Array<{
    codigo: string;
    descricao: string;
    real: number;
    meta: number;
    delta: number;
    deltaPct: number;
    semaforo: 'green' | 'yellow' | 'red';
  }>;
  criadoEmISO: string;
}

export interface FechamentoDRE {
  id: string;
  competencia: string; // YYYY-MM
  lojas: string[];
  status: 'ABERTO' | 'FECHADO';
  fechadoPor?: string;
  fechadoEmISO?: string;
  versaoMeta?: string;
  snapshotId?: string;
}

export interface AuditoriaFechamento {
  id: string;
  competencia: string;
  acao: 'FECHAMENTO' | 'REABERTURA';
  motivo?: string;
  usuario: string;
  dataHoraISO: string;
}

// Storage helpers
export const getFechamentosDRE = (): FechamentoDRE[] => {
  return JSON.parse(localStorage.getItem('fechamentosDRE') || '[]');
};

export const saveFechamentosDRE = (fechamentos: FechamentoDRE[]) => {
  localStorage.setItem('fechamentosDRE', JSON.stringify(fechamentos));
};

export const getSnapshotsDRE = (): SnapshotDRE[] => {
  return JSON.parse(localStorage.getItem('snapshotsDRE') || '[]');
};

export const saveSnapshotsDRE = (snapshots: SnapshotDRE[]) => {
  localStorage.setItem('snapshotsDRE', JSON.stringify(snapshots));
};

export const getVersionsMeta = (): VersionMeta[] => {
  const versions = JSON.parse(localStorage.getItem('versionsMeta') || '[]');
  if (versions.length === 0) {
    // Create default version if none exists
    const defaultVersion: VersionMeta = {
      versao: 'v1',
      criadoEmISO: new Date().toISOString(),
      autor: 'Sistema',
      observacao: 'Versão inicial'
    };
    versions.push(defaultVersion);
    saveVersionsMeta(versions);
  }
  return versions;
};

export const saveVersionsMeta = (versions: VersionMeta[]) => {
  localStorage.setItem('versionsMeta', JSON.stringify(versions));
};

export const getAuditoriaFechamento = (): AuditoriaFechamento[] => {
  return JSON.parse(localStorage.getItem('auditoriaFechamento') || '[]');
};

export const saveAuditoriaFechamento = (auditorias: AuditoriaFechamento[]) => {
  localStorage.setItem('auditoriaFechamento', JSON.stringify(auditorias));
};

// Business logic helpers
export const isDREFechado = (competencia: string, lojas: string[]): boolean => {
  const fechamentos = getFechamentosDRE();
  return fechamentos.some(f => 
    f.competencia === competencia && 
    f.status === 'FECHADO' && 
    lojas.every(loja => f.lojas.includes(loja))
  );
};

export const getFechamentoInfo = (competencia: string, lojas: string[]): FechamentoDRE | null => {
  const fechamentos = getFechamentosDRE();
  return fechamentos.find(f => 
    f.competencia === competencia && 
    lojas.every(loja => f.lojas.includes(loja))
  ) || null;
};

export const getSnapshotForPeriod = (competencia: string, lojas: string[]): SnapshotDRE | null => {
  const snapshots = getSnapshotsDRE();
  return snapshots.find(s => 
    s.competencia === competencia && 
    lojas.every(loja => s.lojas.includes(loja))
  ) || null;
};

export const createSnapshot = (
  competencia: string,
  lojas: string[],
  versaoMeta: string,
  mockExpensesData: any[]
): SnapshotDRE => {
  const totalReal = mockExpensesData.reduce((sum, item) => sum + item.real, 0);
  const totalMeta = mockExpensesData.reduce((sum, item) => sum + item.meta, 0);
  const deltaTotal = totalReal - totalMeta;
  const deltaPercentualTotal = totalMeta > 0 ? (deltaTotal / totalMeta) * 100 : 0;

  const porCategoria = mockExpensesData.map(item => {
    const delta = item.real - item.meta;
    const deltaPct = item.meta > 0 ? (delta / item.meta) * 100 : 0;
    
    let semaforo: 'green' | 'yellow' | 'red' = 'green';
    if (item.real > item.meta * 1.1) {
      semaforo = 'red';
    } else if (item.real > item.meta) {
      semaforo = 'yellow';
    }

    return {
      codigo: item.codigo,
      descricao: item.descricao,
      real: item.real,
      meta: item.meta,
      delta,
      deltaPct,
      semaforo
    };
  });

  return {
    id: `snapshot_${Date.now()}`,
    competencia,
    lojas: [...lojas],
    versaoMeta,
    totals: {
      totalReal,
      totalMeta,
      deltaTotal,
      deltaPercentualTotal
    },
    porCategoria,
    criadoEmISO: new Date().toISOString()
  };
};

export const fecharCompetenciaDRE = (
  competencia: string,
  lojas: string[],
  versaoMeta: string,
  usuario: string,
  mockExpensesData: any[]
): { fechamento: FechamentoDRE; snapshot: SnapshotDRE } => {
  // Create snapshot
  const snapshot = createSnapshot(competencia, lojas, versaoMeta, mockExpensesData);
  
  // Create fechamento record
  const fechamento: FechamentoDRE = {
    id: `fechamento_${Date.now()}`,
    competencia,
    lojas: [...lojas],
    status: 'FECHADO',
    fechadoPor: usuario,
    fechadoEmISO: new Date().toISOString(),
    versaoMeta,
    snapshotId: snapshot.id
  };

  // Save to storage
  const fechamentos = getFechamentosDRE();
  const existingIndex = fechamentos.findIndex(f => 
    f.competencia === competencia && 
    JSON.stringify(f.lojas.sort()) === JSON.stringify(lojas.sort())
  );
  
  if (existingIndex >= 0) {
    fechamentos[existingIndex] = fechamento;
  } else {
    fechamentos.push(fechamento);
  }
  saveFechamentosDRE(fechamentos);

  const snapshots = getSnapshotsDRE();
  const existingSnapshotIndex = snapshots.findIndex(s => 
    s.competencia === competencia && 
    JSON.stringify(s.lojas.sort()) === JSON.stringify(lojas.sort())
  );
  
  if (existingSnapshotIndex >= 0) {
    snapshots[existingSnapshotIndex] = snapshot;
  } else {
    snapshots.push(snapshot);
  }
  saveSnapshotsDRE(snapshots);

  // Log audit
  const auditorias = getAuditoriaFechamento();
  auditorias.push({
    id: `audit_${Date.now()}`,
    competencia,
    acao: 'FECHAMENTO',
    usuario,
    dataHoraISO: new Date().toISOString()
  });
  saveAuditoriaFechamento(auditorias);

  return { fechamento, snapshot };
};

export const reabrirCompetenciaDRE = (
  competencia: string,
  lojas: string[],
  motivo: string,
  usuario: string
): void => {
  const fechamentos = getFechamentosDRE();
  const fechamentoIndex = fechamentos.findIndex(f => 
    f.competencia === competencia && 
    JSON.stringify(f.lojas.sort()) === JSON.stringify(lojas.sort())
  );

  if (fechamentoIndex >= 0) {
    fechamentos[fechamentoIndex] = {
      ...fechamentos[fechamentoIndex],
      status: 'ABERTO'
    };
    saveFechamentosDRE(fechamentos);

    // Log audit (snapshot is preserved)
    const auditorias = getAuditoriaFechamento();
    auditorias.push({
      id: `audit_${Date.now()}`,
      competencia,
      acao: 'REABERTURA',
      motivo,
      usuario,
      dataHoraISO: new Date().toISOString()
    });
    saveAuditoriaFechamento(auditorias);
  }
};

export const exportDREData = (
  snapshot: SnapshotDRE | null,
  mockExpensesData: any[],
  showMeta: boolean
): string => {
  const data = snapshot ? snapshot.porCategoria : mockExpensesData.map(item => ({
    codigo: item.codigo,
    descricao: item.descricao,
    real: item.real,
    meta: item.meta,
    delta: item.real - item.meta,
    deltaPct: item.meta > 0 ? ((item.real - item.meta) / item.meta) * 100 : 0
  }));

  let csv = 'Código;Descrição;Real';
  if (showMeta) {
    csv += ';Meta;Δ;Δ%';
  }
  csv += '\n';

  data.forEach(item => {
    csv += `${item.codigo};${item.descricao};${formatCurrency(item.real)}`;
    if (showMeta) {
      csv += `;${formatCurrency(item.meta)};${formatCurrency(item.delta)};${item.deltaPct.toFixed(1)}%`;
    }
    csv += '\n';
  });

  // Add sealed footer if snapshot exists
  if (snapshot) {
    csv += '\n;;;;;;\n';
    csv += `;FECHADO em ${new Date(snapshot.criadoEmISO).toLocaleDateString('pt-BR')} — Versão ${snapshot.versaoMeta};;;;;\n`;
  }

  return csv;
};

export const formatPeriodoDisplay = (competencia: string): string => {
  const [year, month] = competencia.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};