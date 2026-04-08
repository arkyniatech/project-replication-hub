// RH Module Types

// Core entities
export interface Pessoa {
  id: string;
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  telefone: string;
  admissaoISO: string;
  cargo: string;
  lojaId: string;
  ccId: string;
  situacao: 'ativo' | 'inativo';
  docs: DocumentoPessoa[];
  beneficios: BeneficioPessoa[];
  movimentos: MovimentoPessoa[];
  salario?: number;
  endereco?: string;
  nascimento?: string;
  saldoFeriasDias?: number;
}

export interface DocumentoPessoa {
  id: string;
  tipo: string;
  nome: string;
  dataUpload: string;
  url?: string; // mock
  obrigatorio: boolean;
}

export interface BeneficioPessoa {
  id: string;
  tipo: 'VT' | 'VR' | 'Plano Saude' | 'Plano Odonto' | 'Seguro Vida';
  ativo: boolean;
  valor?: number;
  elegivel: boolean;
}

export interface MovimentoPessoa {
  id: string;
  tipo: 'admissao' | 'reajuste' | 'ferias' | 'afastamento' | 'ocorrencia';
  data: string;
  descricao: string;
  valor?: number;
  observacao?: string;
  usuarioId: string;
}

// Ausência types
export interface Ausencia {
  id: string;
  pessoaId: string;
  tipo: 'Atestado' | 'Falta' | 'Licenca';
  dataInicioISO: string;
  dataFimISO: string;
  obs?: string;
  status: 'ABERTA' | 'APROVADA' | 'RECUSADA';
  anexoFoto?: AnexoMock;
  criadoEm: string;
  criadoPor: string;
}

export interface AnexoMock {
  nome: string;
  tamanho: number;
  ts: string;
}

export interface PontoMarcacao {
  id: string;
  pessoaId: string;
  dataISO: string;
  horaIn?: string;
  horaOut?: string;
  origem: 'app' | 'manual' | 'ajuste';
}

export interface BancoHorasMov {
  id: string;
  pessoaId: string;
  dataISO: string;
  tipo: 'CREDITO' | 'DEBITO';
  horas: number;
  ref?: string;
  motivo: string;
}

export interface AjustePonto {
  id: string;
  pessoaId: string;
  dataISO: string;
  motivo: string;
  horas: number;
  observacao: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  criadoPor: string;
  criadoEm: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
}

export interface BancoHoras {
  id: string;
  pessoaId: string;
  saldo: number;
  movimentos: MovimentoBanco[];
}

export interface MovimentoBanco {
  id: string;
  tipo: 'credito' | 'debito';
  horas: number;
  motivo: string;
  data: string;
}

export interface ExameASO {
  id: string;
  pessoaId: string;
  tipo: 'admissional' | 'periodico' | 'mudanca' | 'retorno' | 'demissional';
  dataRealizacao?: string;
  dataVencimento: string;
  status: 'agendado' | 'realizado' | 'vencido';
  observacao?: string;
}

export interface TreinamentoNR {
  id: string;
  pessoaId: string;
  nr: string;
  descricao: string;
  dataRealizacao?: string;
  dataVencimento: string;
  status: 'agendado' | 'realizado' | 'vencido';
  certificadoMock?: string;
}

export interface ComentarioAprovacao {
  id: string;
  autor: string;
  mensagem: string;
  tsISO: string;
}

export interface LoteHolerite {
  id: string;
  competencia: string;
  lojaId: string;
  ccId?: string;
  criadoEm: string;
  criadoPor: string;
  status: 'processando' | 'publicado' | 'arquivado';
  totalColaboradores: number;
}

export interface Aprovacao {
  id: string;
  tipo: 'ponto' | 'ferias' | 'ausencia' | 'admissao' | 'beneficio';
  refId: string;
  pessoaId: string;
  lojaId: string;
  ccId: string;
  solicitadoPor: string;
  dataSolicitacaoISO: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  comentarios: ComentarioAprovacao[];
  slaHoras?: number;
  dataDecisaoISO?: string;
  decididoPor?: string;
  motivoRecusa?: string;
}

export interface LogEvento {
  id: string;
  tipo: string;
  pessoaId?: string;
  descricao: string;
  dataISO: string;
  usuario: string;
  metadados?: Record<string, any>;
}

// New Content Booster Types

// Benefícios
export interface Beneficio {
  id: string;
  nome: string;
  tipo: 'VALE_REFEICAO' | 'PLANO_SAUDE' | 'SEGURO_VIDA' | 'OUTROS';
  valor?: number;
  ativo: boolean;
  provedor?: string;
  custoBase?: number;
  politicas?: string[];
}

export interface Elegibilidade {
  id: string;
  cargoId: string;
  ccId: string;
  lojaId: string;
  beneficioId: string;
  ativo: boolean;
}

export interface VinculoBeneficio {
  id: string;
  pessoaId: string;
  beneficioId: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  desdeISO: string;
  notas?: string;
}

