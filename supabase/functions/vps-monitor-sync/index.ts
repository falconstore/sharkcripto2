import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-monitor-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const monitorKey = req.headers.get('x-monitor-key');
    const expectedKey = Deno.env.get('MONITOR_API_KEY');
    
    if (!monitorKey || monitorKey !== expectedKey) {
      console.error('Invalid or missing monitor API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();
    console.log(`[VPS-SYNC] Action: ${action}, Data count: ${Array.isArray(data) ? data.length : 1}`);

    let result;

    switch (action) {
      case 'update_opportunities': {
        // Upsert opportunities
        const opportunities = Array.isArray(data) ? data : [data];
        
        if (opportunities.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: 'No opportunities to update' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prepare data for upsert
        const preparedData = opportunities.map(opp => ({
          pair_symbol: opp.pair_symbol,
          spot_bid_price: opp.spot_bid_price,
          spot_ask_price: opp.spot_ask_price || opp.spot_bid_price,
          futures_bid_price: opp.futures_bid_price || opp.futures_ask_price,
          futures_ask_price: opp.futures_ask_price,
          spot_volume_24h: opp.spot_volume_24h || 0,
          futures_volume_24h: opp.futures_volume_24h || 0,
          spread_gross_percent: opp.spread_gross_percent || 0,
          spread_net_percent: opp.spread_net_percent || 0,
          spread_net_percent_entrada: opp.spread_net_percent_entrada || 0,
          spread_net_percent_saida: opp.spread_net_percent_saida || 0,
          spot_taker_fee: opp.spot_taker_fee || 0.1,
          futures_taker_fee: opp.futures_taker_fee || 0.02,
          funding_rate: opp.funding_rate || 0,
          is_active: true,
          timestamp: opp.timestamp || new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from('arbitrage_opportunities')
          .upsert(preparedData, { 
            onConflict: 'pair_symbol',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('[VPS-SYNC] Upsert error:', upsertError);
          throw upsertError;
        }

        result = { 
          success: true, 
          message: `Updated ${opportunities.length} opportunities` 
        };
        break;
      }

      case 'record_crossing': {
        // Record a single crossing
        const { pair_symbol, spread_net_percent_saida } = data;
        
        const { error: crossingError } = await supabase
          .from('pair_crossings')
          .insert({
            pair_symbol,
            spread_net_percent_saida,
            timestamp: new Date().toISOString()
          });

        if (crossingError) {
          console.error('[VPS-SYNC] Crossing insert error:', crossingError);
          throw crossingError;
        }

        console.log(`[VPS-SYNC] Crossing recorded: ${pair_symbol} @ ${spread_net_percent_saida}%`);
        result = { success: true, message: 'Crossing recorded' };
        break;
      }

      case 'health_check': {
        result = { 
          success: true, 
          message: 'VPS Monitor Sync is healthy',
          timestamp: new Date().toISOString()
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VPS-SYNC] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
