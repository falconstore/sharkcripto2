import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from environment
    const MEXC_API_KEY = Deno.env.get('MEXC_API_KEY');
    const MEXC_API_SECRET = Deno.env.get('MEXC_API_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MEXC_API_KEY || !MEXC_API_SECRET) {
      throw new Error('MEXC API credentials not configured');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Fetching MEXC balances for user:', user.id);

    // Helper function to sign requests
    const signRequest = async (queryString: string): Promise<string> => {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(MEXC_API_SECRET);
      const messageData = encoder.encode(queryString);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    // Fetch SPOT balance
    const spotTimestamp = Date.now();
    const spotQueryString = `timestamp=${spotTimestamp}`;
    const spotSignature = await signRequest(spotQueryString);
    
    const spotResponse = await fetch(
      `https://api.mexc.com/api/v3/account?${spotQueryString}&signature=${spotSignature}`,
      {
        headers: {
          'X-MEXC-APIKEY': MEXC_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!spotResponse.ok) {
      const errorText = await spotResponse.text();
      console.error('SPOT API error:', spotResponse.status, errorText);
      throw new Error(`SPOT API error: ${spotResponse.status}`);
    }

    const spotData = await spotResponse.json();
    const usdtSpotBalance = spotData.balances?.find((b: any) => b.asset === 'USDT');
    const spotUsdt = usdtSpotBalance ? parseFloat(usdtSpotBalance.free) : 0;

    console.log('SPOT Balance:', spotUsdt, 'USDT');

    // Fetch FUTURES balance
    const futuresTimestamp = Date.now();
    const futuresQueryString = `timestamp=${futuresTimestamp}`;
    const futuresSignature = await signRequest(futuresQueryString);
    
    const futuresResponse = await fetch(
      `https://contract.mexc.com/api/v1/private/account/assets?${futuresQueryString}&signature=${futuresSignature}`,
      {
        headers: {
          'ApiKey': MEXC_API_KEY,
          'Request-Time': futuresTimestamp.toString(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!futuresResponse.ok) {
      const errorText = await futuresResponse.text();
      console.error('FUTURES API error:', futuresResponse.status, errorText);
      throw new Error(`FUTURES API error: ${futuresResponse.status}`);
    }

    const futuresData = await futuresResponse.json();
    const futuresUsdt = futuresData.data?.availableBalance || 0;

    console.log('FUTURES Balance:', futuresUsdt, 'USDT');

    return new Response(
      JSON.stringify({
        success: true,
        spot_usdt: spotUsdt,
        futures_usdt: futuresUsdt,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error fetching MEXC balances:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});