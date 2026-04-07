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

    // Inter webhook payload format
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

    // Map Inter status to our event type
    const statusMap: Record<string, string> = {
      EMITIDO: "COBRANCA_EMITIDA",
      PAGO: "COBRANCA_PAGA",
      CANCELADO: "COBRANCA_CANCELADA",
      EXPIRADO: "COBRANCA_EXPIRADA",
      VENCIDO: "COBRANCA_EXPIRADA",
    };

    const tipoEvento = statusMap[situacao || codigoEstadoAtual] || "DESCONHECIDO";

    // Try to find which loja this belongs to by checking existing webhook events
    // or by the nossoNumero pattern
    let lojaId: string | null = null;

    // Insert webhook event
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from("inter_webhook_events")
      .insert({
        loja_id: lojaId,
        tipo: tipoEvento,
        codigo_solicitacao: codigoSolicitacao,
        nosso_numero: nossoNumero || null,
        status: situacao || codigoEstadoAtual || "UNKNOWN",
        valor: valorTotalRecebido || valorNominal || null,
        data_evento: dataHoraSituacao || new Date().toISOString(),
        payload: body,
        processado: false,
        tentativas: 0,
      })
      .select()
      .single();

    if (eventError) {
      console.error("Error inserting webhook event:", eventError);
    }

    // Try to update titulo status if we can find it
    // Look for titulo with matching codigoSolicitacao in observacoes or timeline
    if (situacao === "PAGO" || codigoEstadoAtual === "PAGO") {
      console.log(`Payment confirmed for ${codigoSolicitacao}, valor: ${valorTotalRecebido}`);
      // Future: auto-update titulo status to PAGO
    }

    return new Response(
      JSON.stringify({ received: true, event_id: eventData?.id }),
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
