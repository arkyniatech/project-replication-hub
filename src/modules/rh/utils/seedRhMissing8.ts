import { format, subDays, addDays, subMonths } from 'date-fns';
import type { 
  PontoMarcacao, 
  AjustePonto, 
  BancoHorasMov, 
  Ausencia, 
  Holerite, 
  Vaga, 
  Candidato,
  ASO,
  Treinamento,
  ParticipacaoTreinamento
} from '../types';

// Utility functions
const randDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const currency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatHours = (hours: number) => {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  const sign = hours < 0 ? '-' : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Seed data generators
export function seedRhMissing8() {
  const now = new Date();
  const twoMonthsAgo = subMonths(now, 2);
  const oneMonthAgo = subMonths(now, 1);
  
  // Sample pessoas IDs (should match existing data)
  const pessoaIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
  const lojaIds = ['loja1', 'loja2', 'loja3'];
  const ccIds = ['cc1', 'cc2', 'cc3', 'cc4'];

  // Ponto Marcações (last 2-3 months)
  const pontoMarcacoes: PontoMarcacao[] = [];
  for (let i = 0; i < 90; i++) {
    const date = subDays(now, i);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends
    
    pessoaIds.forEach(pessoaId => {
      const horaIn = `0${7 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
      const horaOut = `1${7 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
      
      pontoMarcacoes.push({
        id: `ponto-${pessoaId}-${format(date, 'yyyy-MM-dd')}`,
        pessoaId,
        dataISO: format(date, 'yyyy-MM-dd'),
        horaIn,
        horaOut,
        origem: Math.random() > 0.9 ? 'manual' : 'app'
      });
    });
  }

  // Ajustes de Ponto
  const ajustesPonto: AjustePonto[] = [];
  const statusOptions: Array<'pendente' | 'aprovado' | 'recusado'> = ['pendente', 'aprovado', 'recusado'];
  const motivos = ['Esqueci de bater ponto', 'Erro no sistema', 'Trabalho externo', 'Reunião fora da empresa'];
  
  for (let i = 0; i < 25; i++) {
    const pessoaId = pessoaIds[Math.floor(Math.random() * pessoaIds.length)];
    const dataISO = format(randDate(twoMonthsAgo, now), 'yyyy-MM-dd');
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    const horas = (Math.random() - 0.5) * 4; // -2 to +2 hours
    
    ajustesPonto.push({
      id: `ajuste-${i + 1}`,
      pessoaId,
      dataISO,
      horas: Math.round(horas * 100) / 100,
      motivo: motivos[Math.floor(Math.random() * motivos.length)],
      observacao: 'Ajuste de ponto solicitado',
      status,
      criadoEm: format(randDate(new Date(dataISO), now), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      criadoPor: 'user-mock',
      ...(status !== 'pendente' && {
        decididoEm: format(randDate(new Date(dataISO), now), 'yyyy-MM-dd\'T\'HH:mm:ss')
      })
    });
  }

  // Banco de Horas Movimentos
  const bancoHorasMovs: BancoHorasMov[] = [];
  pessoaIds.forEach((pessoaId, index) => {
    // Initial balance
    bancoHorasMovs.push({
      id: `bh-inicial-${pessoaId}`,
      pessoaId,
      dataISO: format(twoMonthsAgo, 'yyyy-MM-dd'),
      tipo: 'CREDITO',
      horas: Math.random() * 10,
      motivo: 'Saldo inicial',
      ref: 'Saldo inicial'
    });

    // Random movements
    for (let i = 0; i < 5 + index; i++) {
      bancoHorasMovs.push({
        id: `bh-${pessoaId}-${i + 1}`,
        pessoaId,
        dataISO: format(randDate(twoMonthsAgo, now), 'yyyy-MM-dd'),
        tipo: Math.random() > 0.6 ? 'CREDITO' : 'DEBITO',
        horas: Math.random() * 3 + 0.5,
        motivo: Math.random() > 0.7 ? `Ajuste aprovado` : 'Compensação manual',
        ref: Math.random() > 0.7 ? `Ajuste aprovado` : 'Compensação manual'
      });
    }
  });

  // Ausências
  const ausencias: Ausencia[] = [];
  const tiposAusencia: Array<'Atestado' | 'Falta' | 'Licenca'> = ['Atestado', 'Falta', 'Licenca'];
  const statusAusencia: Array<'ABERTA' | 'APROVADA' | 'RECUSADA'> = ['ABERTA', 'APROVADA', 'RECUSADA'];
  
  for (let i = 0; i < 25; i++) {
    const pessoaId = pessoaIds[Math.floor(Math.random() * pessoaIds.length)];
    const dataInicio = randDate(twoMonthsAgo, addDays(now, 30));
    const dataFim = addDays(dataInicio, Math.floor(Math.random() * 5) + 1);
    
    ausencias.push({
      id: `ausencia-${i + 1}`,
      pessoaId,
      tipo: tiposAusencia[Math.floor(Math.random() * tiposAusencia.length)],
      dataInicioISO: format(dataInicio, 'yyyy-MM-dd'),
      dataFimISO: format(dataFim, 'yyyy-MM-dd'),
      obs: Math.random() > 0.5 ? 'Observações da ausência' : undefined,
      status: statusAusencia[Math.floor(Math.random() * statusAusencia.length)],
      anexoMock: Math.random() > 0.7 ? {
        nome: 'atestado.pdf',
        tamanho: Math.floor(Math.random() * 500) + 100,
        ts: new Date().toISOString()
      } : undefined,
      criadoEm: format(randDate(dataInicio, now), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      criadoPor: 'user-mock'
    });
  }

  // Holerites (last 3 months)
  const holerites: Holerite[] = [];
  const competencias = [
    format(twoMonthsAgo, 'yyyy-MM'),
    format(oneMonthAgo, 'yyyy-MM'),
    format(now, 'yyyy-MM')
  ];
  
  pessoaIds.forEach(pessoaId => {
    competencias.forEach(comp => {
        holerites.push({
        id: `holerite-${pessoaId}-${comp}`,
        pessoaId,
        comp: comp,
        lojaId: lojaIds[Math.floor(Math.random() * lojaIds.length)],
        ccId: ccIds[Math.floor(Math.random() * ccIds.length)],
        status: 'publicado',
        lido: Math.random() > 0.3,
        salarioBase: 2500 + Math.floor(Math.random() * 2000),
        totalProventos: 3000 + Math.floor(Math.random() * 1500),
        totalDescontos: 500 + Math.floor(Math.random() * 300),
        salarioLiquido: 2200 + Math.floor(Math.random() * 1800),
        publicadoEmISO: format(randDate(new Date(comp + '-01'), now), 'yyyy-MM-dd\'T\'HH:mm:ss'),
        publicadoPor: 'admin',
        loteId: `lote-${comp}`
      });
    });
  });

  // Vagas (8 vagas)
  const vagas: Vaga[] = [];
  const titulosVaga = [
    'Operador de Máquinas', 'Assistente Administrativo', 'Motorista',
    'Mecânico', 'Vendedor', 'Analista Financeiro', 'Auxiliar de Logística', 'Supervisor'
  ];
  const statusVaga: Array<'aberta' | 'selecao' | 'aprovada' | 'encerrada'> = ['aberta', 'selecao', 'aprovada', 'encerrada'];
  
  titulosVaga.forEach((titulo, index) => {
    vagas.push({
      id: `vaga-${index + 1}`,
      titulo,
      cargo: titulo, // Use titulo as cargo
      descricao: `Vaga para ${titulo}`,
      lojaId: lojaIds[index % lojaIds.length],
      ccId: ccIds[index % ccIds.length],
      tipoContratacao: 'CLT',
      salario: 2500 + Math.floor(Math.random() * 3000),
      status: statusVaga[Math.floor(Math.random() * statusVaga.length)],
      criadoEm: format(randDate(twoMonthsAgo, now), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      criadoPor: 'user-mock'
    });
  });

  // Candidatos (40 candidatos)
  const candidatos: Candidato[] = [];
  const nomesCandidatos = [
    'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Ferreira',
    'Lucia Almeida', 'Roberto Lima', 'Fernanda Rocha', 'Marcos Souza', 'Patricia Dias'
  ];
  const etapasCandidato: Array<'triagem' | 'entrevista' | 'teste' | 'aprovado' | 'reprovado'> = ['triagem', 'entrevista', 'teste', 'aprovado', 'reprovado'];
  const fontesCandidato: Array<'site' | 'indicacao' | 'redes'> = ['site', 'indicacao', 'redes'];
  
  for (let i = 0; i < 40; i++) {
    candidatos.push({
      id: `candidato-${i + 1}`,
      nome: `${nomesCandidatos[Math.floor(Math.random() * nomesCandidatos.length)]} ${i + 1}`,
      email: `candidato${i + 1}@email.com`,
      telefone: `(11) 99999-${(1000 + i).toString()}`,
      vagaId: vagas[Math.floor(Math.random() * vagas.length)].id,
      etapa: etapasCandidato[Math.floor(Math.random() * etapasCandidato.length)],
      historicoEtapas: [], // Empty for now
      score: Math.floor(Math.random() * 100),
      criadoEm: format(randDate(twoMonthsAgo, now), 'yyyy-MM-dd\'T\'HH:mm:ss')
    });
  }

  // ASO (Exames)
  const asos: ASO[] = [];
  const tiposASO: Array<'ADMISSIONAL' | 'PERIODICO' | 'DEMISSIONAL'> = 
    ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'];
  
  pessoaIds.forEach((pessoaId, index) => {
    // Each person has 1-3 ASO records
    for (let i = 0; i < 1 + (index % 3); i++) {
      const realizadoISO = format(randDate(twoMonthsAgo, now), 'yyyy-MM-dd');
      const validade = addDays(new Date(realizadoISO), 365); // 1 year validity
      const validadeISO = format(validade, 'yyyy-MM-dd');
      
      let status: 'PENDENTE' | 'REALIZADO' | 'VENCIDO' = 'REALIZADO';
      if (validade < now) status = 'VENCIDO';
      else if (validade < addDays(now, 30)) status = 'REALIZADO'; // Consider as needing renewal soon
      
      asos.push({
        id: `aso-${pessoaId}-${i + 1}`,
        colaboradorId: pessoaId, // Use colaboradorId instead of pessoaId
        tipo: tiposASO[Math.floor(Math.random() * tiposASO.length)],
        dataRealizacao: realizadoISO,
        dataVencimento: validadeISO,
        status
      });
    }
  });

  // Treinamentos (NRs)
  const treinamentos: Treinamento[] = [
    { id: 'tr-nr11', codigo: 'NR-11', nome: 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais', validadeMeses: 12 },
    { id: 'tr-nr12', codigo: 'NR-12', nome: 'Segurança no Trabalho em Máquinas e Equipamentos', validadeMeses: 12 },
    { id: 'tr-nr18', codigo: 'NR-18', nome: 'Condições e Meio Ambiente de Trabalho na Indústria da Construção', validadeMeses: 24 },
    { id: 'tr-nr35', codigo: 'NR-35', nome: 'Trabalho em Altura', validadeMeses: 24 }
  ];

  // Participações em Treinamento
  const participacoesTreinamento: ParticipacaoTreinamento[] = [];
  pessoaIds.forEach((pessoaId, personIndex) => {
    treinamentos.forEach((treinamento, treinIndex) => {
      // Not everyone has every training
      if (Math.random() > 0.7) return;
      
      const realizado = randDate(twoMonthsAgo, now);
      const vencimento = addDays(realizado, treinamento.validadeMeses * 30);
      
      participacoesTreinamento.push({
        id: `pt-${pessoaId}-${treinamento.id}`,
        pessoaId,
        treinamentoId: treinamento.id,
        realizadoISO: format(realizado, 'yyyy-MM-dd'),
        vencimentoISO: format(vencimento, 'yyyy-MM-dd'),
        status: vencimento < now ? 'vencido' : 'realizado'
      });
    });
  });

  return {
    pontoMarcacoes,
    ajustesPonto,
    bancoHorasMovs,
    ausencias,
    holerites,
    vagas,
    candidatos,
    asos,
    treinamentos,
    participacoesTreinamento
  };
}

// Report builders
export function buildRsFunnel(vagas: Vaga[], candidatos: Candidato[]) {
  const totalCandidatos = candidatos.length;
  const entrevistas = candidatos.filter(c => ['entrevista', 'teste', 'aprovado'].includes(c.etapa)).length;
  const propostas = candidatos.filter(c => ['teste', 'aprovado'].includes(c.etapa)).length;
  const admitidos = candidatos.filter(c => c.etapa === 'aprovado').length;
  
  return {
    candidatos: totalCandidatos,
    entrevistas,
    propostas,
    admitidos,
    taxaConversao: totalCandidatos > 0 ? Math.round((admitidos / totalCandidatos) * 100) : 0
  };
}

export function buildJornadaKPIs(pontoMarcacoes: PontoMarcacao[], ajustesPonto: AjustePonto[]) {
  const ajustesPendentes = ajustesPonto.filter(a => a.status === 'pendente').length;
  const ajustesAprovados = ajustesPonto.filter(a => a.status === 'aprovado').length;
  const horasExtras = ajustesPonto
    .filter(a => a.status === 'aprovado' && a.horas > 0)
    .reduce((sum, a) => sum + a.horas, 0);
  
  const diasTrabalhados = pontoMarcacoes.length;
  const diasPrevistos = Math.floor(diasTrabalhados * 1.1); // Mock calculation
  const percentualPresenca = diasPrevistos > 0 ? Math.round((diasTrabalhados / diasPrevistos) * 100) : 100;
  
  return {
    ajustesPendentes,
    ajustesAprovados,
    horasExtras: Math.round(horasExtras * 100) / 100,
    percentualPresenca: percentualPresenca.toString()
  };
}

export function buildComplianceStats(asos: any[], participacoesTreinamento: ParticipacaoTreinamento[], treinamentos: Treinamento[]) {
  const now = new Date();
  const in30Days = addDays(now, 30);
  
  const asoVencidos = asos.filter((a: any) => a.status === 'vencido').length;
  const asoVencendo = asos.filter((a: any) => {
    const validade = new Date(a.dataVencimento);
    return validade >= now && validade <= in30Days;
  }).length;
  const asoOk = asos.filter((a: any) => a.status === 'realizado' && new Date(a.dataVencimento) > in30Days).length;
  
  const treinamentosVencidos = participacoesTreinamento.filter(pt => pt.status === 'vencido').length;
  const treinamentosVencendo = participacoesTreinamento.filter(pt => {
    const venc = new Date(pt.vencimentoISO);
    return venc >= now && venc <= in30Days && pt.status === 'realizado';
  }).length;
  const treinamentosOk = participacoesTreinamento.filter(pt => pt.status === 'realizado' && new Date(pt.vencimentoISO) > in30Days).length;
  
  return {
    aso: { vencidos: asoVencidos, vencendo: asoVencendo, ok: asoOk },
    treinamentos: { vencidos: treinamentosVencidos, vencendo: treinamentosVencendo, ok: treinamentosOk }
  };
}

export function buildRhFinance(pessoas: any[], beneficios: any[] = [], elegibilidades: any[] = []) {
  // Mock salary data by role
  const salariosPorCargo = {
    'Operador': 2500,
    'Assistente': 2000,
    'Motorista': 2200,
    'Mecânico': 3000,
    'Vendedor': 2800,
    'Analista': 4000,
    'Supervisor': 5000,
    'Gerente': 7000
  };
  
  const custoTotal = pessoas.length * 3500; // Mock average
  const custoMedio = pessoas.length > 0 ? custoTotal / pessoas.length : 0;
  const custoBeneficios = custoTotal * 0.3; // 30% benefits
  const percentualBeneficios = '30';
  
  return {
    custoTotal,
    custoMedio: Math.round(custoMedio),
    custoBeneficios: Math.round(custoBeneficios),
    percentualBeneficios,
    salariosPorCargo
  };
}

// Storage helpers
export function saveRhStateMissing(data: any) {
  localStorage.setItem('rh_demo_missing8', JSON.stringify(data));
}

export function loadRhStateMissing() {
  try {
    const stored = localStorage.getItem('rh_demo_missing8');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Utility exports
export { formatHours, currency };