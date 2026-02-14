export type AreaOficina = 'AMARELA' | 'VERMELHA' | 'AZUL' | 'VERDE' | 'CINZA';
export type StatusEstoque = 'DISPONIVEL' | 'RESERVADO' | 'MANUTENCAO' | 'BAIXADO';
export type StatusOS = 'EM_ANALISE' | 'AGUARD_PECA' | 'EM_REPARO' | 'EM_TESTE' | 'CONCLUIDA';
export type ClassDefeito = 'DESGASTE' | 'MAU_USO' | 'NA';
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface EquipOficina {
  id: string;
  codigo: string;
  modelo: string;
  serie: string;
  loja: string;
  statusEstoque: StatusEstoque;
  areaOficina: AreaOficina;
  contratoDevolucaoId?: string | null;
  fotoUrl?: string;
  timestamps: {
    entradaArea: string;
    updatedAt: string;
  };
}

export interface OSEvento {
  id: string;
  ts: string;
  user: string;
  action: string;
  payload?: any;
}

export interface ChecklistItemExec {
  idItem: string;
  titulo: string;
  critico: boolean;
  ok?: boolean;
  obs?: string;
  foto?: string;
}

export interface ChecklistExec {
  id: string;
  osId: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  itens: ChecklistItemExec[];
  testeMinOk: boolean;
  assinaturaMecanico: string;
  resultado: 'APTO' | 'NAO_APTO';
  dtFim: string;
}

export interface PedidoItem {
  cod: string;
  descr: string;
  qtd: number;
  custo?: number;
}

export type StatusPedido = 'RASCUNHO' | 'FINALIZADO' | 'COMPRADO' | 'PARCIAL' | 'TOTAL';

export interface PedidoPecas {
  id: string;
  osId: string;
  itens: PedidoItem[];
  status: StatusPedido;
  fornecedor?: string;
  nf?: string;
  dtPrevista?: string;
  dtRecebidaTotal?: string;
  anexos?: string[];
  classificacao?: ClassDefeito;
  justificativa?: string;
}

export interface OSOficina {
  id: string;
  equipamentoId: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  origem: 'POS_LOCACAO' | 'AUDITORIA' | 'SUPORTE';
  prioridade: Prioridade;
  SLA_horas: number;
  status: StatusOS;
  areaAtual: AreaOficina;
  laudoHtml?: string;
  fotos?: string[];
  videos?: string[];
  classificacaoDefeito?: ClassDefeito;
  contratoId?: string | null;
  usuarioRespId?: string | null;
  checklist?: ChecklistExec;
  pedido?: PedidoPecas;
  timeline: OSEvento[];
}

export interface ProdDia {
  data: string;
  loja: string;
  mecId?: string;
  auxId?: string;
  limpas: number;
  liberadas: number;
  aguardDiag: number;
  aguardPeca: number;
  suportes: number;
  andaimesLimpas: number;
  andaimesLiberadas: number;
  escorasLimpas: number;
  escorasLiberadas: number;
}

export interface ChecklistTemplate {
  id: string;
  modelo: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  itens: Array<{
    id: string;
    titulo: string;
    critico: boolean;
  }>;
}

export interface FiltrosArea {
  texto?: string;
  prioridade?: Prioridade;
  responsavel?: string;
  comOS?: boolean;
  comPedido?: boolean;
}

export interface EventBusEvent {
  type: string;
  payload: any;
  timestamp: string;
}