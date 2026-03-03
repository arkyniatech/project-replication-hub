import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers: corsHeaders });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { error: authError } = await anonClient.auth.getUser();
    if (authError) {
      return Response.json({ error: 'Token inválido' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, phone, code } = body;

    if (action === 'send') {
      if (!phone) {
        return Response.json({ error: 'Telefone obrigatório' }, { status: 400, headers: corsHeaders });
      }

      // Generate 6-digit code
      const newCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Invalidate previous codes for this phone
      await supabase
        .from('whatsapp_verifications')
        .update({ verified: true })
        .eq('phone', phone)
        .eq('verified', false);

      // Save new code
      const { error: insertError } = await supabase
        .from('whatsapp_verifications')
        .insert({ phone, code: newCode, expires_at: expiresAt });

      if (insertError) {
        console.error('Insert error:', insertError);
        return Response.json({ error: 'Erro ao salvar código' }, { status: 500, headers: corsHeaders });
      }

      // Send via uazapi
      const uazapiUrl = Deno.env.get('UAZAPI_URL');
      const uazapiToken = Deno.env.get('UAZAPI_TOKEN');

      if (!uazapiUrl || !uazapiToken) {
        console.error('UAZAPI_URL or UAZAPI_TOKEN not configured');
        return Response.json({ error: 'Configuração de WhatsApp ausente' }, { status: 500, headers: corsHeaders });
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const message = `🔐 Seu código de verificação é: *${newCode}*\nEle expira em 5 minutos.`;

      const uazapiResponse = await fetch(`${uazapiUrl}/message/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': uazapiToken,
        },
        body: JSON.stringify({
          number: whatsappNumber,
          text: message,
        }),
      });

      if (!uazapiResponse.ok) {
        const errorText = await uazapiResponse.text();
        console.error('uazapi error:', errorText);
        return Response.json({ error: 'Erro ao enviar mensagem WhatsApp' }, { status: 500, headers: corsHeaders });
      }

      await uazapiResponse.text();
      return Response.json({ success: true }, { headers: corsHeaders });

    } else if (action === 'verify') {
      if (!phone || !code) {
        return Response.json({ error: 'Telefone e código obrigatórios' }, { status: 400, headers: corsHeaders });
      }

      // Find valid code
      const { data: records, error: selectError } = await supabase
        .from('whatsapp_verifications')
        .select('*')
        .eq('phone', phone)
        .eq('code', code)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectError) {
        console.error('Select error:', selectError);
        return Response.json({ error: 'Erro ao verificar código' }, { status: 500, headers: corsHeaders });
      }

      if (!records || records.length === 0) {
        return Response.json({ error: 'Código inválido ou expirado' }, { status: 400, headers: corsHeaders });
      }

      // Mark as verified
      await supabase
        .from('whatsapp_verifications')
        .update({ verified: true })
        .eq('id', records[0].id);

      return Response.json({ success: true, verified: true }, { headers: corsHeaders });

    } else {
      return Response.json({ error: 'Ação inválida' }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500, headers: corsHeaders });
  }
});
