/**
 * Regras do checklist de OS, isoladas da UI para poderem ser testadas.
 *
 * Duas formas convivem e NÃO devem ser unificadas:
 *   - template  (`checklist_templates.itens`): { id, titulo, critico }
 *   - execução  (`ordens_servico.checklist`) : { idItem, titulo, critico, ok?, ... }
 *
 * `ChecklistItemExec` é o que `liberarParaVerde` consome e valida hoje
 * (useSupabaseOrdensServico.ts:317). Renomear seria mexer num contrato que
 * funciona, então a divergência fica explícita aqui, no mapeamento, em vez de
 * escondida atrás de um nome só.
 */
import type { ChecklistItemExec, ChecklistExec } from '@/modules/manutencao/types';

/** Item como o template o guarda. `id` — não `idItem`. */
export interface ChecklistTemplateItem {
  id: string;
  titulo: string;
  critico: boolean;
}

export type TipoChecklist = 'PREVENTIVA' | 'CORRETIVA';

export interface ChecklistTemplateRow {
  id: string;
  /** NULL = template genérico, aplicável a qualquer modelo. */
  modelo_id?: string | null;
  tipo: TipoChecklist;
  itens: ChecklistTemplateItem[];
  ativo: boolean;
}

/**
 * Converte itens do template em itens de execução: `id` -> `idItem`.
 * Uma linha, visível, em vez de duas estruturas que se parecem e divergem.
 */
export function templateParaItensExec(
  itens: ChecklistTemplateItem[] | null | undefined,
): ChecklistItemExec[] {
  if (!Array.isArray(itens)) return [];
  return itens.map((item) => ({
    idItem: item.id,
    titulo: item.titulo,
    critico: !!item.critico,
    ok: false,
  }));
}

/**
 * Escolhe o template para uma OS. Específico do modelo ganha do genérico —
 * o genérico é a rede de segurança para o dia um, não a primeira escolha.
 * Retorna null quando não há nenhum aplicável: a tela precisa avisar, e não
 * mostrar um checklist vazio que o mecânico assinaria sem perceber.
 */
export function selecionarTemplate(
  templates: ChecklistTemplateRow[] | null | undefined,
  tipo: TipoChecklist,
  modeloId?: string | null,
): ChecklistTemplateRow | null {
  if (!Array.isArray(templates) || templates.length === 0) return null;

  const doTipo = templates.filter((t) => t.ativo !== false && t.tipo === tipo);
  if (doTipo.length === 0) return null;

  if (modeloId) {
    const especifico = doTipo.find((t) => t.modelo_id === modeloId);
    if (especifico) return especifico;
  }

  return doTipo.find((t) => !t.modelo_id) ?? null;
}

/** Motivo pelo qual a liberação está bloqueada, ou null se pode liberar. */
export type MotivoBloqueio =
  | 'SEM_CHECKLIST'
  | 'CRITICO_PENDENTE'
  | 'TESTE_PENDENTE'
  | 'NAO_APTO';

/**
 * Espelha a validação de `liberarParaVerde` para que a tela possa desabilitar
 * o botão e dizer o porquê, em vez de deixar o mecânico descobrir pelo toast
 * de erro. A mutation continua sendo a autoridade — isto é a antecipação dela.
 */
export function motivoBloqueioLiberacao(
  checklist: Partial<ChecklistExec> | null | undefined,
): MotivoBloqueio | null {
  if (!checklist || !Array.isArray(checklist.itens) || checklist.itens.length === 0) {
    return 'SEM_CHECKLIST';
  }

  const criticosOk = checklist.itens
    .filter((item) => item.critico)
    .every((item) => item.ok === true);
  if (!criticosOk) return 'CRITICO_PENDENTE';

  if (!checklist.testeMinOk) return 'TESTE_PENDENTE';
  if (checklist.resultado !== 'APTO') return 'NAO_APTO';

  return null;
}

export const ROTULO_BLOQUEIO: Record<MotivoBloqueio, string> = {
  SEM_CHECKLIST: 'Registre o checklist antes de liberar o equipamento.',
  CRITICO_PENDENTE: 'Há itens críticos não aprovados no checklist.',
  TESTE_PENDENTE: 'O teste mínimo ainda não foi marcado como OK.',
  NAO_APTO: 'O checklist concluiu que o equipamento não está apto.',
};
