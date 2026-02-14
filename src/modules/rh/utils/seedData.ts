import { Pessoa, Vaga, BeneficioPessoa, MovimentoPessoa, DocumentoPessoa } from '../types';

// Mock data generators
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
  'Luana Teixeira', 'Hugo Freitas', 'Bruna Mendes', 'William Dias', 'Monique Araujo'
];

const cargos = [
  'Analista Administrativo', 'Assistente Comercial', 'Coordenador de Vendas',
  'Operador de Máquinas', 'Técnico de Manutenção', 'Supervisor de Operações',
  'Analista Financeiro', 'Assistente de RH', 'Gerente Regional',
  'Motorista', 'Auxiliar de Serviços Gerais', 'Recepcionista',
  'Analista de TI', 'Coordenador de Logística', 'Vendedor',
  'Almoxarife', 'Assistente Contábil', 'Consultor Técnico'
];

const lojas = ['loja-1', 'loja-2', 'loja-3', 'loja-4'];
const centrosCusto = ['cc-adm', 'cc-vendas', 'cc-operacao', 'cc-manutencao'];

const tiposBeneficio: BeneficioPessoa['tipo'][] = ['VT', 'VR', 'Plano Saude', 'Plano Odonto', 'Seguro Vida'];

const tiposDocumento = [
  'RG', 'CPF', 'Carteira de Trabalho', 'Título de Eleitor', 'Comprovante de Residência',
  'Certificado de Escolaridade', 'Carteira de Habilitação', 'Atestado Médico Admissional'
];

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
  const ddd = Math.floor(Math.random() * 90) + 10; // 10-99
  const first = Math.floor(Math.random() * 9) + 1; // 1-9
  const rest = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `(${ddd}) ${first}${rest.slice(0, 4)}-${rest.slice(4)}`;
}

function generateMatricula(): string {
  return Math.floor(Math.random() * 90000 + 10000).toString();
}

function generateDocumentos(): DocumentoPessoa[] {
  const numDocs = Math.floor(Math.random() * 4) + 4; // 4-7 documentos
  const selectedTypes = tiposDocumento.slice().sort(() => 0.5 - Math.random()).slice(0, numDocs);
  
  return selectedTypes.map((tipo, index) => ({
    id: `doc-${Date.now()}-${index}`,
    tipo,
    nome: `${tipo.replace(/\s+/g, '_').toLowerCase()}.pdf`,
    dataUpload: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    url: `mock://documents/${tipo.replace(/\s+/g, '_').toLowerCase()}.pdf`,
    obrigatorio: ['RG', 'CPF', 'Carteira de Trabalho', 'Atestado Médico Admissional'].includes(tipo)
  }));
}

function generateBeneficios(): BeneficioPessoa[] {
  return tiposBeneficio.map((tipo, index) => ({
    id: `ben-${Date.now()}-${index}`,
    tipo,
    ativo: Math.random() > 0.3, // 70% chance de estar ativo
    valor: tipo === 'VT' ? 200 : tipo === 'VR' ? 600 : tipo === 'Plano Saude' ? 450 : tipo === 'Plano Odonto' ? 80 : 100,
    elegivel: Math.random() > 0.1 // 90% elegível
  }));
}

function generateMovimentos(pessoaId: string, admissao: string): MovimentoPessoa[] {
  const movimentos: MovimentoPessoa[] = [];
  
  // Movimento de admissão
  movimentos.push({
    id: `mov-${pessoaId}-admissao`,
    tipo: 'admissao',
    data: admissao,
    descricao: 'Admissão na empresa',
    usuarioId: 'user-rh-01',
    observacao: 'Processo seletivo concluído com sucesso'
  });

  // Possíveis reajustes (30% chance)
  if (Math.random() < 0.3) {
    const reajusteDate = new Date(new Date(admissao).getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000);
    movimentos.push({
      id: `mov-${pessoaId}-reajuste`,
      tipo: 'reajuste',
      data: reajusteDate.toISOString(),
      descricao: 'Reajuste salarial',
      valor: Math.floor(Math.random() * 500) + 200,
      usuarioId: 'user-rh-01',
      observacao: 'Avaliação de desempenho'
    });
  }

  // Possíveis férias (50% chance)
  if (Math.random() < 0.5) {
    const feriasDate = new Date(new Date(admissao).getTime() + Math.random() * 300 * 24 * 60 * 60 * 1000);
    movimentos.push({
      id: `mov-${pessoaId}-ferias`,
      tipo: 'ferias',
      data: feriasDate.toISOString(),
      descricao: 'Férias programadas - 20 dias',
      usuarioId: 'user-rh-01'
    });
  }

  return movimentos;
}

