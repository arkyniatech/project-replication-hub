import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticação do webhook: segredo compartilhado na URL (?token=) ou no
    // header x-webhook-token. Enquanto INTER_WEBHOOK_TOKEN não estiver setado
    // nos secrets, aceita sem validar (modo transição) com aviso no log.
    const expectedToken = Deno.env.get("INTER_WEBHOOK_TOKEN");
    const gotToken = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-webhook-token");
    if (expectedToken) {
      if (gotToken !== expectedToken) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("INTER_WEBHOOK_TOKEN não configurado — webhook aceitando chamadas SEM validação (configure o secret!)");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

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
    // Não logar o payload inteiro (dados financeiros) — só o essencial
    console.log(`Inter webhook: ${codigoSolicitacao} -> ${situacao || codigoEstadoAtual}`);

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
      console.log(`Auto-processing payment for titulo ${cobranca.titulo_id}`);

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
          description: "Pagamento confirmado via webhook Inter.",
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
          // NUNCA confiar no valor vindo do payload: o teto é o saldo do
          // título no banco (evita quitar/inflar título com valor forjado).
          const saldoAtual = Math.max(0, Number(titulo.valor) - Number(titulo.pago || 0));
          const valorInformado = Number(valorTotalRecebido || valorNominal || 0);
          const valorRecebido = valorInformado > 0 ? Math.min(valorInformado, saldoAtual) : saldoAtual;
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

    // Resposta genérica: não confirmar se o código existe (evita enumeração)
    return new Response(
      JSON.stringify({ received: true }),
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
