import { z } from 'zod';

/**
 * Validação de CPF (algoritmo completo)
 */
export function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // 000.000.000-00, 111.111.111-11, etc.
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
}

/**
 * Validação de CNPJ (algoritmo completo)
 */
export function validarCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Schema de validação para formulário de Pessoa (RH)
 */
export const pessoaSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato 000.000.000-00")
    .refine(validarCPF, "CPF inválido"),
  
  email: z.string()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .toLowerCase()
    .trim(),
  
  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone deve estar no formato (00) 00000-0000")
    .optional()
    .or(z.literal('')),
  
  matricula: z.string()
    .trim()
    .max(50, "Matrícula muito longa")
    .optional()
    .or(z.literal('')),
  
  cargo: z.string()
    .trim()
    .min(2, "Cargo deve ter no mínimo 2 caracteres")
    .max(100, "Cargo muito longo"),
  
  lojaId: z.string()
    .uuid("Loja inválida"),
  
  ccId: z.string()
    .uuid("Centro de custo inválido")
    .optional()
    .or(z.literal('')),
  
  situacao: z.enum(['ativo', 'inativo', 'ferias', 'afastado']),
  
  admissaoISO: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .refine((date) => {
      const parsed = new Date(date);
      return parsed <= new Date(); // Não pode ser futura
    }, "Data de admissão não pode ser futura"),
  
  salario: z.number()
    .positive("Salário deve ser positivo")
    .max(999999.99, "Salário muito alto")
    .optional(),
  
  endereco: z.string()
    .max(500, "Endereço muito longo")
    .optional()
    .or(z.literal(''))
});

/**
 * Schema de validação para formulário de Cliente
 */
export const clienteSchema = z.object({
  tipo: z.enum(['PF', 'PJ']),
  
  // Pessoa Física
  nome: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo")
    .optional(),
  
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido")
    .refine(validarCPF, "CPF inválido")
    .optional(),
  
  // Pessoa Jurídica
  razaoSocial: z.string()
    .trim()
    .min(3, "Razão social deve ter no mínimo 3 caracteres")
    .max(200, "Razão social muito longa")
    .optional(),
  
  nomeFantasia: z.string()
    .trim()
    .max(200, "Nome fantasia muito longo")
    .optional(),
  
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido")
    .refine(validarCNPJ, "CNPJ inválido")
    .optional(),
  
  email: z.string()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .toLowerCase()
    .trim(),
  
  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido")
    .optional()
    .or(z.literal('')),
  
  cep: z.string()
    .regex(/^\d{5}-\d{3}$/, "CEP inválido")
    .optional()
    .or(z.literal('')),
});

/**
 * Schema de validação para valores monetários
 */
export const valorMonetarioSchema = z.number()
  .positive("Valor deve ser positivo")
  .max(9999999.99, "Valor muito alto")
  .refine((val) => {
    // Validar até 2 casas decimais
    return /^\d+(\.\d{1,2})?$/.test(val.toString());
  }, "Valor deve ter no máximo 2 casas decimais");

export type PessoaFormData = z.infer<typeof pessoaSchema>;
export type ClienteFormData = z.infer<typeof clienteSchema>;
