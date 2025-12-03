import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-monitor-api-key',
};

interface Opportunity {
  pair_symbol: string;
  spot_bid_price: number;
  spot_volume_24h: number;
  futures_ask_price: number;
  futures_volume_24h: number;
  spread_gross_percent: number;
  spread_net_percent: number;
  spread_net_percent_entrada: number;
  spread_net_percent_saida: number;
  spot_taker_fee: number;
  futures_taker_fee: number;
  funding_rate: number;
  timestamp: string;
  is_active: boolean;
}

interface CrossingData {
  pair_symbol: string;
  spread_net_percent_saida: number;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-monitor-api-key');
    const expectedApiKey = Deno.env.get('MONITOR_API_KEY');

    if (!expectedApiKey) {
      console.error('❌ MONITOR_API_KEY not configured in secrets');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('❌ Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action, data } = body;

    console.log(`📥 Received action: ${action}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'save_opportunities': {
        const opportunities: Opportunity[] = data;
        
        if (!Array.isArray(opportunities) || opportunities.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: 'No opportunities to save' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deactivate old opportunities
        const { error: updateError } = await supabase
          .from('arbitrage_opportunities')
          .update({ is_active: false })
          .eq('is_active', true);

        if (updateError) {
          console.error('❌ Error deactivating old opportunities:', updateError.message);
        }

        // Insert new opportunities
        const { error: insertError } = await supabase
          .from('arbitrage_opportunities')
          .insert(opportunities);

        if (insertError) {
          console.error('❌ Error inserting opportunities:', insertError.message);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`💾 Saved ${opportunities.length} opportunities`);
        return new Response(
          JSON.stringify({ success: true, count: opportunities.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save_crossing': {
        const crossing: CrossingData = data;

        const { error } = await supabase
          .from('pair_crossings')
          .insert({
            pair_symbol: crossing.pair_symbol,
            spread_net_percent_saida: crossing.spread_net_percent_saida,
            timestamp: crossing.timestamp
          });

        if (error) {
          console.error('❌ Error saving crossing:', error.message);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🔄 Saved crossing: ${crossing.pair_symbol}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_blacklist': {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: crossings, error } = await supabase
          .from('pair_crossings')
          .select('pair_symbol')
          .gte('timestamp', oneHourAgo);

        if (error) {
          console.error('❌ Error fetching blacklist:', error.message);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Count crossings per pair
        const counts = new Map<string, number>();
        crossings?.forEach(row => {
          counts.set(row.pair_symbol, (counts.get(row.pair_symbol) || 0) + 1);
        });

        // Pairs with more than 3 crossings in the last hour
        const blacklist = Array.from(counts.entries())
          .filter(([_, count]) => count > 3)
          .map(([symbol]) => symbol);

        console.log(`📋 Blacklist: ${blacklist.length} pairs`);
        return new Response(
          JSON.stringify({ blacklist }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('❌ Error processing request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
