import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';
import { isDemoEmail, demoForbiddenResponse } from '../_shared/demo.ts';

/**
 * Código de 6 dígitos com CSPRNG, uniforme em [000000, 999999].
 *
 * O espaço inteiro (10^6) é usado — inclusive com zeros à esquerda, que a
 * fórmula anterior excluía. Rejection sampling descarta os valores acima do
 * maior múltiplo de 1e6 representável, senão o módulo enviesaria os primeiros
 * valores da faixa.
 */
export function generateCode(): string {
  const LIMIT = 1_000_000;
  const MAX = Math.floor(0xffffffff / LIMIT) * LIMIT;
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= MAX);
  return String(n % LIMIT).padStart(6, '0');
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
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
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return Response.json({ error: 'Token inválido' }, { status: 401, headers: corsHeaders });
    }
    if (isDemoEmail(caller.email)) return demoForbiddenResponse(corsHeaders);

    // Envio de código consome a instância WhatsApp da loja — exige acesso à loja
    const { data: callerRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const rolesList = (callerRoles ?? []).map((r: { role: string }) => r.role);
    const callerIsMasterAdmin = rolesList.includes('master') || rolesList.includes('admin');

    const body = await req.json();
    const { action, phone, code, loja_id } = body;

    // RELAY 55 — a checagem de loja era `if (!callerIsMasterAdmin && loja_id)`.
    // Condicionada a loja_id ser TRUTHY, ou seja: a ausência do parâmetro era
    // tratada como permissão. O ramo `verify` nunca mandava loja_id, então
    // qualquer usuário autenticado verificava telefone de qualquer loja. Agora
    // loja_id é exigido nos dois ramos e a falta dele é 400, não passe livre.
    if (!loja_id) {
      return Response.json({ error: 'loja_id obrigatório' }, { status: 400, headers: corsHeaders });
    }

    if (!callerIsMasterAdmin) {
      const { data: lojaAcesso } = await supabase
        .from('user_lojas_permitidas')
        .select('loja_id')
        .eq('user_id', caller.id)
        .eq('loja_id', loja_id)
        .maybeSingle();
      if (!lojaAcesso) {
        return Response.json({ error: 'Sem acesso a esta loja' }, { status: 403, headers: corsHeaders });
      }
    }

    if (action === 'send') {
      if (!phone) {
        return Response.json({ error: 'Telefone obrigatório' }, { status: 400, headers: corsHeaders });
      }

      // Lookup instance token from whatsapp_instances
      const { data: instance, error: instError } = await supabase
        .from('whatsapp_instances')
        .select('instance_token')
        .eq('loja_id', loja_id)
        .eq('status', 'conectado')
        .single();

      if (instError || !instance?.instance_token) {
        console.error('Instance lookup error:', instError);
        return Response.json(
          {
            error: 'O WhatsApp desta loja ainda não está conectado. Acesse Configurações → WhatsApp para escanear o QR Code.',
            code: 'WHATSAPP_NOT_CONNECTED',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // RELAY 55 — era Math.floor(100000 + Math.random() * 900000). Dois
      // problemas: Math.random() é PRNG não-criptográfico (xorshift128+, cujo
      // estado é recuperável a partir de saídas observadas — quem vê os
      // próprios códigos pode prever os de terceiros), e a fórmula nunca gera
      // zero à esquerda, reduzindo o espaço de 10^6 para 9·10^5.
      // Rejection sampling para não reintroduzir viés com o módulo.
      const newCode = generateCode();
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

      // Format phone number: remove non-digits, ensure 55 prefix
      const cleanPhone = phone.replace(/\D/g, '');
      const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const textMessage = `🔐 Seu código de verificação é: *${newCode}*\nEle expira em 5 minutos.`;

      // Send via uazapi using instance token
      const uazapiUrl = Deno.env.get('UAZAPI_URL');
      if (!uazapiUrl) {
        console.error('UAZAPI_URL not configured');
        return Response.json({ error: 'Configuração de WhatsApp ausente' }, { status: 500, headers: corsHeaders });
      }

      const baseUrl = uazapiUrl.replace(/\/+$/, '');
      const fullUrl = `${baseUrl}/send/text`;
      console.log('Calling uazapi URL:', fullUrl);
      console.log('Number:', whatsappNumber);
      console.log('Using instance token:', instance.instance_token ? 'present' : 'missing');

      const uazapiResponse = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instance.instance_token,
        },
        body: JSON.stringify({
          number: whatsappNumber,
          text: textMessage,
        }),
      });

      if (!uazapiResponse.ok) {
        const errorText = await uazapiResponse.text();
        console.error('uazapi error:', errorText);
        // 401 da uazapi = token da instância inválido / desconectada
        if (uazapiResponse.status === 401 || /invalid token/i.test(errorText)) {
          return Response.json(
            {
              error: 'O WhatsApp desta loja foi desconectado. Acesse Configurações → WhatsApp para reconectar.',
              code: 'WHATSAPP_NOT_CONNECTED',
            },
            { status: 400, headers: corsHeaders }
          );
        }
        return Response.json({ error: 'Erro ao enviar mensagem WhatsApp. Tente novamente em instantes.' }, { status: 500, headers: corsHeaders });
      }

      await uazapiResponse.text();
      return Response.json({ success: true }, { headers: corsHeaders });

    } else if (action === 'verify') {
      if (!phone || !code) {
        return Response.json({ error: 'Telefone e código obrigatórios' }, { status: 400, headers: corsHeaders });
      }

      // RELAY 55 — antes isto era SELECT seguido de UPDATE. Duas requisições
      // concorrentes passavam ambas pelo filtro `verified=false` e o mesmo
      // código era consumido duas vezes; e não havia contagem de tentativas,
      // então 9·10^5 combinações eram varridas por script.
      //
      // A RPC faz tudo numa instrução: registra a tentativa, checa a janela
      // (ANTES de olhar o código, para o 429 não virar oráculo de "este
      // telefone tem código pendente") e consome com UPDATE ... RETURNING.
      const { data: result, error: rpcError } = await supabase.rpc(
        'whatsapp_verify_consume',
        { p_phone: phone, p_code: code, p_user_id: caller.id }
      );

      if (rpcError) {
        console.error('RPC error:', rpcError);
        return Response.json({ error: 'Erro ao verificar código' }, { status: 500, headers: corsHeaders });
      }

      if (result?.status === 'rate_limited') {
        return Response.json(
          {
            error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
            code: 'RATE_LIMITED',
          },
          {
            status: 429,
            headers: { ...corsHeaders, 'Retry-After': String(result.retry_after_seconds ?? 900) },
          }
        );
      }

      // Status desconhecido (RPC ausente, retorno nulo) não pode se disfarçar
      // de código errado: sem isto uma falha de deploy vira "código inválido"
      // para o operador e não deixa rastro no log.
      if (!result || typeof result.status !== 'string') {
        console.error('RPC retorno inesperado:', result);
        return Response.json({ error: 'Erro ao verificar código' }, { status: 500, headers: corsHeaders });
      }

      if (result.status !== 'ok') {
        // Mensagem deliberadamente igual para código errado, expirado, já
        // usado e telefone sem código — não distinguir os casos.
        return Response.json({ error: 'Código inválido ou expirado' }, { status: 400, headers: corsHeaders });
      }

      return Response.json({ success: true, verified: true }, { headers: corsHeaders });

    } else {
      return Response.json({ error: 'Ação inválida' }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500, headers: corsHeaders });
  }
});
