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
    const body = await req.json()
    console.log('ZapSign webhook received:', JSON.stringify(body, null, 2))

    // ZapSign sends event_type for webhook callbacks
    // We care about "doc_signed" or check status
    const docToken = body.token || body.doc_token
    const status = body.status || body.event_type

    if (!docToken) {
      console.log('No doc token in webhook payload, ignoring')
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Only process when signed
    const isSignedEvent = status === 'signed' || status === 'doc_signed' || status === 'closed'
    if (!isSignedEvent) {
      console.log(`Event status "${status}" - not a signed event, skipping`)
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find the contract by zapsign_doc_token
    const { data: contrato, error: findError } = await supabaseAdmin
      .from('contratos')
      .select('id, documentos, zapsign_doc_token')
      .eq('zapsign_doc_token', docToken)
      .single()

    if (findError || !contrato) {
      console.error('Contrato not found for token:', docToken, findError)
      return new Response(JSON.stringify({ error: 'Contrato não encontrado' }), {
        status: 404, headers: corsHeaders
      })
    }

    console.log('Found contrato:', contrato.id)

    // Download signed PDF from ZapSign API
    const ZAPSIGN_API_TOKEN = Deno.env.get('ZAPSIGN_API_TOKEN')
    if (!ZAPSIGN_API_TOKEN) {
      console.error('ZAPSIGN_API_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'ZAPSIGN_API_TOKEN não configurado' }), {
        status: 500, headers: corsHeaders
      })
    }

    // Get document details to find the signed file URL
    const docRes = await fetch(`https://sandbox.api.zapsign.com.br/api/v1/docs/${docToken}/`, {
      headers: { 'Authorization': `Bearer ${ZAPSIGN_API_TOKEN}` },
    })

    if (!docRes.ok) {
      const errText = await docRes.text()
      console.error('Failed to fetch doc from ZapSign:', errText)
      return new Response(JSON.stringify({ error: 'Erro ao buscar documento na ZapSign' }), {
        status: 502, headers: corsHeaders
      })
    }

    const docData = await docRes.json()
    const signedFileUrl = docData.signed_file || docData.original_file

    if (!signedFileUrl) {
      console.error('No signed file URL in ZapSign response')
      // Still update status
      await supabaseAdmin
        .from('contratos')
        .update({
          zapsign_status: 'ASSINADO',
          zapsign_signed_at: new Date().toISOString(),
        })
        .eq('id', contrato.id)

      return new Response(JSON.stringify({ ok: true, message: 'Status atualizado, sem PDF' }), {
        headers: corsHeaders
      })
    }

    // Download the signed PDF
    console.log('Downloading signed PDF from:', signedFileUrl)
    const pdfRes = await fetch(signedFileUrl)
    if (!pdfRes.ok) {
      console.error('Failed to download signed PDF')
      await supabaseAdmin.from('contratos').update({
        zapsign_status: 'ASSINADO',
        zapsign_signed_at: new Date().toISOString(),
      }).eq('id', contrato.id)

      return new Response(JSON.stringify({ ok: true, message: 'Status atualizado, download falhou' }), {
        headers: corsHeaders
      })
    }

    const pdfBlob = await pdfRes.blob()
    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer())
    const fileName = `contrato-assinado-${Date.now()}.pdf`
    const storagePath = `${contrato.id}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('contratos-anexos')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
    } else {
      console.log('Signed PDF uploaded to:', storagePath)
    }

    // Add to documentos array
    const documentosAtuais = (contrato.documentos as any[]) || []
    const novoDoc = {
      id: crypto.randomUUID(),
      nome: fileName,
      path: storagePath,
      tipo: 'pdf',
      tamanho: pdfBuffer.length,
      tag: 'ASSINATURA',
      observacao: 'Contrato assinado digitalmente via ZapSign',
      usuarioNome: 'ZapSign (automático)',
      createdAt: new Date().toISOString(),
    }

    const updatedDocs = uploadError ? documentosAtuais : [...documentosAtuais, novoDoc]

    // Update contract
    const { error: updateError } = await supabaseAdmin
      .from('contratos')
      .update({
        zapsign_status: 'ASSINADO',
        zapsign_signed_at: new Date().toISOString(),
        documentos: updatedDocs,
      })
      .eq('id', contrato.id)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    console.log('Webhook processed successfully for contrato:', contrato.id)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders,
    })
  }
})
