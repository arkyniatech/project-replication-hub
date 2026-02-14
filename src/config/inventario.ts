export const INVENTARIO_CFG = {
  LIMIAR_PERC: 0.10,      // 10%
  LIMIAR_UNIDADES: 5,     // mínimo absoluto
  PERFIS_PODEM_APROVAR: ['gestor', 'admin'],
  SENHA_GESTOR_MOCK: '1234'
} as const;

export type AcaoInventario = 
  | 'AJUSTAR_ESTOQUE'
  | 'INVESTIGAR' 
  | 'BAIXA_PATRIMONIAL';

export type TipoMovimento = 
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export type StatusDivergencia = 
  | 'PENDENTE'
  | 'EM_INVESTIGACAO'
  | 'AJUSTE_GERADO'
  | 'CONCLUIDO'
  | 'APROVACAO_PENDENTE';

export type StatusAjuste = 
  | 'PROPOSTO'
  | 'APROVADO'
  | 'REJEITADO';

export type MotivoAjuste = 
  | 'AJUSTE_CONTAGEM'
  | 'BAIXA'
  | 'CORRECAO_CADASTRO';

export const ACOES_LABELS: Record<AcaoInventario, string> = {
  AJUSTAR_ESTOQUE: 'Ajustar estoque',
  INVESTIGAR: 'Investigar',
  BAIXA_PATRIMONIAL: 'Baixa patrimonial'
};

export const STATUS_LABELS: Record<StatusDivergencia, string> = {
  PENDENTE: 'Pendente',
  EM_INVESTIGACAO: 'Em investigação',
  AJUSTE_GERADO: 'Ajuste gerado',
  CONCLUIDO: 'Concluído',
  APROVACAO_PENDENTE: 'Aprovação pendente'
};