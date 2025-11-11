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
const MIN_VOLUME_USDT = 10000; // Reduzido para capturar mais oportunidades

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MEXC Arbitrage Monitor Starting ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Função para normalizar símbolo: BTCUSDT -> BTC, BTC_USDT -> BTC
    const normalizeSymbol = (symbol: string): string => {
      return symbol.replace('USDT', '').replace('_', '');
    };

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
            const baseSymbol = normalizeSymbol(ticker.symbol);
            usdtPairs.set(baseSymbol, ticker);
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
              const baseSymbol = normalizeSymbol(ticker.symbol);
              usdtPairs.set(baseSymbol, ticker);
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
      let pairsProcessed = 0;
      const opportunities: any[] = [];

      // Processar cada par que existe em ambos os mercados (symbol agora é o baseSymbol: BTC, ETH, etc)
      spotTickers.forEach((spotTicker, baseSymbol) => {
        const futuresTicker = futuresTickers.get(baseSymbol);
        
        if (!futuresTicker) return;
        
        pairsProcessed++;

        const spotBidPrice = parseFloat(spotTicker.bidPrice);
        const spotAskPrice = parseFloat(spotTicker.askPrice);
        const spotVolume = parseFloat(spotTicker.quoteVolume);
        const futuresBidPrice = parseFloat(futuresTicker.bidPrice);
        const futuresAskPrice = parseFloat(futuresTicker.askPrice);
        const futuresVolume = parseFloat(futuresTicker.volume24);

        // Validar dados
        if (!spotBidPrice || !spotAskPrice || !futuresBidPrice || !futuresAskPrice ||
            spotBidPrice <= 0 || spotAskPrice <= 0 || futuresBidPrice <= 0 || futuresAskPrice <= 0) {
          return;
        }

        // Filtro de liquidez
        if (spotVolume < MIN_VOLUME_USDT || futuresVolume < MIN_VOLUME_USDT) {
          return;
        }

        // DIREÇÃO 1: LONG SPOT + SHORT FUTURES (Cash and Carry)
        // Comprar Spot (pagar askPrice) + Vender Futures/Short (receber bidPrice)
        // Lucro = (Futures Bid - Spot Ask) / Spot Ask - taxas
        const spreadGrossLong = ((futuresBidPrice - spotAskPrice) / spotAskPrice) * 100;
        const spreadNetLong = spreadGrossLong - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // Capturar TODAS as oportunidades (incluindo negativas)
        opportunitiesFound++;
        
        opportunities.push({
          pair_symbol: baseSymbol,
          spot_bid_price: spotAskPrice,
          spot_volume_24h: spotVolume,
          futures_ask_price: futuresBidPrice,
          futures_volume_24h: futuresVolume,
          spread_gross_percent: spreadGrossLong,
          spread_net_percent: spreadNetLong,
          spot_taker_fee: SPOT_TAKER_FEE,
          futures_taker_fee: FUTURES_TAKER_FEE,
          is_active: true,
          timestamp: new Date().toISOString()
        });

        if (opportunitiesFound <= 10) {
          console.log(`🔵 LONG ${baseSymbol}: ${spreadNetLong.toFixed(4)}% | Spot Ask: $${spotAskPrice} | Fut Bid: $${futuresBidPrice}`);
        }

        // DIREÇÃO 2: SHORT SPOT + LONG FUTURES (Reverse Cash and Carry)
        // Vender Spot (receber bidPrice) + Comprar Futures/Long (pagar askPrice)
        // Lucro = (Spot Bid - Futures Ask) / Futures Ask - taxas
        const spreadGrossShort = ((spotBidPrice - futuresAskPrice) / futuresAskPrice) * 100;
        const spreadNetShort = spreadGrossShort - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // Capturar TODAS as oportunidades (incluindo negativas)
        opportunitiesFound++;
        
        opportunities.push({
          pair_symbol: baseSymbol,
          spot_bid_price: spotBidPrice,
          spot_volume_24h: spotVolume,
          futures_ask_price: futuresAskPrice,
          futures_volume_24h: futuresVolume,
          spread_gross_percent: spreadGrossShort,
          spread_net_percent: spreadNetShort,
          spot_taker_fee: SPOT_TAKER_FEE,
          futures_taker_fee: FUTURES_TAKER_FEE,
          is_active: true,
          timestamp: new Date().toISOString()
        });

        if (opportunitiesFound <= 10) {
          console.log(`🔴 SHORT ${baseSymbol}: ${spreadNetShort.toFixed(4)}% | Spot Bid: $${spotBidPrice} | Fut Ask: $${futuresAskPrice}`);
        }
      });

      console.log(`\n📊 Pares processados: ${pairsProcessed} | Oportunidades encontradas: ${opportunitiesFound}`);
      
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
        console.log('⚠️ No opportunities found in this cycle');
      }
    };

    // Executar processamento
    await processOpportunities();

    return new Response(
      JSON.stringify({ 
        message: 'Dados processados com sucesso',
        status: 'completed'
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