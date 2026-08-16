import { generateNumber, TIPOS_NUMERADOS_NO_SERVIDOR, type SeriesConfig } from "@/lib/numeracao";
import { useCallback } from "react";
import { toast } from "sonner";

export function useNumeracao() {
  const gerarNumero = useCallback((tipo: keyof SeriesConfig['tipos'], unidade?: string) => {
    // titulo e fatura não têm fallback: o número vem do servidor. Mascarar o erro
    // com `${tipo}-${Date.now()}` gravaria um número fora da sequência da loja —
    // e esse valor vira seuNumero no boleto do Inter.
    //
    // A chamada abaixo é IDÊNTICA à do try por design: o objetivo é justamente
    // pular o catch e deixar o erro propagar. Não "simplifique" unindo os dois.
    if (TIPOS_NUMERADOS_NO_SERVIDOR.has(tipo)) {
      return generateNumber(tipo, unidade);
    }

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