import { parseMoneyBR } from './equipamentos-utils';

// #9.12: extraído de NovoEquipamento.tsx para ficar testável.
//
// A regra que motivou a extração: `codigo` NÃO é validado. codigo_interno é
// gerado pelo trigger trg_num_equipamento no INSERT, o formulário não tem input
// editável ligado a ele, e não existe bloco que renderize errors.codigo. Exigir
// o campo aqui trava o submit sem dar ao usuário nenhum caminho de correção —
// foi exatamente o que aconteceu quando a geração no cliente foi removida.
//
// Invariante: todo erro devolvido precisa corresponder a um campo que o usuário
// consegue editar na tela.
export interface EquipamentoFormValidavel {
  grupoId: string;
  modeloId: string;
  nome: string;
  valorIndenizacao: string;
  lojaId: string;
  quantidade: string;
  tipoControle: 'SERIALIZADO' | 'SALDO';
}

export function validarEquipamentoForm(
  formData: EquipamentoFormValidavel
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!formData.grupoId) {
    errors.grupoId = 'Grupo é obrigatório';
  }

  if (!formData.modeloId) {
    errors.modeloId = 'Modelo é obrigatório';
  }

  if (!formData.nome.trim()) {
    errors.nome = 'Nome/Descrição é obrigatório';
  }

  if (!formData.valorIndenizacao.trim() || parseMoneyBR(formData.valorIndenizacao) <= 0) {
    errors.valorIndenizacao = 'Valor de indenização é obrigatório';
  }

  if (!formData.lojaId) {
    errors.lojaId = 'Loja/Localização é obrigatória';
  }

  // Quantidade só faz sentido no controle por saldo/grupo
  if (formData.tipoControle === 'SALDO') {
    const quantidade = parseInt(formData.quantidade);
    if (!quantidade || quantidade <= 0) {
      errors.quantidade = 'Quantidade é obrigatória para controle por saldo';
    }
  }

  return errors;
}
