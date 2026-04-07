import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API = {
  sandbox: "https://cdpj.partners.bancointer.com.br",
  producao: "https://cdpj.partners.bancointer.com.br",
};

const INTER_OAUTH = {
  sandbox: "https://cdpj.partners.bancointer.com.br/oauth/v2/token",
  producao: "https://cdpj.partners.bancointer.com.br/oauth/v2/token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, loja_id, payload } = body;

    if (!action || !loja_id) {
      return new Response(
        JSON.stringify({ error: "action e loja_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify access
    const { data: access } = await supabaseAdmin
      .from("user_lojas_permitidas")
      .select("loja_id")
      .eq("user_id", userId)
      .eq("loja_id", loja_id)
      .maybeSingle();

    const { data: isMaster } = await supabaseAdmin.rpc("is_master", { _user_id: userId });

    if (!access && !isMaster) {
      return new Response(
        JSON.stringify({ error: "Sem acesso a esta loja" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // save-credentials doesn't need existing creds
    if (action === "save-credentials") {
      const result = await saveCredentials(supabaseAdmin, loja_id, userId, payload);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get credentials for this loja
    const { data: creds, error: credsError } = await supabaseAdmin
      .from("inter_credentials")
      .select("*")
      .eq("loja_id", loja_id)
      .eq("ativo", true)
      .maybeSingle();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ error: "Credenciais Inter não configuradas para esta loja" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    switch (action) {
      case "test-connection":
        result = await testConnection(creds);
        break;
      case "emitir-boleto":
        result = await emitirBoleto(creds, payload);
        break;
      case "consultar-boleto":
        result = await consultarBoleto(creds, payload.codigoSolicitacao);
        break;
      case "cancelar-boleto":
        result = await cancelarBoleto(creds, payload.codigoSolicitacao, payload.motivo);
        break;
      case "get-pdf":
        result = await getPdf(creds, payload.codigoSolicitacao);
        break;
      case "criar-pix":
        result = await criarPixCobranca(creds, payload);
        break;
      case "consultar-pix-cobranca":
        result = await consultarPixCobranca(creds, payload.txid);
        break;
      case "consultar-pix":
        result = await consultarPix(creds, payload);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Inter proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ----- Helper functions -----

async function getOAuthToken(creds: any): Promise<string> {
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const tokenUrl = INTER_OAUTH[ambiente];

  const params = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret_encrypted,
    grant_type: "client_credentials",
    scope: (creds.escopos || []).join(" "),
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro OAuth Inter: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function testConnection(creds: any) {
  try {
    const token = await getOAuthToken(creds);
    return { success: true, message: "Conexão estabelecida com sucesso", token_preview: token.substring(0, 10) + "..." };
  } catch (error) {
    return { success: false, message: `Falha na conexão: ${error.message}` };
  }
}

async function saveCredentials(supabaseAdmin: any, lojaId: string, userId: string, payload: any) {
  const { client_id, client_secret, certificado_pem, chave_privada_pem, ambiente, webhook_url } = payload;

  const upsertData: any = {
    loja_id: lojaId,
    client_id,
    client_secret_encrypted: client_secret,
    ambiente: ambiente || "sandbox",
    webhook_url: webhook_url || null,
    ativo: true,
    created_by: userId,
  };

  if (certificado_pem) {
    upsertData.certificado_pem_encrypted = certificado_pem;
  }
  if (chave_privada_pem) {
    upsertData.chave_privada_pem_encrypted = chave_privada_pem;
  }

  const { data, error } = await supabaseAdmin
    .from("inter_credentials")
    .upsert(upsertData, { onConflict: "loja_id" })
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar credenciais: ${error.message}`);

  return {
    success: true,
    message: "Credenciais salvas com sucesso",
    id: data.id,
    hasClientId: !!data.client_id,
    hasCertificado: !!data.certificado_pem_encrypted,
    hasChavePrivada: !!data.chave_privada_pem_encrypted,
  };
}

async function emitirBoleto(creds: any, payload: any) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  const response = await fetch(`${baseUrl}/cobranca/v3/cobrancas`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao emitir boleto: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function consultarBoleto(creds: any, codigoSolicitacao: string) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  const response = await fetch(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao consultar boleto: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function cancelarBoleto(creds: any, codigoSolicitacao: string, motivo?: string) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  const response = await fetch(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}/cancelar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ motivoCancelamento: motivo || "ACERTOS" }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao cancelar boleto: ${response.status} - ${errorText}`);
  }

  return { success: true, status: "CANCELADO" };
}

async function consultarPix(creds: any, payload: any) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  const params = new URLSearchParams();
  if (payload.dataInicio) params.append("dataInicio", payload.dataInicio);
  if (payload.dataFim) params.append("dataFim", payload.dataFim);

  const response = await fetch(`${baseUrl}/pix/v2/pix?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao consultar PIX: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function criarPixCobranca(creds: any, payload: any) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  // Generate txid if not provided (alphanumeric, 26-35 chars)
  const txid = payload.txid || generateTxId();

  const cobPayload: any = {
    calendario: {
      expiracao: payload.expiracao || 3600, // 1 hour default
    },
    valor: {
      original: payload.valor, // e.g. "100.00"
    },
    chave: payload.chave, // PIX key of the receiver (loja)
  };

  if (payload.devedor) {
    cobPayload.devedor = payload.devedor; // { cpf/cnpj, nome }
  }

  if (payload.solicitacaoPagador) {
    cobPayload.solicitacaoPagador = payload.solicitacaoPagador;
  }

  if (payload.infoAdicionais) {
    cobPayload.infoAdicionais = payload.infoAdicionais;
  }

  const response = await fetch(`${baseUrl}/pix/v2/cob/${txid}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cobPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar cobrança PIX: ${response.status} - ${errorText}`);
  }

  const cobData = await response.json();

  // Try to get QR Code for the location
  let qrCode = null;
  if (cobData.loc?.id) {
    try {
      const qrResponse = await fetch(`${baseUrl}/pix/v2/loc/${cobData.loc.id}/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (qrResponse.ok) {
        qrCode = await qrResponse.json();
      }
    } catch (e) {
      console.error("Error fetching QR code:", e);
    }
  }

  return {
    ...cobData,
    txid,
    qrCode, // { qrcode (base64 image), imagemQrcode }
  };
}

async function consultarPixCobranca(creds: any, txid: string) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  const response = await fetch(`${baseUrl}/pix/v2/cob/${txid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao consultar cobrança PIX: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getPdf(creds: any, codigoSolicitacao: string) {
  const token = await getOAuthToken(creds);
  const ambiente = creds.ambiente as "sandbox" | "producao";
  const baseUrl = INTER_API[ambiente];

  const response = await fetch(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Erro ao obter PDF: ${response.status}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  return { pdf_base64: base64, content_type: "application/pdf" };
}

function generateTxId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
