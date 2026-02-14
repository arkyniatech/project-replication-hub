import type { Pessoa } from '../types';

/**
 * Converte dados do banco (snake_case) para a UI (camelCase)
 */
export function toPessoaUI(dbPessoa: any): Pessoa {
  return {
    id: dbPessoa.id,
    nome: dbPessoa.nome,
    cpf: dbPessoa.cpf,
    email: dbPessoa.email || '',
    telefone: dbPessoa.telefone || '',
    matricula: dbPessoa.matricula || '',
    cargo: dbPessoa.cargo || '',
    lojaId: dbPessoa.loja_id || '',
    ccId: dbPessoa.cc_id || '',
    situacao: dbPessoa.situacao,
    admissaoISO: dbPessoa.admissao_iso || new Date().toISOString().split('T')[0],
    salario: dbPessoa.salario,
    endereco: dbPessoa.observacoes || '',
    // Campos não mapeados ainda no banco
    nascimento: undefined,
    docs: [],
    beneficios: [],
    movimentos: []
  };
}

/**
 * Converte dados da UI (camelCase) para o banco (snake_case)
 */
export function toPessoaDB(uiPessoa: Partial<Pessoa>): any {
  const dbData: any = {};
  
  if (uiPessoa.nome !== undefined) dbData.nome = uiPessoa.nome;
  if (uiPessoa.cpf !== undefined) dbData.cpf = uiPessoa.cpf;
  if (uiPessoa.email !== undefined) dbData.email = uiPessoa.email;
  if (uiPessoa.telefone !== undefined) dbData.telefone = uiPessoa.telefone;
  if (uiPessoa.matricula !== undefined) dbData.matricula = uiPessoa.matricula;
  if (uiPessoa.cargo !== undefined) dbData.cargo = uiPessoa.cargo;
  if (uiPessoa.lojaId !== undefined) dbData.loja_id = uiPessoa.lojaId;
  if (uiPessoa.ccId !== undefined) dbData.cc_id = uiPessoa.ccId;
  if (uiPessoa.situacao !== undefined) dbData.situacao = uiPessoa.situacao;
  if (uiPessoa.admissaoISO !== undefined) dbData.admissao_iso = uiPessoa.admissaoISO;
  if (uiPessoa.salario !== undefined) dbData.salario = uiPessoa.salario;
  if (uiPessoa.endereco !== undefined) dbData.observacoes = uiPessoa.endereco;
  
  return dbData;
}
