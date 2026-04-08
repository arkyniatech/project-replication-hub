// Tipos do ERP de Locação

export interface Contato {
  id: string;
  tipo: 'Telefone' | 'WhatsApp' | 'Email';
  valor: string;
  principal?: boolean;
  verificado?: boolean;
}

export interface Anexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
}

export interface AnexoContrato extends Anexo {
  contratoId: string;
  tamanho: number; // em bytes
  tag: 'CONTRATO' | 'ASSINATURA' | 'OS' | 'OUTROS';
  observacao?: string;
  base64: string; // mock storage
  usuarioId: string;
  usuarioNome: string;
  createdAt: string;
}

// Loja/Unidade
export interface Loja {
  id: string;
  nome: string;
  apelido: string;
  cnpj: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  ativo: boolean;
}

// Obra/Endereço de Entrega
export interface Obra {
  id: string;
  clienteId: string;
  apelido: string; // Nome identificador da obra (ex: "Obra Centro", "Matriz")
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  isPadrao: boolean; // Se é o endereço padrão de entrega
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  id: string;
  lojaId: string;
  tipo: 'PF' | 'PJ';
  // Campos PF
  nome?: string; // Nome completo para PF
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  responsavel?: string;
  // Campos PJ
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  isentoIE?: boolean;
  // Campos unificados
  nomeRazao: string; // Campo principal (nome para PF, razão social para PJ)
  documento: string; // CPF ou CNPJ
  contatos: Contato[];
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    pais: string;
  };
  obras?: Obra[]; // Obras/endereços de entrega cadastrados
  status: 'ATIVO' | 'SUSPENSO' | 'EM_ANALISE';
  statusCredito: 'Ativo' | 'Suspenso' | 'Em análise'; // Compatibilidade
  inadimplente: boolean;
  inadimplenteOrigem?: {
    lojaId: string;
    valor: number;
  };
  limiteCredito?: number;
  observacoes?: string;
  anexos: Anexo[];
  lgpdAceito: boolean;
  auditoria: {
    criadoPor: string;
    criadoEm: string;
    atualizadoEm: string;
  };
  // Políticas comerciais
  politicaComercial?: 'P0' | 'P1' | 'P2';
  aplicarPoliticaAuto?: boolean;
  // Campos para inadimplência
  ultimoContato?: {
    ts: number;
    usuarioNome: string;
    canal?: string;
    dataFormatada?: string;
  };
  responsavelUltimoContato?: string;
  // Para compatibilidade com código existente
  email: string;
  telefone: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrupoEquipamento {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Equipamento {
  id: string;
  lojaId?: string;
  codigo: string;
  nome: string; // descricao/nome comercial
  descricao?: string;
  numeroSerie?: string;
  grupoId: string;
  grupo: GrupoEquipamento;
  unidadeLocacao: 'DIARIA' | 'SEMANA' | 'QUINZENA' | '21DIAS' | 'MES' | 'Diária' | 'Semana' | 'Mês' | 'Hora';
  tabela?: {
    DIARIA: number;
    SEMANA: number;
    QUINZENA: number;
    D21: number;
    MES: number;
  };
  status: 'DISPONIVEL' | 'RESERVADO' | 'MANUTENCAO' | 'LOCADO' | 'EM_REVISAO' | 'Disponível' | 'Reservado' | 'Manutenção' | 'Locado';
  controle?: 'SERIALIZADO' | 'GRUPO';
  tipoControle?: 'SERIALIZADO' | 'GRUPO'; // Compatibilidade
  qtdDisponivel?: number; // apenas para GRUPO
  quantidade?: number; // Compatibilidade
  localizacao?: string;
  checklists: string[];
  anexos: Anexo[];
  observacoes?: string;
  ativo: boolean;
  // Para compatibilidade com código existente
  situacao: 'Disponível' | 'Manutenção' | 'Reservado' | 'Baixado';
  precos: {
    diaria?: number;
    semana?: number;
    mes?: number;
    diario?: number;
    semanal?: number;
    mensal?: number;
  };
  precos_old?: {
    diario: number;
    semanal: number;
    mensal: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ItemContrato {
  id: string;
  equipamentoId: string;
  equipamento: Equipamento;
  controle: 'SERIALIZADO' | 'GRUPO';
  quantidade: number;
  periodoEscolhido: 'DIARIA' | 'SEMANA' | 'QUINZENA' | '21DIAS' | 'MES';
  valorUnitario: number;
  subtotal: number;
  statusItem?: 'ENTREGUE' | 'DEVOLVIDO' | 'EM_REVISAO'; // Status do item no contrato
  // Para compatibilidade
  valorTotal: number;
  periodo: 'diario' | 'semanal' | 'mensal';
}

export interface Contrato {
  id: number; // Auto-increment por loja (apenas números)
  lojaId: string;
  numero: string; // Número simples por loja
  clienteId: string;
  cliente: Cliente;
  obraId?: string; // ID da obra selecionada
  obra?: Obra; // Dados completos da obra (endereço de entrega)
  itens: ItemContrato[];
  entrega: {
    data: string;
    janela: 'MANHA' | 'TARDE';
    horaSugestao?: string;
    observacoes?: string;
  };
  condicoes: {
    confirmacoes: string[];
    observacoes?: string;
  };
  pagamento: {
    forma: 'BOLETO' | 'PIX' | 'CARTAO' | 'DINHEIRO';
    vencimentoISO: string;
  };
  status: 'AGENDADO' | 'AGUARDANDO_ENTREGA' | 'ATIVO' | 'ENCERRADO';
  rascunho: boolean;
  timeline: EventoTimeline[];
  aditivos?: AditivoContratual[];
  reservaId?: string;
  valorTotal: number;
  // Para compatibilidade com código existente
  dataInicio: string;
  dataFim: string;
  formaPagamento: 'À vista' | 'Parcelado' | 'Mensal' | 'Boleto' | 'PIX' | 'Cartão' | 'Dinheiro';
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

// Reserva de equipamentos
export interface Reserva {
  id: string;
  lojaId: string;
  contratoRascunhoId?: string;
  itens: {
    equipamentoId: string;
    controle: 'SERIALIZADO' | 'GRUPO';
    quantidade: number;
  }[];
  status: 'ATIVA' | 'CANCELADA';
  criadoEm: string;
}

// Ordem de Serviço de Logística
export interface OSLogistica {
  id: string;
  lojaId: string;
  contratoId?: number;
  tipo: 'ENTREGA' | 'RETIRADA';
  data: string;
  janela: 'MANHA' | 'TARDE';
  horaSugestao?: string;
  status: 'PLANEJADO' | 'CONCLUIDO' | 'REAGENDADO';
  observacoes?: string;
  criadoEm: string;
}

// Agrupador de Cobrança
export interface AgregadorCobranca {
  id: string;
  clienteId: string;
  titulosIds: number[];
  valorTotal: number;
  criadoEm: string;
}

// Evento da timeline de títulos
export interface TimelineEvent {
  id: string;
  timestamp: string;
  tipo: 'criacao' | 'segunda_via' | 'notificacao' | 'recebimento' | 'baixa';
  descricao: string;
  usuario: string;
  meta?: {
    valor?: number;
    forma?: string;
    desconto?: number;
    juros?: number;
    valorLiquido?: number;
  };
}

// Aditivo de Renovação
export interface AditivoRenovacao {
  id: string;
  lojaId: string;
  contratoId: number;
  tipo: 'RENOVACAO';
  descricao: string;
  valor: number;
  periodo: '1' | '7' | '14' | '21' | '28';
  numPeriodos: number;
  novaDataInicio: string;
  novaDataFim: string;
  criadoEm: string;
}

// Título a receber (compatibilidade)
export interface Titulo {
  id: string;
  numero: string;
  contratoId: string | number;
  contrato?: Contrato;
  clienteId: string;
  cliente?: Cliente;
  aditivoId?: string; // Para títulos gerados por aditivo
  lojaId: string;
  categoria: string;
  subcategoria: string;
  emissao: string;
  vencimento: string;
  valor: number;
  pago: number;
  saldo: number;
  forma: 'Boleto' | 'PIX' | 'Cartão' | 'Dinheiro' | 'Transferência';
  status: 'Em aberto' | 'Parcial' | 'Quitado' | 'Vencido';
  origem: 'CONTRATO' | 'LOGISTICA' | 'ADITIVO';
  timeline: TimelineEvent[];
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

// Título a receber v2
export interface TituloReceber {
  id: string;
  lojaId: string;
  clienteId: string;
  contratoId?: number;
  descricao: string;
  valor: number;
  vencimentoISO: string;
  status: 'ABERTO' | 'PARCIAL' | 'QUITADO';
  createdAt: string;
}

// Aditivo v2
export interface Aditivo {
  id: string;
  lojaId: string;
  contratoId: number;
  tipo: 'TAXA_DESLOCAMENTO' | 'OUTRO';
  descricao: string;
  valor: number;
  tituloId?: string;
  criadoEm: string;
}

// Recebimento
export interface Recebimento {
  id: string;
  tituloId: string;
  titulo: Titulo;
  data: string;
  forma: 'Boleto' | 'PIX' | 'Cartão' | 'Dinheiro' | 'Transferência';
  valorBruto: number;
  desconto: number;
  jurosMulta: number;
  valorLiquido: number;
  observacoes?: string;
  usuario: string;
  createdAt: string;
}

// Fatura/Documento
export interface ItemFatura {
  id: string;
  descricao: string;
  quantidade: number;
  periodo: string;
  periodoInicio?: string;
  periodoFim?: string;
  numeroContrato?: string;
  preco: number;
  subtotal: number;
}

export interface Fatura {
  id: string;
  numero: string;
  contratoId: string;
  contrato: Contrato;
  clienteId: string;
  cliente: Cliente;
  emissao: string;
  vencimento: string;
  itens: ItemFatura[];
  subtotal: number;
  acrescimos: number;
  descontos: number;
  valor: number;
  valorFiscal: boolean;
  formaPreferida: 'Boleto' | 'PIX' | 'Cartão';
  observacoes?: string;
  // Compatibilidade com código existente
  dataVencimento: string;
  status: 'Em aberto' | 'Parcial' | 'Quitado' | 'Vencido';
  valorPago: number;
  dataPagamento?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusType {
  label: string;
  value: string;
  color: 'success' | 'warning' | 'destructive' | 'info' | 'secondary';
}

export interface KPI {
  titulo: string;
  valor: string;
  icone: string;
  variacao?: {
    percentual: number;
    periodo: string;
  };
}

// Aditivo Financeiro para Taxa de Deslocamento
export interface AditivoFinanceiro {
  id: string;
  contratoId: string;
  lojaId: string;
  tipo: 'SERVICO_TAXA';
  descricao: string;
  valor: number;
  justificativa?: string;
  criadoPor: string;
  createdAt: string;
}

// Configuração por Loja
export interface ConfigLoja {
  lojaId: string;
  cabecalhoDocumento: {
    logoUrl?: string;
    razao: string;
    cnpj: string;
    ie?: string;
    endereco: string;
    whatsapp: string;
  };
  taxaDeslocamentoPadrao?: number;
  templateContratoResumo?: {
    html: string;
  };
}

// Configuração de Taxa de Deslocamento por Loja
export interface TaxaDeslocamentoConfig {
  ativo: boolean;
  valorPadrao: number;
  obrigarJustificativaQuandoDiferir: boolean;
  permitirExclusao: boolean;
  textoDescricaoPadrao: string;
}

// Aging/Inadimplência types
export interface Template {
  id: string;
  nome: string;
  canal: 'WhatsApp' | 'Email';
  corpo: string;
}

export interface Aviso {
  id: string;
  clienteId: string;
  tituloId?: string;
  canal: 'WhatsApp' | 'Email';
  tipo: 'AUTO' | 'MANUAL';
  templateId: string;
  mensagem: string;
  enviadoEm: string;
  usuario: string;
  usuarioId: string;
  usuarioNome: string;
}

export interface ContatoCobranca {
  id: string;
  clienteId: string;
  tituloId?: string;
  tipo: 'Ligação' | 'WhatsApp' | 'Email' | 'Visita' | 'Outros';
  resultado: 'Sem contato' | 'Prometeu pagar' | 'Negociar' | 'Contestou' | 'Outro';
  observacao: string;
  proximoPasso?: string;
  data: string;
  usuario: string;
  usuarioId: string;
  usuarioNome: string;
}

// Evento de timeline atualizado com auditoria
export interface EventoTimeline {
  id: string;
  contratoId?: string;
  ts: number;
  usuarioId: string;
  usuarioNome: string;
  tipo: 'AVISO_AUTO' | 'AVISO_MANUAL' | 'CONTATO_MANUAL' | 'RENOVACAO' | 'DEVOLUCAO_CONFIRMADA' | 'ADITIVO_CRIADO' | 'ADITIVO_EDITADO' | 'ADITIVO_REMOVIDO' | 'ANEXO_ADICIONADO' | 'ANEXO_REMOVIDO';
  canal?: 'WhatsApp' | 'Email' | 'Ligação' | 'Visita' | 'Outros';
  resumo: string;
  // Para compatibilidade
  timestamp?: string;
  usuario?: string;
  descricao?: string;
  dados?: any;
}

export interface AditivoContratual {
  id: string;
  contratoId: string;
  numero: string; // Sequencial por contrato
  tipo: 'RENOVACAO' | 'DESCONTO' | 'TAXA' | 'OUTRO';
  valor: number; // Positivo = acréscimo, Negativo = desconto
  descricao: string;
  justificativa: string;
  vinculacao: 'CONTRATO' | 'ITEM';
  itemId?: string; // Se vinculação = ITEM
  tituloId?: string; // Se gerou título CR
  status: 'ATIVO' | 'CANCELADO';
  criadoPor: string;
  criadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

export interface AgingBucket {
  clienteId: string;
  cliente: Cliente;
  qtdeTitulosVencidos: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
  totalVencido: number;
  ultimoContato?: {
    ts: number;
    usuarioNome: string;
    canal?: string;
    dataFormatada: string;
  };
  proximaAcao?: string;
  titulosVencidos: Titulo[];
}

// Caixa do Dia
export interface MovimentoCaixa {
  id: string;
  ts: number;
  usuarioId: string;
  usuarioNome: string;
  tipo: 'Entrada' | 'Saída';
  forma: 'PIX' | 'Cartão' | 'Dinheiro' | 'Boleto' | 'Transferência';
  valorBruto: number;
  desconto: number;
  jurosMulta: number;
  valorLiquido: number;
  origem: string; // ex: "Recebimento título FAT-001" | "Despesa"
  refs?: {
    clienteId?: string;
    contratoId?: string;
    tituloId?: string;
  };
}

export interface FechamentoCaixa {
  apurado: {
    pix: number;
    cartao: number;
    dinheiro: number;
    boleto: number;
    transferencia: number;
  };
  esperado: {
    pix: number;
    cartao: number;
    dinheiro: number;
    boleto: number;
    transferencia: number;
  };
  diferencas: {
    pix: number;
    cartao: number;
    dinheiro: number;
    boleto: number;
    transferencia: number;
  };
  observacao?: string;
  fechadoEm: number;
}

export interface CaixaDoDia {
  id: string;
  dataISO: string;
  usuarioId: string;
  usuarioNome: string;
  status: 'Aberto' | 'Fechado';
  saldoInicial: number;
  observacaoAbertura?: string;
  abertoEm: number;
  movimentos: MovimentoCaixa[];
  fechamento?: FechamentoCaixa;
}

// Configurações
export interface EnderecoEmpresa {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
}

export interface CoresDocumento {
  primaria: string;
  secundaria: string;
}

export interface ConfiguracaoOrganizacao {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ie: string;
  isentoIE: boolean;
  emailFiscal: string;
  telefone: string;
  endereco: EnderecoEmpresa;
  logoUrl?: string;
  cores: CoresDocumento;
}

export interface ConfiguracaoSeguranca {
  politicaSenha: 'PADRAO' | 'FORTE';
  doisFatores: boolean;
  sessaoMinutos: number;
  exigirAceiteLGPD: boolean;
}

// Usuários e Perfis
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfilId: string;
  status: 'Ativo' | 'Inativo';
  ultimoAcesso?: string;
  lojasPermitidas: string[];
  lojaPadraoId?: string;
}

export interface PermissoesPerfil {
  clientes: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  equipamentos: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  contratos: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
    renovar: boolean;
    devolverSubstituir: boolean;
  };
  financeiro: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
    emitirFatura: boolean;
    receberPagamento: boolean;
  };
  inadimplencia: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
    enviarMensagens: boolean;
  };
  manutencaoOS: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  logistica: {
    ver: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  caixa: {
    ver: boolean;
    gerirCaixa: boolean;
  };
  configuracoes: {
    gerirConfiguracoes: boolean;
  };
}

export interface Perfil {
  id: string;
  nome: string;
  bloqueado?: boolean;
  permissoes: PermissoesPerfil;
}

// Centro de Custo
export interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  unidadeId?: string; // opcional - "global" se vazio
  ativo: boolean;
  parentId?: string; // para hierarquia (pai/filho)
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogAuditoria {
  id: string;
  ts: number;
  usuario: string;
  tipo: 'PERMISSAO_ATUALIZADA' | 'USUARIO_CRIADO' | 'USUARIO_EDITADO' | 'PERFIL_CRIADO' | 'CC_CRIADO' | 'CC_EDITADO' | 'CC_ATIVADO' | 'CC_DESATIVADO' | 'CC_EXCLUIDO' | 'CC_APLICADO_PARCELA' | 'CC_APLICADO_MOVIMENTO' | 'CC_AJUSTE_MOVIMENTO';
  meta?: {
    perfil?: string;
    diffResumido?: string;
    ccId?: string;
    parcelaId?: string;
    movimentoId?: string;
    antes?: any;
    depois?: any;
  };
}

// Parametrizações de Locação
export interface JanelaLogistica {
  nome: string;
  inicio: string;
  fim: string;
}

export interface ZonaFrete {
  zona: string;
  valor: number;
}

export interface ConfiguracaoLocacao {
  contrato: {
    renovacao: {
      modo: 'MANUAL' | 'ASSISTIDA';
      duracaoPadrao: 7 | 21 | 30;
      bloqueioInadimplente: boolean;
    };
    substituicao: {
      mesmoGrupo: boolean;
      preservarPreco: boolean;
    };
    devolucao: {
      parcial: boolean;
      liberaEstoque: boolean;
      toleranciaHoras: number;
    };
    checklist: {
      entregaObrigatoria: boolean;
      retornoObrigatorio: boolean;
      itensObrigatorios: string[];
    };
    bloqueios: {
      novosContratosSeInadimplente: boolean;
      wizardAviso: boolean;
    };
  };
  logistica: {
    janelas: JanelaLogistica[];
    prazoMinHoras: number;
    toleranciaInicioMin: number;
    toleranciaFimMin: number;
    responsavelObrigatorio: boolean;
    comprovanteDigital: boolean;
    fretePorZona: {
      habilitado: boolean;
      tabela: ZonaFrete[];
    };
  };
  manutencao: {
    status: string[];
    transicoes: Record<string, string[]>;
    motivosParada: string[];
    exigirFotoLaudo: boolean;
    acaoRapidaEquip: boolean;
  };
  prorata: {
    metodo: 'DIARIA_EXATA' | 'UM_TRIGESIMO';
    arredondamento: 0 | 2;
    faturamentoParcial: {
      permitir: boolean;
      adicionarDiferencas: boolean;
    };
    multaPercent: number;
    jurosDiaPercent: number;
  };
  automacao: {
    renovacaoAviso: boolean;
    devolucaoFatura: boolean;
    quitaDesbloqueio: boolean;
    recebimentoFocaCaixa: boolean;
    snackbarProximoPasso: boolean;
  };
}

export interface ConfiguracaoFinanceiro {
  formas: {
    ativas: string[];
    preferenciaPadrao: string;
    ordem: string[];
  };
  multaJuros: {
    multaPercent: number;
    jurosDiaPercent: number;
    carenciaDias: number;
    arredondamento: number;
    mensagemPadrao: string;
  };
  contas: {
    bancos: Array<{
      id: string;
      apelido: string;
      bancoNome: string;
      agencia: string;
      conta: string;
      tipo: "Corrente" | "Poupança";
    }>;
    chavePix: string;
    instrucaoTransferencia: string;
    mostrarNaFatura: boolean;
  };
  faturaPreferencias: {
    tipoPadrao: "DEMONSTRATIVO" | "FISCAL";
    vencimentoPadraoDias: number;
    mostrarQrPix: boolean;
    mostrarLinhaBoleto: boolean;
    mensagemCobrancaPadrao: string;
  };
  antiDuplicidade: AntiDuplicityConfig;
}

// Centros de Custo
export interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  unidadeId?: string;
  ativo: boolean;
  parentId?: string;
  obs?: string;
  createdAt: string;
  updatedAt: string;
}

// Anti-Duplicidade
export interface DuplicityMatch {
  id: string;
  tipo: 'BLOQUEANTE' | 'ALERTA' | 'INFO';
  motivo: 'fiscal' | 'exact' | 'strong' | 'parcela' | 'fuzzy';
  tituloId: string;
  unidadeId: string;
  fornecedorId: string;
  docTipo?: string;
  docNumero?: string;
  chaveFiscal44?: string;
  emissao: string;
  valorTotal: number;
  status: string;
  similarity?: number;
}

export interface DuplicityFingerprints {
  fpExact?: string;
  fpFiscal?: string;
  fpStrong?: string;
}

export interface DuplicityIndex {
  exact: Record<string, string[]>;
  fiscal: Record<string, string[]>;
  strong: Record<string, string[]>;
}

export interface AntiDuplicityConfig {
  habilitado: boolean;
  regras: {
    chaveFiscal: boolean;
    docNumeroValor: boolean;
    checagemForte: boolean;
    crossLoja: boolean;
    fuzzyMatching: boolean;
  };
  politica: {
    alertas: 'avisar' | 'justificar';
  };
  limites: {
    financeiro: number;
    gestor: number;
    admin: number;
  };
  mensagens: {
    bloqueante: string;
    alerta: string;
    info: string;
  };
}

// Fechamento Mensal
export interface LockFechamento {
  periodo: string; // "YYYY-MM"
  unidadeId: string;
  fechado: boolean;
  ts: number;
  usuario: {
    id: string;
    nome: string;
  };
  checklist?: {
    extratosConciliados: boolean;
    parcelasQuitadas: boolean;
    transferenciasConferidas: boolean;
    dreRevisado: boolean;
  };
  motivo?: string; // Para reabertura
}

// Logística
export interface TarefaLogistica {
  id: string;
  lojaId: string;
  tipo: 'ENTREGA' | 'RETIRADA' | 'SUPORTE';
  contratoId?: string;
  cliente: {
    nome: string;
    fone: string;
  };
  endereco: string;
  coordenadas?: {
    lat: number;
    lon: number;
  };
  previstoISO: string;
  duracaoMin: number;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  motoristaId?: string;
  veiculoId?: string;
  status: 'AGENDAR' | 'PROGRAMADO' | 'EM_ROTA' | 'CONCLUIDO' | 'REAGENDADO' | 'NAO_SAIU' | 'NAO_ENTREGUE' | 'CANCELADO';
  motivoFalha?: string;
  observacao?: string;
  historicoStatus?: EventoLogistica[];
  taxaDeslocamento?: number;
  checkins?: CheckinLogistica[];
  createdAt: string;
  updatedAt: string;
}

export interface LayoutOptions {
  modo: 'DETALHADO' | 'COMPACTO';
  ordenacao: 'HORA' | 'TIPO_HORA';
  mostrarTelefone: boolean;
  mostrarObservacoes: boolean;
  mostrarDuracao: boolean;
  mostrarPrioridade: boolean;
  quebrarPorTipo: boolean;
  cabecalhoEmTodas: boolean;
  marcaDagua: boolean;
}

export interface EventoLogistica {
  id: string;
  tarefaId: string;
  de?: string;
  para: string;
  ts: string;
  usuarioId: string;
  usuarioNome: string;
  observacao?: string;
}

export interface CheckinLogistica {
  id: string;
  tarefaId: string;
  lat: number;
  lon: number;
  ts: string;
  sucesso: boolean;
  motivoFalha?: string;
  offline: boolean;
  synced: boolean;
}

export interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cnh: string;
  ativo: boolean;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  capacidadeM3: number;
  capacidadeKg: number;
  ativo: boolean;
}

export interface ConfiguracaoLogisticaCompleta {
  base: {
    lat: number;
    lon: number;
    endereco: string;
  };
  jornada: {
    manha: { inicio: string; fim: string; };
    tarde: { inicio: string; fim: string; };
  };
  duracoesPadrao: {
    ENTREGA: Record<string, number>; // por tipo de equipamento
    RETIRADA: Record<string, number>;
    SUPORTE: Record<string, number>;
  };
  mensagensWhatsApp: {
    entrega: string;
    retirada: string;
    aviso: string;
  };
  motivosNaoSaida: string[];
  motivosNaoEntrega: string[];
  oferecerTaxaDeslocamento: boolean;
  tempoDeslocamentoUrbano: number; // minutos padrão
}

export interface LogisticaOfflineQueue {
  id: string;
  type: 'checkin' | 'status_update' | 'evento';
  data: any;
  timestamp: string;
  synced: boolean;
}


export interface SessionState {
  lojaAtivaId: string | null;
  lembraUltimaLoja: boolean;
  expiresAt?: number;
}

export interface AppConfig {
  organizacao: ConfiguracaoOrganizacao;
  seguranca: ConfiguracaoSeguranca;
  usuarios: Usuario[];
  perfis: Record<string, Perfil>;
  logsAuditoria: LogAuditoria[];
  lojas: Loja[];
  layoutDocumentos?: {
    contrato: any;
    os: any;
    fatura: any;
  };
  locacao?: ConfiguracaoLocacao;
  financeiro?: ConfiguracaoFinanceiro;
}

export interface LayoutOptions {
  modo: 'DETALHADO' | 'COMPACTO';
  ordenacao: 'HORA' | 'TIPO_HORA';
  mostrarTelefone: boolean;
  mostrarObservacoes: boolean;
  mostrarDuracao: boolean;
  mostrarPrioridade: boolean;
  quebrarPorTipo: boolean;
  cabecalhoEmTodas: boolean;
  marcaDagua: boolean;
}