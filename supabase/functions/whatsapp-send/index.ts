import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiUrl = (Deno.env.get('UAZAPI_URL') || '').replace(/\/+$/, '');

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles?.map((r: any) => r.role) || [];
    const allowed = ['master', 'admin', 'gestor', 'vendedor'].some(r => userRoles.includes(r));
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { loja_id, phone, message } = await req.json();

    if (!loja_id || !phone || !message) {
      return new Response(JSON.stringify({ error: 'loja_id, phone e message são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lookup instance token
    const { data: instance, error: instError } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('instance_token')
      .eq('loja_id', loja_id)
      .eq('status', 'conectado')
      .single();

    if (instError || !instance?.instance_token) {
      console.error('Instance lookup error:', instError);
      return new Response(JSON.stringify({
        error: 'O WhatsApp desta loja ainda não está conectado. Acesse Configurações → WhatsApp para escanear o QR Code.',
        code: 'WHATSAPP_NOT_CONNECTED',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Send via uazapi
    const fullUrl = `${uazapiUrl}/send/text`;
    console.log('Sending WhatsApp message to:', whatsappNumber);

    const uazapiResponse = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instance.instance_token,
      },
      body: JSON.stringify({
        number: whatsappNumber,
        text: message,
      }),
    });

    if (!uazapiResponse.ok) {
      const errorText = await uazapiResponse.text();
      console.error('uazapi error:', errorText);
      if (uazapiResponse.status === 401 || /invalid token/i.test(errorText)) {
        return new Response(JSON.stringify({
          error: 'O WhatsApp desta loja foi desconectado. Acesse Configurações → WhatsApp para reconectar.',
          code: 'WHATSAPP_NOT_CONNECTED',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Erro ao enviar mensagem WhatsApp. Tente novamente em instantes.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await uazapiResponse.text();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
