import { 
  Pessoa, Vaga, Candidato, Admissao, AjustePonto, BancoHoras, 
  Ferias, Ausencia, Holerite, LoteHolerite, ExameASO, TreinamentoNR,
  Aprovacao, LogEvento, Beneficio, Elegibilidade, VinculoBeneficio,
  Treinamento, ParticipacaoTreinamento, ChecklistTemplate, 
  ChecklistInstancia, Desligamento
} from '../types';

// Base mock data
const nomes = [
  'Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Carla Souza',
  'Lucas Ferreira', 'Juliana Lima', 'Roberto Almeida', 'Patricia Rocha', 'Diego Martins',
  'Fernanda Castro', 'Ricardo Pereira', 'Camila Ribeiro', 'André Barbosa', 'Leticia Gomes',
  'Thiago Nascimento', 'Renata Cardoso', 'Felipe Moreira', 'Vanessa Correia', 'Bruno Teixeira',
  'Amanda Freitas', 'Gustavo Mendes', 'Priscila Dias', 'Marcos Araujo', 'Sabrina Cunha',
  'Rafael Pinto', 'Carolina Lopes', 'Vinicius Rodrigues', 'Natalia Vieira', 'Danilo Campos',
  'Gabriela Machado', 'Leonardo Silva', 'Claudia Santos', 'Rodrigo Oliveira', 'Tatiane Costa',
  'Fabio Souza', 'Michele Ferreira', 'Alexandre Lima', 'Denise Almeida', 'Murilo Rocha',
  'Bianca Martins', 'Henrique Castro', 'Simone Pereira', 'Eduardo Ribeiro', 'Kelly Barbosa',
  'Mateus Gomes', 'Adriana Nascimento', 'Caio Cardoso', 'Elaine Moreira', 'Otavio Correia',
  'Luana Teixeira', 'Hugo Freitas', 'Bruna Mendes', 'William Dias', 'Monique Araujo',
  'Gabriel Costa', 'Aline Ferreira', 'Rodrigo Lima', 'Juliana Almeida', 'Carlos Rocha'
];

const cargos = [
  'Analista Administrativo', 'Assistente Comercial', 'Coordenador de Vendas',
  'Operador de Máquinas', 'Técnico de Manutenção', 'Supervisor de Operações',
  'Analista Financeiro', 'Assistente de RH', 'Gerente Regional',
  'Motorista', 'Auxiliar de Serviços Gerais', 'Recepcionista',
  'Analista de TI', 'Coordenador de Logística', 'Vendedor',
  'Almoxarife', 'Assistente Contábil', 'Consultor Técnico', 'Mecânico',
  'Soldador', 'Eletricista', 'Engenheiro de Segurança'
];

const lojas = ['loja-1', 'loja-2', 'loja-3', 'loja-4'];
const centrosCusto = ['cc-adm', 'cc-vendas', 'cc-operacao', 'cc-manutencao'];

// Helper functions
function generateCPF(): string {
  const nums = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10));
  return `${nums.slice(0, 3).join('')}.${nums.slice(3, 6).join('')}.${nums.slice(6, 9).join('')}-${nums.slice(9).join('')}`;
}

function generateEmail(nome: string): string {
  const cleanName = nome.toLowerCase()
    .replace(/\s+/g, '.')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return `${cleanName}@locacaoerp.com.br`;
}

function generatePhone(): string {
  const ddd = Math.floor(Math.random() * 90) + 10;
  const first = Math.floor(Math.random() * 9) + 1;
  const rest = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `(${ddd}) ${first}${rest.slice(0, 4)}-${rest.slice(4)}`;
}

function generateMatricula(): string {
  return Math.floor(Math.random() * 90000 + 10000).toString();
}

function randomDate(daysBack: number): string {
  return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000).toISOString();
}

function randomFutureDate(daysForward: number): string {
  return new Date(Date.now() + Math.random() * daysForward * 24 * 60 * 60 * 1000).toISOString();
}

