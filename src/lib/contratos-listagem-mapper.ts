/**
 * Mapeamento puro de linhas cruas do Supabase (`contratos` + `contrato_itens`
 * + `clientes`) para o view model consumido pela listagem de contratos e por
 * RenovarContratoModal.
 *
 * Extraído de `Contratos.tsx` para teste determinístico sem rede/banco.
 *
 * RELAY 34: o mapeamento antigo só entregava
 * { id, equipamentoId, quantidade, valorTotal } por item — sem
 * `preco_unitario` nem `periodo`, que RenovarContratoModal precisa para
 * calcular o valor da renovação (período × diária). O resultado era
 * renovação sempre em R$ 0,00, mesmo com o preço correto gravado no banco.
 */

export interface ContratoItemRow {
  id: string;
  equipamento_id: string | null;
  quantidade: number;
  preco_total: number;
  preco_unitario: number;
  periodo: string;
  modelo_id: string | null;
  grupo_id: string | null;
}

export interface ClienteRow {
  id?: string | null;
  nome?: string | null;
  razao_social?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
}

export interface ContratoListagemRow {
  id: string;
  numero: string;
  cliente_id: string;
  loja_id: string;
  status: string;
  data_inicio: string;
  data_fim: string | null;
  data_prevista_fim: string;
  valor_total: number;
  created_at: string;
  contrato_itens: ContratoItemRow[] | null;
  clientes: ClienteRow | null;
}

export interface ContratoListagemItem {
  id: string;
  equipamentoId: string | null;
  quantidade: number;
  valorTotal: number;
  preco_unitario: number;
  periodo: string;
  modeloId: string | null;
  grupoId: string | null;
}

export interface ContratoListagem {
  id: string;
  numero: string;
  clienteId: string;
  lojaId: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
  itens: ContratoListagemItem[];
  cliente: {
    id: string;
    nome: string;
    nomeRazao: string;
    documento: string;
  };
  createdAt: string;
}

export function mapContratosParaListagem(rows: ContratoListagemRow[]): ContratoListagem[] {
  return rows.map(c => ({
    id: c.id,
    numero: c.numero,
    clienteId: c.cliente_id,
    lojaId: c.loja_id,
    status: c.status,
    dataInicio: c.data_inicio,
    dataFim: c.data_fim || c.data_prevista_fim,
    valorTotal: Number(c.valor_total),
    itens: (c.contrato_itens || []).map(item => ({
      id: item.id,
      equipamentoId: item.equipamento_id,
      quantidade: item.quantidade,
      valorTotal: Number(item.preco_total),
      preco_unitario: Number(item.preco_unitario),
      periodo: item.periodo,
      modeloId: item.modelo_id,
      grupoId: item.grupo_id,
    })),
    cliente: {
      id: c.clientes?.id || c.cliente_id,
      nome: c.clientes?.nome || c.clientes?.razao_social || 'Cliente',
      nomeRazao: c.clientes?.nome || c.clientes?.razao_social || 'Cliente',
      documento: c.clientes?.cpf || c.clientes?.cnpj || '',
    },
    createdAt: c.created_at,
  }));
}
