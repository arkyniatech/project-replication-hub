import { TipoVeiculo, StatusVeiculo, TipoCombustivel, CriticidadeServico } from '@/types/veiculos';

// Validação de placa Mercosul (ABC1234 ou ABC1D23)
export function validatePlaca(placa: string): boolean {
  if (!placa) return false;
  
  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Formato antigo: ABC1234 (3 letras + 4 números)
  const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  
  // Formato Mercosul: ABC1D23 (3 letras + 1 número + 1 letra + 2 números)
  const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  
  return formatoAntigo.test(cleanPlaca) || formatoMercosul.test(cleanPlaca);
}

// Formatar placa para exibição
export function formatPlaca(placa: string): string {
  if (!placa) return '';
  
  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  if (cleanPlaca.length <= 7) {
    // Formato antigo: ABC-1234
    if (cleanPlaca.length >= 4) {
      return `${cleanPlaca.slice(0, 3)}-${cleanPlaca.slice(3)}`;
    }
  } else {
    // Formato Mercosul: ABC1D23
    if (cleanPlaca.length >= 7) {
      return `${cleanPlaca.slice(0, 3)}${cleanPlaca.slice(3, 4)}${cleanPlaca.slice(4, 5)}${cleanPlaca.slice(5, 7)}`;
    }
  }
  
  return cleanPlaca;
}

// Aplicar máscara de placa durante digitação
export function applyPlacaMask(value: string): string {
  const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  if (clean.length <= 3) {
    return clean;
  } else if (clean.length <= 4) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  } else if (clean.length <= 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  } else {
    // Mercosul: ABC1D23
    return `${clean.slice(0, 3)}${clean.slice(3, 4)}${clean.slice(4, 5)}${clean.slice(5, 7)}`;
  }
}

// Validar CNPJ básico
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return true; // CNPJ é opcional
  
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  return cleanCNPJ.length === 14;
}

// Formatar CNPJ
export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  
  const clean = cnpj.replace(/[^\d]/g, '');
  
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

// Labels para tipos
export const TIPO_VEICULO_LABELS: Record<TipoVeiculo, string> = {
  carro: 'Carro',
  moto: 'Moto',
  furgão: 'Furgão',
  caminhão: 'Caminhão',
};

export const STATUS_VEICULO_LABELS: Record<StatusVeiculo, string> = {
  OPERANDO: 'Operando',
  OFICINA: 'Oficina',
  BAIXADO: 'Baixado',
};

export const COMBUSTIVEL_LABELS: Record<TipoCombustivel, string> = {
  G: 'Gasolina',
  E: 'Etanol',
  D: 'Diesel',
  Flex: 'Flex',
};

export const CRITICIDADE_LABELS: Record<CriticidadeServico, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

// Cores para badges
export const STATUS_COLORS: Record<StatusVeiculo, string> = {
  OPERANDO: 'bg-green-100 text-green-800 border-green-200',
  OFICINA: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BAIXADO: 'bg-red-100 text-red-800 border-red-200',
};

export const CRITICIDADE_COLORS: Record<CriticidadeServico, string> = {
  BAIXA: 'bg-blue-100 text-blue-800 border-blue-200',
  MEDIA: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ALTA: 'bg-red-100 text-red-800 border-red-200',
};

// Estados do Brasil
export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Validar ano
export function validateAno(ano: number): boolean {
  const currentYear = new Date().getFullYear();
  return ano >= 1900 && ano <= currentYear + 1;
}

// Formatar odômetro
export function formatOdometro(km: number): string {
  return new Intl.NumberFormat('pt-BR').format(km) + ' km';
}

// Validar código interno (alfanumérico, sem espaços)
export function validateCodigoInterno(codigo: string): boolean {
  if (!codigo) return false;
  return /^[A-Z0-9]{2,20}$/i.test(codigo);
}