// Generate comprehensive RH content
export function seedRhContent() {
  // 1. Generate Pessoas (60)
  const pessoas: Pessoa[] = [];
  for (let i = 0; i < 60; i++) {
    const nome = nomes[i % nomes.length];
    const admissaoDate = randomDate(1095); // Last 3 years
    const pessoaId = `pessoa-${Date.now()}-${i}`;
    
    pessoas.push({
      id: pessoaId,
      nome,
      matricula: generateMatricula(),
      cpf: generateCPF(),
      email: generateEmail(nome),
      telefone: generatePhone(),
      admissaoISO: admissaoDate,
      cargo: cargos[Math.floor(Math.random() * cargos.length)],
      lojaId: lojas[Math.floor(Math.random() * lojas.length)],
      ccId: centrosCusto[Math.floor(Math.random() * centrosCusto.length)],
      situacao: Math.random() > 0.05 ? 'ativo' : 'inativo',
      docs: [],
      beneficios: [],
      movimentos: [],
      salario: Math.floor(Math.random() * 8000) + 2000,
      endereco: `Rua ${Math.floor(Math.random() * 999) + 1}, ${Math.floor(Math.random() * 500) + 1}`,
      nascimento: randomDate(14600), // 20-40 years back
      saldoFeriasDias: Math.floor(Math.random() * 30)
    });
  }

  // 2. Generate Vagas (8)
  const vagas: Vaga[] = [];
  const statusVagas: Vaga['status'][] = ['rascunho', 'aberta', 'selecao', 'aprovada', 'encerrada'];
  
  for (let i = 0; i < 8; i++) {
    const cargo = cargos[Math.floor(Math.random() * cargos.length)];
    vagas.push({
      id: `vaga-${Date.now()}-${i}`,
      titulo: `${cargo} - ${lojas[Math.floor(Math.random() * lojas.length)]}`,
      cargo,
      lojaId: lojas[Math.floor(Math.random() * lojas.length)],
      ccId: centrosCusto[Math.floor(Math.random() * centrosCusto.length)],
      tipoContratacao: ['CLT', 'Terceiro', 'Estagio'][Math.floor(Math.random() * 3)] as any,
      salario: Math.floor(Math.random() * 6000) + 2000,
      status: statusVagas[Math.floor(Math.random() * statusVagas.length)],
      criadoEm: randomDate(90),
      criadoPor: 'user-rh-01',
      descricao: `Vaga para ${cargo} com experiência em equipamentos de locação.`
    });
  }

  // 3. Generate Candidatos (40)
  const candidatos: Candidato[] = [];
  const etapas: Candidato['etapa'][] = ['triagem', 'entrevista', 'teste', 'aprovado', 'reprovado'];
  
  for (let i = 0; i < 40; i++) {
    const nome = `${nomes[Math.floor(Math.random() * nomes.length)]}-C${i}`;
    candidatos.push({
      id: `candidato-${Date.now()}-${i}`,
      nome,
      email: generateEmail(nome),
      telefone: generatePhone(),
      vagaId: vagas[Math.floor(Math.random() * vagas.length)]?.id || 'vaga-1',
      etapa: etapas[Math.floor(Math.random() * etapas.length)],
      score: Math.floor(Math.random() * 100),
      historicoEtapas: [],
      criadoEm: randomDate(60)
    });
  }

  // 4. Generate Admissões (6)
  const admissoes: Admissao[] = [];
  for (let i = 0; i < 6; i++) {
    const candidatoId = candidatos.filter(c => c.etapa === 'aprovado')[i]?.id || candidatos[i]?.id;
    admissoes.push({
      id: `admissao-${Date.now()}-${i}`,
      candidatoId: candidatoId || `candidato-${i}`,
      vagaId: vagas[i % vagas.length]?.id || 'vaga-1',
      statusDocs: ['pendente', 'incompleto', 'completo'][Math.floor(Math.random() * 3)] as any,
      dataAlvo: randomFutureDate(30),
      criadoEm: randomDate(15),
      checklist: []
    });
  }

  // 5. Generate Ajustes de Ponto
  const ajustesPonto: AjustePonto[] = [];
  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');
  
  for (let i = 0; i < 37; i++) { // 15 pendentes + 22 aprovados
    const pessoa = pessoasAtivas[Math.floor(Math.random() * pessoasAtivas.length)];
    const isPendente = i < 15;
    
    ajustesPonto.push({
      id: `ajuste-${Date.now()}-${i}`,
      pessoaId: pessoa.id,
      dataISO: randomDate(30),
      motivo: ['Horas extras', 'Banco de horas', 'Correção de ponto', 'Falta justificada'][Math.floor(Math.random() * 4)],
      horas: Math.random() * 8 - 4, // -4 to +4 hours
      observacao: `Ajuste solicitado ${isPendente ? 'aguardando aprovação' : 'aprovado'}`,
      status: isPendente ? 'pendente' : 'aprovado',
      criadoPor: pessoa.id,
      criadoEm: randomDate(30),
      aprovadoPor: isPendente ? undefined : 'user-rh-01',
      aprovadoEm: isPendente ? undefined : randomDate(15)
    });
  }

  // 6. Generate Banco de Horas
  const bancoHoras: BancoHoras[] = pessoasAtivas.map(pessoa => ({
    id: `banco-${pessoa.id}`,
    pessoaId: pessoa.id,
    saldo: Math.random() * 20 - 10, // -10 to +10 hours
    movimentos: []
  }));

  // 7. Generate Férias (18)
  const ferias: Ferias[] = [];
  for (let i = 0; i < 18; i++) {
    const pessoa = pessoasAtivas[Math.floor(Math.random() * pessoasAtivas.length)];
    const dataInicio = new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000);
    const dataFim = new Date(dataInicio.getTime() + 20 * 24 * 60 * 60 * 1000);
    
    ferias.push({
      id: `ferias-${Date.now()}-${i}`,
      colaboradorId: pessoa.id,
      periodo: `${new Date().getFullYear()}`,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      status: ['planejada', 'aprovada', 'em_andamento', 'concluida'][Math.floor(Math.random() * 4)] as any
    });
  }

  // 8. Generate Ausências (25)
  const ausencias: Ausencia[] = [];
  for (let i = 0; i < 25; i++) {
    const pessoa = pessoasAtivas[Math.floor(Math.random() * pessoasAtivas.length)];
    const dataInicio = randomDate(60);
    const dataFim = randomDate(30);
    
    ausencias.push({
      id: `ausencia-${Date.now()}-${i}`,
      pessoaId: pessoa.id,
      tipo: ['Atestado', 'Falta', 'Licenca'][Math.floor(Math.random() * 3)] as any,
      dataInicioISO: dataInicio,
      dataFimISO: dataFim,
      status: ['ABERTA', 'APROVADA', 'RECUSADA'][Math.floor(Math.random() * 3)] as any,
      criadoEm: new Date().toISOString(),
      criadoPor: 'admin'
    });
  }

  // 9. Generate Holerites (3 competências)
  const holerites: Holerite[] = [];
  const lotesHolerite: LoteHolerite[] = [];
  const competencias = ['2024-11', '2024-12', '2025-01'];
  
  competencias.forEach((comp, compIndex) => {
    // Create lote for this competencia
    const loteId = `lote-${comp}`;
    lotesHolerite.push({
      id: loteId,
      competencia: comp,
      lojaId: 'loja-1',
      ccId: undefined,
      criadoEm: randomDate(30),
      criadoPor: 'user-rh-01',
      status: 'publicado',
      totalColaboradores: pessoasAtivas.length
    });

    // Create holerites for all active employees
    pessoasAtivas.forEach((pessoa, pessoaIndex) => {
      const salarioBase = pessoa.salario || 3000;
      const totalProventos = salarioBase + Math.random() * 1000;
      const totalDescontos = totalProventos * (0.15 + Math.random() * 0.1);
      
      holerites.push({
        id: `holerite-${comp}-${pessoa.id}`,
        pessoaId: pessoa.id,
        comp,
        lojaId: pessoa.lojaId,
        ccId: pessoa.ccId,
        salarioBase,
        totalProventos,
        totalDescontos,
        salarioLiquido: totalProventos - totalDescontos,
        status: 'publicado',
        lido: Math.random() > 0.3, // 70% read
        publicadoEmISO: randomDate(30),
        publicadoPor: 'user-rh-01',
        loteId
      });
    });
  });

  // 10. Generate Benefícios
  const beneficios: Beneficio[] = [
    { id: 'ben-vt', nome: 'Vale Transporte', tipo: 'VALE_REFEICAO', valor: 200, ativo: true },
    { id: 'ben-vr', nome: 'Vale Refeição', tipo: 'VALE_REFEICAO', valor: 600, ativo: true },
    { id: 'ben-saude', nome: 'Plano de Saúde', tipo: 'PLANO_SAUDE', valor: 450, ativo: true },
    { id: 'ben-odonto', nome: 'Plano Odontológico', tipo: 'PLANO_SAUDE', valor: 80, ativo: true },
    { id: 'ben-vida', nome: 'Seguro de Vida', tipo: 'SEGURO_VIDA', valor: 100, ativo: true },
    { id: 'ben-combustivel', nome: 'Auxílio Combustível', tipo: 'OUTROS', valor: 300, ativo: true },
    { id: 'ben-ferramenta', nome: 'Auxílio Ferramenta', tipo: 'OUTROS', valor: 150, ativo: true },
    { id: 'ben-custo', nome: 'Ajuda de Custo', tipo: 'OUTROS', valor: 400, ativo: true }
  ];

  // 11. Generate SSMA data
  const examesASO: ExameASO[] = [];
  const treinamentosNR: TreinamentoNR[] = [];
  
  pessoasAtivas.forEach(pessoa => {
    // ASO
    const tipoASO: ExameASO['tipo'][] = ['admissional', 'periodico', 'mudanca', 'retorno', 'demissional'];
    examesASO.push({
      id: `aso-${pessoa.id}`,
      pessoaId: pessoa.id,
      tipo: tipoASO[Math.floor(Math.random() * tipoASO.length)],
      dataRealizacao: Math.random() > 0.2 ? randomDate(365) : undefined,
      dataVencimento: randomFutureDate(90),
      status: Math.random() > 0.8 ? 'vencido' : Math.random() > 0.3 ? 'realizado' : 'agendado',
      observacao: Math.random() > 0.7 ? 'Aguardando agendamento' : undefined
    });

    // NRs
    const nrs = ['NR-11', 'NR-12', 'NR-18', 'NR-35'];
    nrs.forEach(nr => {
      if (Math.random() > 0.4) { // 60% dos funcionários têm treinamentos
        treinamentosNR.push({
          id: `nr-${pessoa.id}-${nr}`,
          pessoaId: pessoa.id,
          nr,
          descricao: `Treinamento ${nr} - ${nr === 'NR-11' ? 'Transporte e Movimentação' : nr === 'NR-12' ? 'Máquinas e Equipamentos' : nr === 'NR-18' ? 'Construção Civil' : 'Trabalho em Altura'}`,
          dataRealizacao: Math.random() > 0.3 ? randomDate(730) : undefined,
          dataVencimento: randomFutureDate(365),
          status: Math.random() > 0.7 ? 'vencido' : Math.random() > 0.2 ? 'realizado' : 'agendado',
          certificadoMock: Math.random() > 0.5 ? `cert-${nr}-${pessoa.id}.pdf` : undefined
        });
      }
    });
  });

  // 12. Generate Aprovações (20 pending)
  const aprovacoes: Aprovacao[] = [];
  const tiposAprovacao: Aprovacao['tipo'][] = ['ponto', 'ferias', 'ausencia', 'admissao', 'beneficio'];
  
  for (let i = 0; i < 20; i++) {
    const pessoa = pessoasAtivas[Math.floor(Math.random() * pessoasAtivas.length)];
    const tipo = tiposAprovacao[Math.floor(Math.random() * tiposAprovacao.length)];
    
    aprovacoes.push({
      id: `aprovacao-${Date.now()}-${i}`,
      tipo,
      refId: `ref-${tipo}-${i}`,
      pessoaId: pessoa.id,
      lojaId: pessoa.lojaId,
      ccId: pessoa.ccId,
      solicitadoPor: pessoa.id,
      dataSolicitacaoISO: randomDate(15),
      status: Math.random() > 0.8 ? 'aprovado' : 'pendente',
      comentarios: [],
      slaHoras: 48,
      dataDecisaoISO: undefined,
      decididoPor: undefined,
      motivoRecusa: undefined
    });
  }

  // 13. Generate Checklists Templates
  const checklistTemplates: ChecklistTemplate[] = [
    {
      id: 'tpl-admissao',
      processo: 'admissao',
      nome: 'Checklist de Admissão',
      itens: [
        { id: 'adm-1', titulo: 'Documentos pessoais coletados', obrigatorio: true },
        { id: 'adm-2', titulo: 'Exame médico admissional', obrigatorio: true },
        { id: 'adm-3', titulo: 'Uniforme e EPIs entregues', obrigatorio: true },
        { id: 'adm-4', titulo: 'Cartão de acesso criado', obrigatorio: false },
        { id: 'adm-5', titulo: 'Treinamento inicial ministrado', obrigatorio: true },
        { id: 'adm-6', titulo: 'Sistema cadastrado', obrigatorio: true },
        { id: 'adm-7', titulo: 'Apresentação à equipe', obrigatorio: false },
        { id: 'adm-8', titulo: 'Manual do colaborador entregue', obrigatorio: true },
        { id: 'adm-9', titulo: 'Conta bancária para depósito', obrigatorio: true },
        { id: 'adm-10', titulo: 'Registro no eSocial', obrigatorio: true }
      ]
    },
    {
      id: 'tpl-ferias',
      processo: 'ferias',
      nome: 'Checklist de Férias',
      itens: [
        { id: 'fer-1', titulo: 'Aviso de férias emitido', obrigatorio: true },
        { id: 'fer-2', titulo: 'Substituição definida', obrigatorio: true },
        { id: 'fer-3', titulo: 'Atividades repassadas', obrigatorio: true },
        { id: 'fer-4', titulo: 'Adiantamento 13º calculado', obrigatorio: false },
        { id: 'fer-5', titulo: 'Cartão ponto suspenso', obrigatorio: true },
        { id: 'fer-6', titulo: 'Comunicação à equipe', obrigatorio: false }
      ]
    },
    {
      id: 'tpl-desligamento',
      processo: 'desligamento',
      nome: 'Checklist de Desligamento',
      itens: [
        { id: 'des-1', titulo: 'Aviso prévio processado', obrigatorio: true },
        { id: 'des-2', titulo: 'Devolução de equipamentos', obrigatorio: true },
        { id: 'des-3', titulo: 'Devolução de EPIs', obrigatorio: true },
        { id: 'des-4', titulo: 'Cartão de acesso bloqueado', obrigatorio: true },
        { id: 'des-5', titulo: 'Sistema desativado', obrigatorio: true },
        { id: 'des-6', titulo: 'Entrevista de desligamento', obrigatorio: false },
        { id: 'des-7', titulo: 'Exame médico demissional', obrigatorio: true },
        { id: 'des-8', titulo: 'TRCT assinado', obrigatorio: true },
        { id: 'des-9', titulo: 'Baixa no eSocial', obrigatorio: true },
        { id: 'des-10', titulo: 'Homologação sindical', obrigatorio: true },
        { id: 'des-11', titulo: 'Comunicação às equipes', obrigatorio: false },
        { id: 'des-12', titulo: 'Backup de dados do usuário', obrigatorio: false }
      ]
    }
  ];

  // 14. Generate some Desligamentos
  const desligamentos: Desligamento[] = [];
  for (let i = 0; i < 3; i++) {
    const pessoa = pessoas[Math.floor(Math.random() * pessoas.length)];
    desligamentos.push({
      id: `deslig-${Date.now()}-${i}`,
      pessoaId: pessoa.id,
      lojaId: pessoa.lojaId,
      ccId: pessoa.ccId,
      motivo: ['pedido', 'justa_causa', 'sem_justa_causa', 'acordo'][Math.floor(Math.random() * 4)] as any,
      dataAlvoISO: randomFutureDate(30),
      status: ['em_andamento', 'concluido'][Math.floor(Math.random() * 2)] as any,
      checklistId: 'tpl-desligamento',
      criadoPor: 'user-rh-01',
      criadoEmISO: randomDate(15)
    });
  }

  // 15. Generate some logs
  const logs: LogEvento[] = [];
  for (let i = 0; i < 50; i++) {
    const pessoa = pessoas[Math.floor(Math.random() * pessoas.length)];
    const tipos = ['ADMISSAO', 'AJUSTE_PONTO', 'FERIAS_SOLICITADA', 'BENEFICIO_ALTERADO', 'DOCUMENTO_ENVIADO'];
    
    logs.push({
      id: `log-${Date.now()}-${i}`,
      tipo: tipos[Math.floor(Math.random() * tipos.length)],
      pessoaId: pessoa.id,
      descricao: `Ação realizada para ${pessoa.nome}`,
      dataISO: randomDate(90),
      usuario: 'user-rh-01',
      metadados: { origem: 'sistema' }
    });
  }

  return {
    pessoas,
    vagas,
    candidatos,
    admissoes,
    ajustesPonto,
    bancoHoras,
    ferias,
    ausencias,
    holerites,
    lotesHolerite,
    examesASO,
    treinamentosNR,
    aprovacoes,
    logs,
    // New content
    beneficios,
    checklistTemplates,
    desligamentos
  };
}