// SSMA & Treinamentos
export interface Treinamento {
  id: string;
  codigo: string;
  nome: string;
  validadeMeses: number;
  descricao?: string;
}

export interface ParticipacaoTreinamento {
  id: string;
  pessoaId: string;
  treinamentoId: string;
  realizadoISO: string;
  vencimentoISO: string;
  certificadoMock?: string;
  status: 'agendado' | 'realizado' | 'vencido';
}

// Checklists & Documentos
export interface ChecklistTemplate {
  id: string;
  processo: 'admissao' | 'ferias' | 'desligamento';
  nome: string;
  itens: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  responsavel?: string;
  prazoHoras?: number;
}

export interface ChecklistInstancia {
  id: string;
  pessoaId: string;
  templateId: string;
  processo: 'admissao' | 'ferias' | 'desligamento';
  status: 'pendente' | 'em_andamento' | 'concluido';
  criadoEmISO: string;
  itens: ChecklistInstanciaItem[];
}

export interface ChecklistInstanciaItem {
  templateItemId: string;
  status: 'pendente' | 'concluido' | 'n_aplicavel';
  anexosMock?: string[];
  observacao?: string;
  concluidoEmISO?: string;
  concluidoPor?: string;
}

// Offboarding
export interface Desligamento {
  id: string;
  pessoaId: string;
  lojaId: string;
  ccId?: string;
  motivo: 'pedido' | 'justa_causa' | 'sem_justa_causa' | 'acordo';
  dataAlvoISO: string;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  checklistId?: string;
  observacao?: string;
  criadoPor: string;
  criadoEmISO: string;
}

// Relatórios
export interface KPIRh {
  headcount: number;
  turnover12m: number;
  heAcumuladas: number;
  feriasVencidas: number;
  absenteismo: number;
}

export interface HeadcountSeries {
  mes: string;
  headcount: number;
  admissoes: number;
  desligamentos: number;
}

export interface ComplianceStats {
  asoVencidos: number;
  asoVencendo: number;
  asoOK: number;
  nrVencidos: number;
  nrVencendo: number;
  nrOK: number;
}

// Acessos & Perfis (Provisionamento)
export interface Perfil {
  id: string;
  nome: 'vendedor' | 'motorista' | 'mecanico' | 'financeiro' | 'gestor' | 'admin';
  descricao: string;
  permissoes: string[];
  travado?: boolean; // admin, financeiro, rh não podem ser excluídos
}

export interface ConviteUsuario {
  token: string;
  criadoEmISO: string;
  expiraEmISO: string;
  usado: boolean;
}

export interface SessaoUsuario {
  device: string;
  ip?: string;
  ultimaAtividadeISO: string;
}

export interface Usuario {
  id: string;
  funcionarioId: string;
  nome: string;
  email: string;
  username: string;
  status: 'pendente' | 'ativo' | 'suspenso' | 'revogado';
  lojasPermitidas: string[];
  lojaPadrao: string;
  centrosCusto?: string[];
  perfis: string[];
  exigeTrocaSenha: boolean;
  twoFA: {
    habilitado: boolean;
    metodo?: 'app' | 'sms';
  };
  convites: ConviteUsuario[];
  sessoes: SessaoUsuario[];
  criadoEm: string;
  criadoPor: string;
}

export interface SolicitacaoAcesso {
  id: string;
  funcionarioId: string;
  tipo: 'criacao' | 'alteracao' | 'revogacao';
  solicitadoPor: string;
  lojaId: string;
  ccId?: string;
  payload?: any;
  status: 'pendente' | 'aprovado' | 'recusado';
  observacao?: string;
  criadoEmISO: string;
  decididoEmISO?: string;
  decididoPor?: string;
  motivoRecusa?: string;
}

// Store state
export interface RhState {
  pessoas: Pessoa[];
  vagas: Vaga[];
  candidatos: Candidato[];
  admissoes: Admissao[];
  ajustesPonto: AjustePonto[];
  bancoHoras: BancoHoras[];
  ferias: Ferias[];
  ausencias: Ausencia[];
  holerites: Holerite[];
  lotesHolerite: LoteHolerite[];
  examesASO: ExameASO[];
  treinamentosNR: TreinamentoNR[];
  aprovacoes: Aprovacao[];
  logs: LogEvento[];
  // New content booster data
  beneficios: Beneficio[];
  elegibilidades: Elegibilidade[];
  vinculosBeneficio: VinculoBeneficio[];
  treinamentos: Treinamento[];
  participacoesTreinamento: ParticipacaoTreinamento[];
  checklistTemplates: ChecklistTemplate[];
  checklistInstancias: ChecklistInstancia[];
  desligamentos: Desligamento[];
  pontoMarcacoes: PontoMarcacao[];
  bancoHorasMovs: BancoHorasMov[];
}

// UI helpers
export interface FiltrosPessoas {
  busca: string;
  unidadeId: string;
  ccId: string;
  situacao: string;
  cargo: string;
}

