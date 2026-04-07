import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Inter webhook received:", JSON.stringify(body));

    const {
      codigoSolicitacao,
      nossoNumero,
      codigoEstadoAtual,
      situacao,
      valorNominal,
      valorTotalRecebido,
      dataHoraSituacao,
    } = body;

    if (!codigoSolicitacao) {
      return new Response(
        JSON.stringify({ error: "codigoSolicitacao é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Inter status
    const statusMap: Record<string, string> = {
      EMITIDO: "COBRANCA_EMITIDA",
      PAGO: "COBRANCA_PAGA",
      CANCELADO: "COBRANCA_CANCELADA",
      EXPIRADO: "COBRANCA_EXPIRADA",
      VENCIDO: "COBRANCA_EXPIRADA",
    };

    const situacaoInter = situacao || codigoEstadoAtual;
    const tipoEvento = statusMap[situacaoInter] || "DESCONHECIDO";

    // Try to find cobranca_inter by codigo_solicitacao
    const { data: cobranca } = await supabaseAdmin
      .from("cobrancas_inter")
      .select("id, titulo_id, loja_id, status")
      .eq("codigo_solicitacao", codigoSolicitacao)
      .maybeSingle();

    const lojaId = cobranca?.loja_id || null;

    // Insert webhook event
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from("inter_webhook_events")
      .insert({
        loja_id: lojaId,
        tipo: tipoEvento,
        codigo_solicitacao: codigoSolicitacao,
        nosso_numero: nossoNumero || null,
        status: situacaoInter || "UNKNOWN",
        valor: valorTotalRecebido || valorNominal || null,
        data_evento: dataHoraSituacao || new Date().toISOString(),
        payload: body,
        processado: false,
        tentativas: 0,
        titulo_id: cobranca?.titulo_id || null,
      })
      .select()
      .single();

    if (eventError) {
      console.error("Error inserting webhook event:", eventError);
    }

    // Process payment automatically
    if (cobranca && (situacaoInter === "PAGO")) {
      const valorRecebido = valorTotalRecebido || valorNominal || 0;
      console.log(`Auto-processing payment for titulo ${cobranca.titulo_id}, valor: ${valorRecebido}`);

      try {
        // 1. Update cobrancas_inter status
        await supabaseAdmin
          .from("cobrancas_inter")
          .update({
            status: "PAID",
            history: supabaseAdmin.rpc ? undefined : undefined, // handled below
          })
          .eq("id", cobranca.id);

        // Append history event
        const { data: currentCobranca } = await supabaseAdmin
          .from("cobrancas_inter")
          .select("history")
          .eq("id", cobranca.id)
          .single();

        const currentHistory = (currentCobranca?.history as any[]) || [];
        currentHistory.push({
          date: new Date().toISOString(),
          status: "PAID",
          description: `Pagamento confirmado via webhook Inter. Valor: R$ ${Number(valorRecebido).toFixed(2)}`,
          source: "webhook",
        });

        await supabaseAdmin
          .from("cobrancas_inter")
          .update({ status: "PAID", history: currentHistory })
          .eq("id", cobranca.id);

        // 2. Update titulo status
        const { data: titulo } = await supabaseAdmin
          .from("titulos")
          .select("valor, pago, saldo")
          .eq("id", cobranca.titulo_id)
          .single();

        if (titulo) {
          const novoPago = Number(titulo.pago || 0) + Number(valorRecebido);
          const novoSaldo = Math.max(0, Number(titulo.valor) - novoPago);
          const novoStatus = novoSaldo <= 0 ? "PAGO" : "PARCIAL";

          await supabaseAdmin
            .from("titulos")
            .update({
              status: novoStatus,
              pago: novoPago,
              saldo: novoSaldo,
            })
            .eq("id", cobranca.titulo_id);

          // 3. Create recebimento
          await supabaseAdmin
            .from("recebimentos")
            .insert({
              titulo_id: cobranca.titulo_id,
              loja_id: cobranca.loja_id,
              data: dataHoraSituacao || new Date().toISOString(),
              forma: "BOLETO_PIX_INTER",
              valor_bruto: Number(valorRecebido),
              desconto: 0,
              juros_multa: 0,
              valor_liquido: Number(valorRecebido),
              usuario: "webhook-inter",
              observacoes: `Pagamento automático via webhook Inter. Código: ${codigoSolicitacao}`,
            });

          console.log(`Titulo ${cobranca.titulo_id} updated to ${novoStatus}, recebimento created.`);
        }

        // 4. Mark webhook event as processed
        if (eventData?.id) {
          await supabaseAdmin
            .from("inter_webhook_events")
            .update({ processado: true })
            .eq("id", eventData.id);
        }
      } catch (processError) {
        console.error("Error processing payment:", processError);
        // Mark event with error
        if (eventData?.id) {
          await supabaseAdmin
            .from("inter_webhook_events")
            .update({
              erro: processError.message || "Erro ao processar pagamento",
              tentativas: 1,
              ultima_tentativa: new Date().toISOString(),
            })
            .eq("id", eventData.id);
        }
      }
    }

    // Handle CANCELADO/EXPIRADO
    if (cobranca && (situacaoInter === "CANCELADO" || situacaoInter === "EXPIRADO" || situacaoInter === "VENCIDO")) {
      const newStatus = situacaoInter === "CANCELADO" ? "CANCELLED" : "EXPIRED";
      console.log(`Updating cobranca ${cobranca.id} to ${newStatus}`);

      await supabaseAdmin
        .from("cobrancas_inter")
        .update({ status: newStatus })
        .eq("id", cobranca.id);

      if (eventData?.id) {
        await supabaseAdmin
          .from("inter_webhook_events")
          .update({ processado: true })
          .eq("id", eventData.id);
      }
    }

    return new Response(
      JSON.stringify({ received: true, event_id: eventData?.id, processed: !!cobranca }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Inter webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
