import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function parseCurrency(value: string): number {
  // Remove formatting and convert to number
  const cleaned = value.replace(/[^\d,.-]/g, '');
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}