export interface KPIRh {
  headcount: number;
  turnover12m: number;
  heAcumuladas: number;
  feriasVencidas: number;
  absenteismo: number;
}

// Existing legacy types (to maintain compatibility)
export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  unidadeId: string;
  centroCustoId?: string;
  cargoId: string;
  dataAdmissao: string;
  dataDemissao?: string;
  status: 'ATIVO' | 'INATIVO' | 'AFASTADO' | 'DEMITIDO';
  createdAt: string;
  updatedAt: string;
}

export interface Unidade {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  ativo: boolean;
}

export interface CentroDeCusto {
  id: string;
  codigo: string;
  nome: string;
  unidadeId?: string;
  ativo: boolean;
}

export interface Cargo {
  id: string;
  nome: string;
  area: string;
  nivel: string;
  ativo: boolean;
}

export interface Vaga {
  id: string;
  titulo: string;
  cargo: string;
  lojaId: string;
  ccId: string;
  tipoContratacao: 'CLT' | 'Terceiro' | 'Estagio';
  salario: number;
  status: 'rascunho' | 'aberta' | 'selecao' | 'aprovada' | 'encerrada';
  criadoEm: string;
  criadoPor: string;
  descricao: string;
}

export interface Candidato {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  vagaId: string;
  etapa: 'triagem' | 'entrevista' | 'teste' | 'aprovado' | 'reprovado';
  score: number; // mock
  historicoEtapas: HistoricoEtapa[];
  criadoEm: string;
}

export interface HistoricoEtapa {
  etapa: string;
  data: string;
  observacao?: string;
  usuarioId: string;
}

export interface Admissao {
  id: string;
  candidatoId: string;
  vagaId: string;
  statusDocs: 'pendente' | 'incompleto' | 'completo';
  dataAlvo: string;
  criadoEm: string;
  checklist: ChecklistItem[];
}

export interface Jornada {
  id: string;
  colaboradorId: string;
  tipo: 'NORMAL' | 'FLEXIBLE' | 'ESCALA';
  horasSemanais: number;
  diasSemanais: number;
}

export interface LancamentoPonto {
  id: string;
  colaboradorId: string;
  data: string;
  entrada?: string;
  saida?: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}

export interface BancoDeHoras {
  id: string;
  colaboradorId: string;
  saldo: number;
  periodo: string;
}

export interface Ferias {
  id: string;
  colaboradorId: string;
  periodo: string;
  dataInicio: string;
  dataFim: string;
  status: 'planejada' | 'aprovada' | 'em_andamento' | 'concluida';
}

export interface Beneficio {
  id: string;
  nome: string;
  tipo: 'VALE_REFEICAO' | 'PLANO_SAUDE' | 'SEGURO_VIDA' | 'OUTROS';
  valor?: number;
  ativo: boolean;
}

export interface ASO {
  id: string;
  colaboradorId: string;
  tipo: 'ADMISSIONAL' | 'PERIODICO' | 'DEMISSIONAL';
  dataRealizacao: string;
  dataVencimento: string;
  status: 'PENDENTE' | 'REALIZADO' | 'VENCIDO';
}

export interface Holerite {
  id: string;
  pessoaId: string;
  comp: string;
  lojaId: string;
  ccId: string;
  salarioBase: number;
  totalProventos: number;
  totalDescontos: number;
  salarioLiquido: number;
  status: 'publicado' | 'arquivado';
  lido: boolean;
  publicadoEmISO: string;
  publicadoPor: string;
  loteId: string;
}

export interface Documento {
  id: string;
  colaboradorId: string;
  tipo: string;
  nome: string;
  url?: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  dataUpload: string;
}

export interface Checklist {
  id: string;
  colaboradorId: string;
  etapa: 'ADMISSAO' | 'FERIAS' | 'DESLIGAMENTO';
  itens: ChecklistItem[];
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
}

export interface ChecklistItem {
  id: string;
  descricao: string;
  concluido: boolean;
  responsavel?: string;
  dataVencimento?: string;
  dataConclusao?: string;
}

export interface Solicitacao {
  id: string;
  colaboradorId: string;
  tipo: 'FERIAS' | 'AUSENCIA' | 'DOCUMENTO' | 'OUTROS';
  descricao: string;
  status: 'PENDENTE' | 'EM_ANALISE' | 'APROVADA' | 'REJEITADA';
  dataSolicitacao: string;
  dataResposta?: string;
}

export interface Log {
  id: string;
  modulo: string;
  acao: string;
  usuarioId: string;
  timestamp: string;
  detalhes?: Record<string, any>;
}

// Context Types
export interface RhScopeContext {
  unidadeAtiva?: string;
  ccAtivo?: string;
  periodo: {
    inicio: string;
    fim: string;
  };
}

// Menu Types
export interface RhMenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  children?: RhMenuItem[];
  visible?: boolean;
}

// Filter Types
export interface RhFilters {
  unidade?: string;
  centroCusto?: string;
  periodo?: {
    inicio: string;
    fim: string;
  };
}