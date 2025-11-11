import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpotTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  volume: string;
  quoteVolume: string;
}

interface FuturesTicker {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  volume24: string;
}

// Taxas da MEXC (em %)
const SPOT_TAKER_FEE = 0.10;
const FUTURES_TAKER_FEE = 0.02;
const MIN_VOLUME_USDT = 100000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MEXC Arbitrage Monitor Starting ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Função para buscar tickers Spot
    const fetchSpotTickers = async (): Promise<Map<string, SpotTicker>> => {
      try {
        const response = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
        if (!response.ok) {
          console.error('Spot API error:', response.status, response.statusText);
          return new Map();
        }
        
        const data: SpotTicker[] = await response.json();
        const usdtPairs = new Map<string, SpotTicker>();
        
        data.forEach(ticker => {
          if (ticker.symbol.endsWith('USDT')) {
            usdtPairs.set(ticker.symbol, ticker);
          }
        });
        
        console.log(`✅ Fetched ${usdtPairs.size} USDT spot pairs`);
        return usdtPairs;
      } catch (error) {
        console.error('Error fetching spot tickers:', error);
        return new Map();
      }
    };

    // Função para buscar tickers de Futuros
    const fetchFuturesTickers = async (): Promise<Map<string, FuturesTicker>> => {
      try {
        const response = await fetch('https://contract.mexc.com/api/v1/contract/ticker');
        if (!response.ok) {
          console.error('Futures API error:', response.status, response.statusText);
          return new Map();
        }
        
        const data: { data: FuturesTicker[] } = await response.json();
        const usdtPairs = new Map<string, FuturesTicker>();
        
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(ticker => {
            if (ticker.symbol.endsWith('_USDT')) {
              // Converter BTC_USDT -> BTCUSDT para match com spot
              const spotSymbol = ticker.symbol.replace('_', '');
              usdtPairs.set(spotSymbol, ticker);
            }
          });
        }
        
        console.log(`✅ Fetched ${usdtPairs.size} USDT futures pairs`);
        return usdtPairs;
      } catch (error) {
        console.error('Error fetching futures tickers:', error);
        return new Map();
      }
    };

    // Função para processar oportunidades
    const processOpportunities = async () => {
      console.log('\n🔄 Fetching market data...');
      
      const [spotTickers, futuresTickers] = await Promise.all([
        fetchSpotTickers(),
        fetchFuturesTickers()
      ]);

      if (spotTickers.size === 0 || futuresTickers.size === 0) {
        console.log('⚠️ No data fetched, skipping this cycle');
        return;
      }

      let opportunitiesFound = 0;
      const opportunities: any[] = [];

      // Processar cada par que existe em ambos os mercados
      spotTickers.forEach((spotTicker, symbol) => {
        const futuresTicker = futuresTickers.get(symbol);
        
        if (!futuresTicker) return;

        const spotBidPrice = parseFloat(spotTicker.bidPrice);
        const spotVolume = parseFloat(spotTicker.quoteVolume);
        const futuresAskPrice = parseFloat(futuresTicker.askPrice);
        const futuresVolume = parseFloat(futuresTicker.volume24);

        // Validar dados
        if (!spotBidPrice || !futuresAskPrice || spotBidPrice <= 0 || futuresAskPrice <= 0) {
          return;
        }

        // Filtro de liquidez
        if (spotVolume < MIN_VOLUME_USDT || futuresVolume < MIN_VOLUME_USDT) {
          return;
        }

        // Calcular spread
        const spreadGross = ((futuresAskPrice - spotBidPrice) / spotBidPrice) * 100;
        const spreadNet = spreadGross - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // Apenas spreads positivos
        if (spreadNet > 0) {
          opportunitiesFound++;
          
          opportunities.push({
            pair_symbol: symbol,
            spot_bid_price: spotBidPrice,
            spot_volume_24h: spotVolume,
            futures_ask_price: futuresAskPrice,
            futures_volume_24h: futuresVolume,
            spread_gross_percent: spreadGross,
            spread_net_percent: spreadNet,
            spot_taker_fee: SPOT_TAKER_FEE,
            futures_taker_fee: FUTURES_TAKER_FEE,
            is_active: true,
            timestamp: new Date().toISOString()
          });

          if (opportunitiesFound <= 5) {
            console.log(`💰 ${symbol}: ${spreadNet.toFixed(4)}% | Spot: $${spotBidPrice} | Futures: $${futuresAskPrice}`);
          }
        }
      });

      // Inserir todas as oportunidades no banco
      if (opportunities.length > 0) {
        const { error } = await supabase
          .from('arbitrage_opportunities')
          .insert(opportunities);

        if (error) {
          console.error('❌ Error inserting opportunities:', error);
        } else {
          console.log(`✅ Inserted ${opportunities.length} opportunities into database`);
        }
      } else {
        console.log('⚠️ No profitable opportunities found in this cycle');
      }

      console.log(`📊 Total opportunities: ${opportunitiesFound}/${spotTickers.size} pairs`);
    };

    // Executar primeira vez imediatamente
    await processOpportunities();

    // Loop contínuo a cada 2 segundos
    const intervalId = setInterval(async () => {
      try {
        await processOpportunities();
      } catch (error) {
        console.error('Error in processing cycle:', error);
      }
    }, 2000);

    // Manter a função rodando
    await new Promise(() => {}); // Loop infinito

    return new Response(
      JSON.stringify({ 
        message: 'MEXC Arbitrage Monitor started successfully',
        status: 'running'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fatal error in MEXC monitor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});