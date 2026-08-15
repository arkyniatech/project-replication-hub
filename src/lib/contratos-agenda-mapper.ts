/**
 * Mapeamento puro de linhas cruas do Supabase (`contratos` + `contrato_itens`)
 * para o view model `Contrato` usado pela agenda de disponibilidade.
 *
 * Extraído de `contratosStore.syncFromStorage` para permitir teste
 * determinístico sem rede/banco.
 *
 * ATENÇÃO AO VOCABULÁRIO: as linhas de entrada vêm do BANCO, portanto
 * `controle` vale 'SERIE' | 'GRUPO'. O view model de saída usa o vocabulário
 * de TELA ('SERIALIZADO' | 'SALDO'). A tradução acontece aqui, via
 * `@/lib/controle-vocabulario` — ponto único.
 */
import { Contrato } from '@/types/disponibilidade';
import { controleDBParaTela, isControleSerieDB } from '@/lib/controle-vocabulario';

export interface ContratoItemRow {
  id?: string;
  equipamento_id?: string | null;
  modelo_id?: string | null;
  /** Vocabulário do BANCO: 'SERIE' | 'GRUPO'. */
  controle?: string | null;
  quantidade?: number | null;
}

export interface ClienteRow {
  nome?: string | null;
  razao_social?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
}

export interface ContratoRow {
  id: string | number;
  numero: string;
  loja_id: string;
  status?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  clientes?: ClienteRow | null;
  contrato_itens?: ContratoItemRow[] | null;
}

export function mapContratosParaAgenda(rows: ContratoRow[]): Contrato[] {
  return (rows || []).map(c => ({
    id: String(c.id),
    numero: c.numero,
    lojaId: c.loja_id,
    clienteNome: c.clientes?.nome || c.clientes?.razao_social || '',
    clienteDoc: c.clientes?.cpf || c.clientes?.cnpj || '',
    itens: (c.contrato_itens || []).map(item => ({
      // Item de série é um equipamento físico e único: preserva o vínculo.
      equipId: isControleSerieDB(item.controle)
        ? item.equipamento_id || undefined
        : undefined,
      modeloId: item.modelo_id || '',
      tipoControle: controleDBParaTela(item.controle),
      status: (c.status === 'ATIVO' ? 'LOCADO' : 'RESERVADO') as 'LOCADO' | 'RESERVADO',
      periodo: {
        inicio: c.data_inicio,
        fim: c.data_fim || c.data_inicio,
      },
    })),
  }));
}
