import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiUrl = (Deno.env.get('UAZAPI_URL') || '').replace(/\/+$/, '');
    const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN')!;

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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

    // Check if user is admin or master
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles?.map((r: any) => r.role) || [];
    const isAdminOrMaster = userRoles.includes('master') || userRoles.includes('admin');

    if (!isAdminOrMaster) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, loja_id, instance_name } = await req.json();

    switch (action) {
      case 'create': {
        if (!loja_id || !instance_name) {
          return new Response(JSON.stringify({ error: 'loja_id e instance_name são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if instance already exists for this loja
        const { data: existing } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('id')
          .eq('loja_id', loja_id)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ error: 'Loja já possui uma instância WhatsApp' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create instance on uazapi
        console.log('Creating instance on uazapi:', instance_name);
        const initResponse = await fetch(`${uazapiUrl}/instance/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': adminToken,
          },
          body: JSON.stringify({ instance_name }),
        });

        const initData = await initResponse.json();
        console.log('uazapi init response:', JSON.stringify(initData));

        if (!initResponse.ok) {
          return new Response(JSON.stringify({ error: 'Erro ao criar instância na uazapi', details: initData }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save to database - the token is usually in initData.token or initData.instance_key
        const instanceToken = initData.token || initData.instance_key || initData.key || '';

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('whatsapp_instances')
          .insert({
            loja_id,
            instance_name,
            instance_token: instanceToken,
            status: 'desconectado',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(JSON.stringify({ error: 'Erro ao salvar instância', details: insertError }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, instance: inserted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'connect': {
        if (!loja_id) {
          return new Response(JSON.stringify({ error: 'loja_id é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: instance } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('*')
          .eq('loja_id', loja_id)
          .single();

        if (!instance) {
          return new Response(JSON.stringify({ error: 'Instância não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Connect instance to get QR code
        console.log('Connecting instance:', instance.instance_name);
        const connectResponse = await fetch(`${uazapiUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instance.instance_token || adminToken,
          },
          body: JSON.stringify({ instance_name: instance.instance_name }),
        });

        const connectData = await connectResponse.json();
        console.log('uazapi connect response status:', connectResponse.status);

        if (!connectResponse.ok) {
          return new Response(JSON.stringify({ error: 'Erro ao conectar instância', details: connectData }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update status
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: 'qr_pendente' })
          .eq('id', instance.id);

        return new Response(JSON.stringify({ success: true, qrcode: connectData.base64 || connectData.qrcode || connectData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        if (!loja_id) {
          return new Response(JSON.stringify({ error: 'loja_id é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: inst } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('*')
          .eq('loja_id', loja_id)
          .single();

        if (!inst) {
          return new Response(JSON.stringify({ status: 'none' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check status on uazapi if we have a token
        if (inst.instance_token) {
          try {
            const statusResp = await fetch(`${uazapiUrl}/instance/status`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': inst.instance_token,
              },
              body: JSON.stringify({ instance_name: inst.instance_name }),
            });
            const statusData = await statusResp.json();
            console.log('uazapi status response:', JSON.stringify(statusData));

            // Update local status based on uazapi response
            const isConnected = statusData.status === 'CONNECTED' || statusData.connected === true;
            const newStatus = isConnected ? 'conectado' : 'desconectado';
            const phoneNumber = statusData.phone_number || statusData.phone || inst.phone_number;

            if (newStatus !== inst.status || phoneNumber !== inst.phone_number) {
              await supabaseAdmin
                .from('whatsapp_instances')
                .update({ status: newStatus, phone_number: phoneNumber })
                .eq('id', inst.id);
            }

            return new Response(JSON.stringify({
              ...inst,
              status: newStatus,
              phone_number: phoneNumber,
              instance_token: undefined, // Don't expose token to frontend
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch (e) {
            console.error('Status check error:', e);
          }
        }

        return new Response(JSON.stringify({
          ...inst,
          instance_token: undefined,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!loja_id) {
          return new Response(JSON.stringify({ error: 'loja_id é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: delInst } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('*')
          .eq('loja_id', loja_id)
          .single();

        if (!delInst) {
          return new Response(JSON.stringify({ error: 'Instância não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete on uazapi
        try {
          console.log('Deleting instance on uazapi:', delInst.instance_name);
          await fetch(`${uazapiUrl}/instance/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'admintoken': adminToken,
            },
            body: JSON.stringify({ instance_name: delInst.instance_name }),
          });
        } catch (e) {
          console.error('uazapi delete error:', e);
        }

        // Delete from database
        await supabaseAdmin
          .from('whatsapp_instances')
          .delete()
          .eq('id', delInst.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
