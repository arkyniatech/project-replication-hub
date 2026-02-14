import { generateNumber, type SeriesConfig } from "@/lib/numeracao";
import { useCallback } from "react";
import { toast } from "sonner";

export function useNumeracao() {
  const gerarNumero = useCallback((tipo: keyof SeriesConfig['tipos'], unidade?: string) => {
    try {
      return generateNumber(tipo, unidade);
    } catch (error) {
      console.error('Erro ao gerar número:', error);
      toast.error("Erro ao gerar número do documento", {
        description: "Verifique as configurações de numeração."
      });
      // Fallback para número simples
      return `${tipo.toUpperCase()}-${Date.now()}`;
    }
  }, []);

  return {
    gerarNumero
  };
}