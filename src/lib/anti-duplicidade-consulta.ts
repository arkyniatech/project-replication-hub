/**
 * Relay 70 — consulta de duplicidade NO BANCO.
 *
 * Substitui o `dupSearch` de anti-duplicity-utils.ts, que lia um índice em
 * `localStorage['cp.dupIndex']` e comparava contra `localStorage['titulosPagar']`
 * — nenhum dos dois jamais escrito por código nenhum, então a função devolvia
 * `[]` em toda execução desde sempre.
 *
 * PAPÉIS: esta consulta é para EXPLICAR, a constraint é para DECIDIR.
 * O usuário precisa ver QUAL título colidiu antes de tentar salvar; é o que
 * transforma "não deu certo" em "esta nota é a NF 12345 de março". Mas quem
 * garante a regra é o índice único da migration 20260821170000: entre esta
 * consulta e o insert cabe outro usuário salvando a mesma nota, e a consulta
 * também pode ser barrada por RLS sem que isso libere nada. Se a consulta
 * falhar, o fluxo segue e o banco decide — nunca o contrário.
 */
import { supabase } from '@/integrations/supabase/client';
import { DuplicityMatch } from '@/types';
import {
  DocumentoTitulo,
  normalizeDocNumber,
  chaveFiscalIndexavel,
} from './anti-duplicidade';

/**
 * Colunas necessárias para montar o DuplicityMatch que o modal consome.
 *
 * `*` em vez da lista explícita porque `src/integrations/supabase/types.ts` é
 * gerado a partir do banco e ainda não conhece doc_tipo/doc_numero/
 * chave_fiscal_44 — a migration 20260821170000 não foi aplicada. Nomear as
 * colunas faria o tipo gerado recusar a query em tempo de compilação. Depois
 * de aplicar a migration e regerar os tipos, dá para trocar por lista
 * explícita; até lá o cast abaixo é a fronteira.
 */
const COLUNAS_MATCH = '*';

interface LinhaTitulo {
  id: string;
  loja_id: string | null;
  fornecedor_id: string | null;
  numero: string | null;
  valor: number | null;
  emissao: string | null;
  status: string | null;
  doc_tipo: string | null;
  doc_numero: string | null;
  chave_fiscal_44: string | null;
}

function paraMatch(
  linha: LinhaTitulo,
  tipo: DuplicityMatch['tipo'],
  motivo: string
): DuplicityMatch {
  return {
    id: `match-${linha.id}`,
    tipo,
    motivo: motivo as DuplicityMatch['motivo'],
    tituloId: linha.id,
    unidadeId: linha.loja_id ?? '',
    fornecedorId: linha.fornecedor_id ?? '',
    docTipo: linha.doc_tipo ?? '',
    docNumero: linha.doc_numero ?? '',
    chaveFiscal44: linha.chave_fiscal_44 ?? undefined,
    emissao: linha.emissao ?? '',
    valorTotal: Number(linha.valor ?? 0),
    status: (linha.status ?? '') as DuplicityMatch['status'],
    numero: linha.numero ?? undefined,
  };
}

export interface EntradaConsultaDuplicidade extends DocumentoTitulo {
  /** Título sendo editado: não deve casar consigo mesmo. */
  idAtual?: string | null;
}

/**
 * Procura títulos que colidem com o que está sendo lançado.
 *
 * Devolve BLOQUEANTE para o que a constraint vai recusar de fato — é o que o
 * modal mostra. Não existe categoria "forçável": o índice é UNIQUE duro e a
 * tela não oferece saída que o banco não honraria.
 *
 * Não filtra por loja de propósito. A mesma nota lançada na loja 001 e de novo
 * na 002 é o cenário que motivou o relay, e a constraint também é global — se
 * esta consulta filtrasse por loja, ela deixaria de enxergar exatamente a
 * colisão que o insert vai sofrer.
 */
export async function buscarDuplicidades(
  entrada: EntradaConsultaDuplicidade
): Promise<DuplicityMatch[]> {
  const matches: DuplicityMatch[] = [];
  const vistos = new Set<string>();

  const registrar = (linhas: LinhaTitulo[] | null, motivo: string) => {
    for (const linha of linhas ?? []) {
      if (linha.id === entrada.idAtual) continue;
      if (vistos.has(linha.id)) continue;
      vistos.add(linha.id);
      matches.push(paraMatch(linha, 'BLOQUEANTE', motivo));
    }
  };

  const chaveFiscal = chaveFiscalIndexavel(entrada.chaveFiscal44);
  if (chaveFiscal) {
    // Compara pela chave inteira. A normalização (só dígitos) é aplicada aos
    // dois lados: o valor gravado pode ter sido digitado com espaços.
    const { data, error } = await supabase
      .from('titulos_pagar')
      .select(COLUNAS_MATCH)
      .not('chave_fiscal_44', 'is', null);

    if (!error) {
      // Cast via unknown: ver COLUNAS_MATCH. O tipo gerado ainda descreve a
      // tabela sem as tres colunas do relay 70.
      const iguais = (data as unknown as LinhaTitulo[] | null)?.filter(
        (linha) => chaveFiscalIndexavel(linha.chave_fiscal_44) === chaveFiscal
      );
      registrar(iguais ?? null, 'fiscal');
    }
  }

  const numeroNormalizado = normalizeDocNumber(entrada.docNumero);
  if (numeroNormalizado && entrada.fornecedorId) {
    // Filtra no banco pelo que é indexado (fornecedor + tipo) e compara o
    // número já normalizado no cliente, com a MESMA função que o índice
    // reproduz em SQL — ver normalizarComoSQL e o teste que compara as duas.
    const tipo = entrada.docTipo?.trim() ?? '';

    const { data, error } = await supabase
      .from('titulos_pagar')
      .select(COLUNAS_MATCH)
      .eq('fornecedor_id', entrada.fornecedorId);

    if (!error) {
      // doc_tipo e doc_numero sao comparados no cliente pelo mesmo motivo do
      // cast acima: o tipo gerado ainda nao os conhece, entao `.eq('doc_tipo')`
      // nao compila. O filtro por fornecedor ja reduz o conjunto, e a decisao
      // real e do indice unico de qualquer forma.
      const iguais = (data as unknown as LinhaTitulo[] | null)?.filter(
        (linha) =>
          (linha.doc_tipo ?? '') === tipo &&
          normalizeDocNumber(linha.doc_numero) === numeroNormalizado
      );
      registrar(iguais ?? null, 'exact');
    }
  }

  return matches;
}

/**
 * Localiza o título que colidiu, para nomeá-lo na mensagem de erro do 23505.
 *
 * Devolve null em qualquer falha: a mensagem sem a referência ainda está
 * certa, e um erro aqui não pode virar um segundo erro na frente do usuário.
 */
export async function localizarTituloEmConflito(
  entrada: EntradaConsultaDuplicidade
): Promise<{ numero?: string | null } | null> {
  try {
    const matches = await buscarDuplicidades(entrada);
    const primeiro = matches[0];
    return primeiro ? { numero: primeiro.numero ?? primeiro.docNumero } : null;
  } catch {
    return null;
  }
}
