export type TipoVeiculo = 'carro' | 'moto' | 'furgão' | 'caminhão';
export type StatusVeiculo = 'OPERANDO' | 'OFICINA' | 'BAIXADO';
export type TipoCombustivel = 'G' | 'E' | 'D' | 'Flex';
export type CriticidadeServico = 'BAIXA' | 'MEDIA' | 'ALTA';

export interface Veiculo {
  id: string;
  placa: string;
  codigo_interno: string;
  fabricante: string;
  modelo: string;
  tipo: TipoVeiculo;
  ano_fab: number;
  ano_mod: number;
  combustivel: TipoCombustivel;
  cap_tanque_l: number;
  odometro_atual: number;
  loja_id: string;
  status: StatusVeiculo;
  motorista_atual_id?: string;
  observacao?: string;
  criado_emISO: string;
}

export interface Posto {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  cnpj?: string;
  obs?: string;
}

export interface Oleo {
  id: string;
  tipo_especificacao: string;
  intervalo_km: number;
  intervalo_meses: number;
  obs?: string;
}

export interface Oficina {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  contato?: string;
  obs?: string;
  servicos_ids: string[];
}

export interface Servico {
  id: string;
  grupo: string;
  servico_especifico: string;
  criticidade: CriticidadeServico;
  obs?: string;
}

export interface VeiculoConfig {
  id: string;
  veiculo_id: string;
  oleo_id: string;
  desde_dataISO: string;
}

// Lançamentos operacionais
export interface Manutencao {
  id: string;
  veiculo_id: string;
  oficina_id: string;
  data_abertura: string;
  grupo_id: string;
  servico_id: string;
  descricao?: string;
  km_entrada?: number;
  dt_entradaISO?: string;
  km_saida?: number;
  dt_saidaISO?: string;
  custo_pecas?: number;
  custo_mo?: number;
  status: 'ABERTA' | 'CONCLUIDA';
  tempo_parado_h: number;
}

export interface Abastecimento {
  id: string;
  veiculo_id: string;
  data: string;
  posto_id: string;
  preco_litro: number;
  litros: number;
  km_atual: number;
  km_percorrido: number;
  km_por_l: number;
  custo_por_km: number;
  flags_json?: string;
}

export interface TrocaOleo {
  id: string;
  veiculo_id: string;
  data: string;
  oleo_id: string;
  trocou_filtro: boolean;
  trocou_filtro_combustivel: boolean;
  custo_total: number;
  km_atual: number;
  km_desde_ultima: number;
}

export interface FiltrosVeiculos {
  busca?: string;
  loja_id?: string;
  status?: StatusVeiculo;
  tipo?: TipoVeiculo;
  uf?: string;
}

export interface FiltrosPostos {
  busca?: string;
  uf?: string;
}

export interface FiltrosOficinas {
  busca?: string;
  uf?: string;
}