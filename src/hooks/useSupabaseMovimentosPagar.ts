// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calcularBaixaParcela,
  calcularBaixaTitulo,
} from "@/lib/contas-pagar-baixa";

export interface MovimentoPagar {
  id: string;
  parcela_id: string;
  titulo_id: string;
  conta_id: string;
  loja_id: string;
  data_pagamento: string;
  valor_bruto: number;
  juros: number;
  multa: number;
  desconto: number;
  valor_liquido: number;
  forma: string;
  comprovante_url?: string;
  observacoes?: string;
  created_by?: string;
  created_at: string;
}

/**
 * Baixa a parcela do movimento recém-inserido e recalcula o título.
 *
 * O recálculo do título relê TODAS as parcelas do titulo_id no banco. Custa um
 * select a mais por pagamento, e é deliberado: a lista da tela é filtrada por
 * loja, status e período, então somar o que está carregado gravaria um `pago`
 * menor que o real — apagando dinheiro já baixado. Coberto por teste em
 * contas-pagar-baixa.test.ts.
 */
async function baixarParcelaEPropagar(
  movimento: Pick<
    MovimentoPagar,
    "parcela_id" | "titulo_id" | "data_pagamento" | "valor_bruto" | "juros" | "multa" | "desconto"
  >
) {
  const lancamento = {
    valorBruto: movimento.valor_bruto,
    juros: movimento.juros,
    multa: movimento.multa,
    desconto: movimento.desconto,
  };

  // 1. estado atual da parcela — valor_pago acumula pagamentos anteriores
  const { data: parcela, error: erroParcela } = await supabase
    .from("parcelas_pagar")
    .select("id, valor, valor_pago")
    .eq("id", movimento.parcela_id)
    .single();

  if (erroParcela) throw erroParcela;

  const baixa = calcularBaixaParcela({
    valor: parcela?.valor ?? 0,
    valorPagoAtual: parcela?.valor_pago ?? 0,
    lancamento,
    dataPagamento: movimento.data_pagamento,
  });

  const { error: erroUpdateParcela } = await supabase
    .from("parcelas_pagar")
    .update(baixa)
    .eq("id", movimento.parcela_id);

  if (erroUpdateParcela) throw erroUpdateParcela;

  // 2. título: recalculado sobre todas as parcelas, já com a baixa acima
  const { data: parcelasDoTitulo, error: erroIrmas } = await supabase
    .from("parcelas_pagar")
    .select("valor, valor_pago")
    .eq("titulo_id", movimento.titulo_id);

  if (erroIrmas) throw erroIrmas;

  const { data: titulo, error: erroTitulo } = await supabase
    .from("titulos_pagar")
    .select("id, valor")
    .eq("id", movimento.titulo_id)
    .single();

  if (erroTitulo) throw erroTitulo;

  const baixaTitulo = calcularBaixaTitulo({
    valorTitulo: titulo?.valor ?? 0,
    parcelas: parcelasDoTitulo ?? [],
  });

  const { error: erroUpdateTitulo } = await supabase
    .from("titulos_pagar")
    .update(baixaTitulo)
    .eq("id", movimento.titulo_id);

  if (erroUpdateTitulo) throw erroUpdateTitulo;
}

export const useSupabaseMovimentosPagar = (parcelaId?: string) => {
  const queryClient = useQueryClient();

  const { data: movimentos, isLoading } = useQuery({
    queryKey: ["movimentos-pagar", parcelaId],
    queryFn: async () => {
      let query = supabase
        .from("movimentos_pagar")
        .select("*")
        .order("data_pagamento", { ascending: false });

      if (parcelaId) {
        query = query.eq("parcela_id", parcelaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MovimentoPagar[];
    },
    enabled: true,
  });

  const registrarPagamento = useMutation({
    /**
     * Insere o movimento E baixa a parcela E propaga para o título.
     *
     * Até o relay 63 isto era só o insert: o trigger que baixava a parcela foi
     * perdido quando a migration 20260407194359_ recriou movimentos_pagar, e a
     * função `atualizar_status_parcela` deixou de existir junto. O dinheiro
     * saía, o movimento gravava, e a parcela seguia aberta — no mês seguinte
     * ela reaparece e o fornecedor é pago duas vezes.
     *
     * Sem transação (ver contas-pagar-baixa.ts): se o insert passar e um dos
     * updates falhar, o estado fica inconsistente. Por isso a ordem é
     * movimento → parcela → título, do mais para o menos crítico, e o erro
     * sobe para quem chamou reportar.
     */
    mutationFn: async (movimento: Omit<MovimentoPagar, "id" | "created_at" | "valor_liquido">) => {
      const { data, error } = await supabase
        .from("movimentos_pagar")
        .insert(movimento)
        .select()
        .single();

      if (error) throw error;

      await baixarParcelaEPropagar(movimento);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimentos-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["parcelas-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["titulos-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      toast.success("Pagamento registrado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao registrar pagamento:", error);
      toast.error("Erro ao registrar pagamento: " + error.message);
    },
  });

  return {
    movimentos: movimentos || [],
    isLoading,
    registrarPagamento,
  };
};
