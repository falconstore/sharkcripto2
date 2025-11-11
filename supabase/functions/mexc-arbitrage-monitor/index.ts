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
  bid1: string;
  ask1: string;
  volume24: string;
}

// Taxas da MEXC (em %)
const SPOT_TAKER_FEE = 0.10;
const FUTURES_TAKER_FEE = 0.02;

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
          // Log dos primeiros registros para ver a estrutura
          if (data.data.length > 0) {
            console.log('📋 Amostra de dados de futuros (primeiro registro):');
            console.log(JSON.stringify(data.data[0], null, 2));
          }
          
          data.data.forEach((ticker, index) => {
            if (ticker.symbol.endsWith('_USDT')) {
              const baseSymbol = normalizeSymbol(ticker.symbol);
              usdtPairs.set(baseSymbol, ticker);
              
              // Log dos primeiros 3 pares para debug
              if (index < 3) {
                console.log(`Futures ${baseSymbol}: bid1=${ticker.bid1}, ask1=${ticker.ask1}, last=${ticker.lastPrice}`);
              }
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
      let pairsWithValidPrices = 0;
      let pairsSkippedInvalidPrice = 0;
      let pairsWithZeroVolume = 0;
      const opportunities: any[] = [];
      const skippedPairs: string[] = [];
      const zeroVolumePairs: string[] = [];
      const targetPairs = ['RAIL', 'BAGWORK', 'ORE', 'BOBBSC', 'BTC', 'ETH'];

      // Processar cada par que existe em ambos os mercados (symbol agora é o baseSymbol: BTC, ETH, etc)
      spotTickers.forEach((spotTicker, baseSymbol) => {
        const futuresTicker = futuresTickers.get(baseSymbol);
        
        if (!futuresTicker) {
          if (targetPairs.includes(baseSymbol)) {
            console.log(`❌ ${baseSymbol} - Não encontrado em futuros`);
          }
          return;
        }
        
        pairsProcessed++;

        const spotBidPrice = parseFloat(spotTicker.bidPrice);
        const spotAskPrice = parseFloat(spotTicker.askPrice);
        const spotVolume = parseFloat(spotTicker.quoteVolume) || 0;
        const futuresBidPrice = parseFloat(futuresTicker.bid1);
        const futuresAskPrice = parseFloat(futuresTicker.ask1);
        const futuresVolume = parseFloat(futuresTicker.volume24) || 0;

        // Log detalhado para moedas específicas
        if (targetPairs.includes(baseSymbol)) {
          console.log(`🔍 ${baseSymbol} - Spot: bid=${spotBidPrice}, ask=${spotAskPrice}, vol=${spotVolume}`);
          console.log(`🔍 ${baseSymbol} - Fut: bid=${futuresBidPrice}, ask=${futuresAskPrice}, vol=${futuresVolume}`);
        }

        // Contar pares com volume zero
        if (spotVolume === 0 && futuresVolume === 0) {
          pairsWithZeroVolume++;
          if (zeroVolumePairs.length < 10) {
            zeroVolumePairs.push(baseSymbol);
          }
        }

        // Validar APENAS preços (volume pode ser 0)
        if (!spotBidPrice || !spotAskPrice || !futuresBidPrice || !futuresAskPrice ||
            spotBidPrice <= 0 || spotAskPrice <= 0 || futuresBidPrice <= 0 || futuresAskPrice <= 0) {
          pairsSkippedInvalidPrice++;
          if (targetPairs.includes(baseSymbol)) {
            console.log(`❌ ${baseSymbol} - IGNORADO por preços inválidos`);
          }
          if (pairsSkippedInvalidPrice <= 10) {
            skippedPairs.push(`${baseSymbol} (preços inválidos)`);
          }
          return;
        }

        pairsWithValidPrices++;
        
        if (targetPairs.includes(baseSymbol)) {
          console.log(`✅ ${baseSymbol} - ADICIONADO às oportunidades (vol=${spotVolume})`);
        }

        // DIREÇÃO 1: LONG SPOT + SHORT FUTURES (Cash and Carry) - ENTRADA
        // Comprar Spot (pagar askPrice) + Vender Futures/Short (receber bidPrice)
        // Lucro = (Futures Bid - Spot Ask) / Spot Ask - taxas
        const spreadGrossLong = ((futuresBidPrice - spotAskPrice) / spotAskPrice) * 100;
        const spreadNetLong = spreadGrossLong - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // DIREÇÃO 2: SHORT SPOT + LONG FUTURES (Reverse Cash and Carry) - SAÍDA
        // Vender Spot (receber bidPrice) + Comprar Futures/Long (pagar askPrice)
        // Lucro = (Spot Bid - Futures Ask) / Futures Ask - taxas
        const spreadGrossShort = ((spotBidPrice - futuresAskPrice) / futuresAskPrice) * 100;
        const spreadNetShort = spreadGrossShort - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // Combinar ambas as direções em uma única oportunidade
        opportunitiesFound++;
        
        const opp = {
          pair_symbol: baseSymbol,
          spot_bid_price: spotBidPrice,
          spot_volume_24h: spotVolume,
          futures_ask_price: futuresAskPrice,
          futures_volume_24h: futuresVolume,
          spread_gross_percent: spreadGrossLong,
          spread_net_percent: spreadNetLong, // Mantém compatibilidade (usa entrada)
          spread_net_percent_entrada: spreadNetLong,
          spread_net_percent_saida: spreadNetShort,
          spot_taker_fee: SPOT_TAKER_FEE,
          futures_taker_fee: FUTURES_TAKER_FEE,
          is_active: true,
          timestamp: new Date().toISOString()
        };
        
        opportunities.push(opp);

        if (opportunitiesFound <= 5) {
          console.log(`💰 ${baseSymbol}: Entrada=${spreadNetLong.toFixed(4)}% | Saída=${spreadNetShort.toFixed(4)}%`);
        }
      });

      console.log(`\n📊 Resumo do processamento:`);
      console.log(`   - Pares totais processados: ${pairsProcessed}`);
      console.log(`   - Pares com preços válidos: ${pairsWithValidPrices}`);
      console.log(`   - Pares com volume ZERO: ${pairsWithZeroVolume}`);
      console.log(`   - Pares ignorados por preços inválidos: ${pairsSkippedInvalidPrice}`);
      console.log(`   - Oportunidades criadas (incluindo volume 0): ${opportunitiesFound}`);
      console.log(`   - Retornando ${opportunities.length} oportunidades`);
      if (zeroVolumePairs.length > 0) {
        console.log(`   - Exemplos com volume ZERO: ${zeroVolumePairs.join(', ')}`);
      }
      if (skippedPairs.length > 0) {
        console.log(`   - Exemplos de pares ignorados: ${skippedPairs.join(', ')}`);
      }
      
      return opportunities;
    };

    // Executar processamento
    const opportunities = await processOpportunities();

    return new Response(
      JSON.stringify({ 
        message: 'Dados processados com sucesso',
        status: 'completed',
        opportunities: opportunities || []
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