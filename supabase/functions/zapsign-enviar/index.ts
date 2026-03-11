import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { pdf_base64, nome_documento, signatario, contrato_id } = await req.json()

    if (!pdf_base64 || !nome_documento || !signatario || !contrato_id) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: pdf_base64, nome_documento, signatario, contrato_id' }), {
        status: 400, headers: corsHeaders
      })
    }

    const ZAPSIGN_API_TOKEN = Deno.env.get('ZAPSIGN_API_TOKEN')
    if (!ZAPSIGN_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'ZAPSIGN_API_TOKEN não configurado' }), {
        status: 500, headers: corsHeaders
      })
    }

    // Send to ZapSign
    const zapsignBody = {
      name: nome_documento,
      base64_pdf: pdf_base64,
      signers: [{
        name: signatario.nome,
        email: signatario.email || '',
        phone_country: '55',
        phone_number: (signatario.telefone || '').replace(/\D/g, ''),
        auth_mode: 'assinaturaTela',
        send_automatic_email: !!signatario.email,
        send_automatic_whatsapp: !!signatario.telefone,
      }],
      lang: 'pt-br',
      disable_signer_emails: false,
    }

    console.log('Enviando para ZapSign:', { nome_documento, contrato_id })

    const zapsignRes = await fetch('https://api.zapsign.com.br/api/v1/docs/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAPSIGN_API_TOKEN}`,
      },
      body: JSON.stringify(zapsignBody),
    })

    const zapsignData = await zapsignRes.json()

    if (!zapsignRes.ok) {
      console.error('Erro ZapSign:', zapsignData)
      return new Response(JSON.stringify({ error: 'Erro ao enviar para ZapSign', details: zapsignData }), {
        status: 502, headers: corsHeaders
      })
    }

    console.log('ZapSign response:', { token: zapsignData.token, signers: zapsignData.signers?.length })

    // Extract signer sign URL
    const signUrl = zapsignData.signers?.[0]?.sign_url || null

    // Save to contratos using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabaseAdmin
      .from('contratos')
      .update({
        zapsign_doc_token: zapsignData.token,
        zapsign_status: 'PENDENTE',
        zapsign_sign_url: signUrl,
      })
      .eq('id', contrato_id)

    if (updateError) {
      console.error('Erro ao atualizar contrato:', updateError)
    }

    return new Response(JSON.stringify({
      doc_token: zapsignData.token,
      sign_url: signUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders,
    })
  }
})
