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
    // Auth check
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

    // Parse request body
    const body = await req.json();
    const { action, loja_id, payload } = body;

    if (!action || !loja_id) {
      return new Response(
        JSON.stringify({ error: "action e loja_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to read encrypted credentials
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user has access to this loja
    const { data: access } = await supabaseAdmin
      .from("user_lojas_permitidas")
      .select("loja_id")
      .eq("user_id", userId)
      .eq("loja_id", loja_id)
      .maybeSingle();

    // Also check if user is master
    const { data: isMaster } = await supabaseAdmin.rpc("is_master", { _user_id: userId });

    if (!access && !isMaster) {
      return new Response(
        JSON.stringify({ error: "Sem acesso a esta loja" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Handle actions
    let result;
    switch (action) {
      case "test-connection":
        result = await testConnection(creds);
        break;
      case "save-credentials":
        result = await saveCredentials(supabaseAdmin, loja_id, userId, payload);
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
      case "consultar-pix":
        result = await consultarPix(creds, payload);
        break;
      case "get-pdf":
        result = await getPdf(creds, payload.codigoSolicitacao);
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
    client_secret: creds.client_secret_encrypted, // Will be decrypted in future
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
    client_secret_encrypted: client_secret, // TODO: encrypt with pgcrypto
    ambiente: ambiente || "sandbox",
    webhook_url: webhook_url || null,
    ativo: true,
    created_by: userId,
  };

  if (certificado_pem) {
    upsertData.certificado_pem_encrypted = certificado_pem; // TODO: encrypt
  }
  if (chave_privada_pem) {
    upsertData.chave_privada_pem_encrypted = chave_privada_pem; // TODO: encrypt
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