export function generatePessoas(count: number = 55): Pessoa[] {
  const pessoas: Pessoa[] = [];
  
  for (let i = 0; i < count; i++) {
    const nome = nomes[i % nomes.length];
    const admissaoDate = new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000); // Últimos 3 anos
    const pessoaId = `pessoa-${Date.now()}-${i}`;
    
    const pessoa: Pessoa = {
      id: pessoaId,
      nome,
      matricula: generateMatricula(),
      cpf: generateCPF(),
      email: generateEmail(nome),
      telefone: generatePhone(),
      admissaoISO: admissaoDate.toISOString(),
      cargo: cargos[Math.floor(Math.random() * cargos.length)],
      lojaId: lojas[Math.floor(Math.random() * lojas.length)],
      ccId: centrosCusto[Math.floor(Math.random() * centrosCusto.length)],
      situacao: Math.random() > 0.05 ? 'ativo' : 'inativo', // 95% ativos
      docs: generateDocumentos(),
      beneficios: generateBeneficios(),
      movimentos: generateMovimentos(pessoaId, admissaoDate.toISOString()),
      salario: Math.floor(Math.random() * 8000) + 2000, // R$ 2.000 - R$ 10.000
      endereco: `Rua ${Math.floor(Math.random() * 999) + 1}, ${Math.floor(Math.random() * 500) + 1}`,
      nascimento: new Date(Date.now() - (Math.random() * 20 + 20) * 365 * 24 * 60 * 60 * 1000).toISOString() // 20-40 anos
    };
    
    pessoas.push(pessoa);
  }
  
  return pessoas;
}

export function generateVagas(count: number = 8): Vaga[] {
  const vagas: Vaga[] = [];
  const statusList: Vaga['status'][] = ['rascunho', 'aberta', 'selecao', 'aprovada', 'encerrada'];
  const tiposContratacao: Vaga['tipoContratacao'][] = ['CLT', 'Terceiro', 'Estagio'];
  
  for (let i = 0; i < count; i++) {
    const cargo = cargos[Math.floor(Math.random() * cargos.length)];
    
    const vaga: Vaga = {
      id: `vaga-${Date.now()}-${i}`,
      titulo: `${cargo} - ${lojas[Math.floor(Math.random() * lojas.length)]}`,
      cargo,
      lojaId: lojas[Math.floor(Math.random() * lojas.length)],
      ccId: centrosCusto[Math.floor(Math.random() * centrosCusto.length)],
      tipoContratacao: tiposContratacao[Math.floor(Math.random() * tiposContratacao.length)],
      salario: Math.floor(Math.random() * 6000) + 2000,
      status: statusList[Math.floor(Math.random() * statusList.length)],
      criadoEm: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      criadoPor: 'user-rh-01',
      descricao: `Vaga para ${cargo} com experiência em equipamentos de locação. Necessário conhecimento em manutenção e operação.`
    };
    
    vagas.push(vaga);
  }
  
  return vagas;
}

export function seedRhData() {
  const pessoas = generatePessoas();
  const vagas = generateVagas();
  
  return {
    pessoas,
    vagas,
    candidatos: [],
    admissoes: [],
    ajustesPonto: [],
    bancoHoras: [],
    ferias: [],
    ausencias: [],
    holerites: [],
    examesASO: [],
    treinamentosNR: [],
    aprovacoes: [],
    logs: []
  };
}