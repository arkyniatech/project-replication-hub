// Tipos para Solicitação de Manutenção (SOL-MAN-2)

export type TipoSolicitacao = 'SUPORTE_CAMPO' | 'TROCA_COM_SUBSTITUICAO';

export type PrioridadeSolicitacao = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type StatusSolicitacao = 
  | 'ABERTA'
  | 'AGUARDANDO_RETIRADA'
  | 'EM_ROTA'
  | 'RECEBIDA_OFICINA'
  | 'EM_DIAGNOSTICO'
  | 'AGUARDANDO_PECA'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type JanelaPeriodo = 'MANHA' | 'TARDE' | 'COMERCIAL';

export type TipoAnexo = 'FOTO' | 'DOC';

export type TipoLaudo = 'DESGASTE' | 'MAU_USO' | 'OUTROS';

export interface SolicitacaoManutencao {
  id: string;
  loja_id: string;
  contrato_id: string;
  cliente_id: string;
  cliente_nome: string;
  tipo: TipoSolicitacao;
  prioridade: PrioridadeSolicitacao;
  sintomas: string;
  janela_data?: string; // ISO date
  janela_periodo?: JanelaPeriodo;
  assistente_sugestao?: {
    janela_sugerida?: string;
    prioridade_sugerida?: PrioridadeSolicitacao;
    observacoes?: string;
  };
  os_id?: string;
  substituto?: {
    modelo_id: string;
    equip_id?: string;
    qtd?: number;
  };
  laudo?: {
    tipo: TipoLaudo;
    conclusao: string;
    fotos?: string[];
    estimativa_valor?: number;
  };
  sla_horas?: number;
  status: StatusSolicitacao;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface SolicitacaoItem {
  id: string;
  solicitacao_id: string;
  tipo: 'SERIALIZADO' | 'SALDO';
  equip_id?: string;
  modelo_id: string;
  grupo_id: string;
  qtd: number;
  codigo_interno?: string;
}

export interface SolicitacaoTimeline {
  id: string;
  solicitacao_id: string;
  ts: string;
  user_id: string;
  acao: string;
  payload?: any;
}

export interface SolicitacaoAnexo {
  id: string;
  solicitacao_id: string;
  nome: string;
  tipo: TipoAnexo;
  path: string;
  size_bytes?: number;
  created_by: string;
  created_at: string;
}

export interface ManutEventBus {
  id: string;
  loja_id: string;
  solicitacao_id: string;
  tipo: 'CRIADA' | 'TROCA_CRIADA' | 'LAUDO_REGISTRADO' | 'ATUALIZAR_AGENDA' | 'NOTIFICAR_OFICINA';
  payload?: any;
  created_at: string;
}

// DTOs para criação/atualização
export interface CriarSolicitacaoDTO {
  loja_id: string;
  contrato_id: string;
  cliente_id: string;
  cliente_nome: string;
  tipo: TipoSolicitacao;
  prioridade: PrioridadeSolicitacao;
  sintomas: string;
  janela_data?: string;
  janela_periodo?: JanelaPeriodo;
  assistente_sugestao?: any;
  sla_horas?: number;
  itens: Array<{
    tipo: 'SERIALIZADO' | 'SALDO';
    equip_id?: string;
    modelo_id: string;
    grupo_id: string;
    qtd?: number;
    codigo_interno?: string;
  }>;
}

export interface MudarStatusDTO {
  id: string;
  status: StatusSolicitacao;
}

export interface RegistrarLaudoDTO {
  id: string;
  laudo: {
    tipo: TipoLaudo;
    conclusao: string;
    fotos?: string[];
    estimativa_valor?: number;
  };
}

export interface CriarOSDTO {
  id: string;
}

export interface AplicarSubstituicaoDTO {
  id: string;
  substituto: {
    modelo_id: string;
    equip_id?: string;
    qtd?: number;
  };
}

// Filtros
export interface FiltrosSolicitacao {
  loja_id?: string;
  status?: StatusSolicitacao | StatusSolicitacao[];
  prioridade?: PrioridadeSolicitacao | PrioridadeSolicitacao[];
  tipo?: TipoSolicitacao;
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: string;
  contrato_id?: string;
}

// View completa com relacionamentos
export interface SolicitacaoCompleta extends SolicitacaoManutencao {
  itens: SolicitacaoItem[];
  timeline: SolicitacaoTimeline[];
  anexos: SolicitacaoAnexo[];
}

// Helper para calcular SLA restante
export function calcularSLARestante(solicitacao: SolicitacaoManutencao): {
  horas: number;
  minutos: number;
  vencido: boolean;
  percentual: number;
} {
  if (!solicitacao.sla_horas) {
    return { horas: 0, minutos: 0, vencido: false, percentual: 0 };
  }

  const criacao = new Date(solicitacao.created_at);
  const agora = new Date();
  const decorrido = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60); // horas
  const restante = solicitacao.sla_horas - decorrido;

  const vencido = restante <= 0;
  const horas = Math.floor(Math.abs(restante));
  const minutos = Math.floor((Math.abs(restante) % 1) * 60);
  const percentual = Math.min(100, (decorrido / solicitacao.sla_horas) * 100);

  return { horas, minutos, vencido, percentual };
}

// Helper para obter cor do status
export function getStatusColor(status: StatusSolicitacao): string {
  const colors: Record<StatusSolicitacao, string> = {
    ABERTA: 'bg-blue-500',
    AGUARDANDO_RETIRADA: 'bg-yellow-500',
    EM_ROTA: 'bg-purple-500',
    RECEBIDA_OFICINA: 'bg-orange-500',
    EM_DIAGNOSTICO: 'bg-amber-500',
    AGUARDANDO_PECA: 'bg-gray-500',
    CONCLUIDA: 'bg-green-500',
    CANCELADA: 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500';
}

// Helper para obter cor da prioridade
export function getPrioridadeColor(prioridade: PrioridadeSolicitacao): string {
  const colors: Record<PrioridadeSolicitacao, string> = {
    BAIXA: 'bg-gray-400',
    MEDIA: 'bg-blue-500',
    ALTA: 'bg-orange-500',
    CRITICA: 'bg-red-600',
  };
  return colors[prioridade] || 'bg-gray-500';
}

// Helper para obter label do status
export function getStatusLabel(status: StatusSolicitacao): string {
  const labels: Record<StatusSolicitacao, string> = {
    ABERTA: 'Aberta',
    AGUARDANDO_RETIRADA: 'Aguardando Retirada',
    EM_ROTA: 'Em Rota',
    RECEBIDA_OFICINA: 'Recebida na Oficina',
    EM_DIAGNOSTICO: 'Em Diagnóstico',
    AGUARDANDO_PECA: 'Aguardando Peça',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
  };
  return labels[status] || status;
}