// Helper functions for reports
export function buildHeadcountSeries(pessoas: Pessoa[]) {
  const months = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    
    const admitidos = pessoas.filter(p => p.admissaoISO.startsWith(monthKey)).length;
    const ativosNoMes = pessoas.filter(p => {
      const admissao = new Date(p.admissaoISO);
      return admissao <= date && p.situacao === 'ativo';
    }).length;
    
    months.push({
      mes: monthKey,
      headcount: ativosNoMes,
      admissoes: admitidos,
      desligamentos: Math.floor(Math.random() * 3)
    });
  }
  
  return months;
}

export function buildTurnover(pessoas: Pessoa[]) {
  const ativo = pessoas.filter(p => p.situacao === 'ativo').length;
  const desligamentos12m = Math.floor(ativo * 0.15); // Mock 15% turnover
  return (desligamentos12m / ativo * 100).toFixed(1);
}

export function buildComplianceStats(exames: ExameASO[], treinamentos: TreinamentoNR[]) {
  const asoVencidos = exames.filter(e => e.status === 'vencido').length;
  const asoVencendo = exames.filter(e => {
    const vencimento = new Date(e.dataVencimento);
    const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return vencimento <= em30dias && e.status !== 'vencido';
  }).length;
  
  const nrVencidos = treinamentos.filter(t => t.status === 'vencido').length;
  const nrVencendo = treinamentos.filter(t => {
    const vencimento = new Date(t.dataVencimento);
    const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return vencimento <= em30dias && t.status !== 'vencido';
  }).length;
  
  return {
    asoVencidos,
    asoVencendo,
    asoOK: exames.length - asoVencidos - asoVencendo,
    nrVencidos,
    nrVencendo,
    nrOK: treinamentos.length - nrVencidos - nrVencendo
  };
}

// Save and load helpers
export function saveRhState(data: any) {
  localStorage.setItem('rh_demo_state', JSON.stringify(data));
}

export function loadRhState() {
  try {
    const stored = localStorage.getItem('rh_demo_state');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading RH state:', error);
    return null;
  }
}