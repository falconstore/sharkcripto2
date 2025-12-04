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
  fundingRate: string;
}

// Taxas da MEXC (em %)
const SPOT_TAKER_FEE = 0.10;
const FUTURES_TAKER_FEE = 0.02;

// Spread máximo válido para registrar cruzamento (evitar dados absurdos)
const MAX_VALID_SPREAD = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MEXC Arbitrage Monitor Starting ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mapa para rastrear último cruzamento de cada moeda (evitar duplicatas)
    const lastCrossings = new Map<string, number>();

    // Função auxiliar para registrar cruzamento (VALIDADA)
    const registerCrossing = async (pairSymbol: string, spreadNetPercentSaida: number) => {
      // VALIDAÇÃO: Só registrar spreads válidos (0% a 10%)
      if (spreadNetPercentSaida <= 0 || spreadNetPercentSaida > MAX_VALID_SPREAD) {
        return;
      }

      const now = Date.now();
      const lastCrossing = lastCrossings.get(pairSymbol) || 0;
      
      // Só registrar se passou mais de 30 segundos desde o último cruzamento
      if (now - lastCrossing < 30000) {
        return;
      }

      try {
        const { error } = await supabase
          .from('pair_crossings')
          .insert({
            pair_symbol: pairSymbol,
            spread_net_percent_saida: spreadNetPercentSaida,
            timestamp: new Date().toISOString(),
          });

        if (error) {
          console.error(`Erro ao registrar cruzamento para ${pairSymbol}:`, error);
        } else {
          lastCrossings.set(pairSymbol, now);
          console.log(`✅ CRUZAMENTO registrado: ${pairSymbol} - Saída: ${spreadNetPercentSaida.toFixed(2)}%`);
        }
      } catch (err) {
        console.error(`Erro ao registrar cruzamento para ${pairSymbol}:`, err);
      }
    };

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
          data.data.forEach((ticker) => {
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
        return [];
      }

      let opportunitiesFound = 0;
      let pairsProcessed = 0;
      let crossingsRegistered = 0;
      const opportunities: any[] = [];

      // Processar cada par que existe em ambos os mercados
      for (const [baseSymbol, spotTicker] of spotTickers) {
        const futuresTicker = futuresTickers.get(baseSymbol);
        
        if (!futuresTicker) {
          continue;
        }
        
        pairsProcessed++;

        // Parse preços com validação
        const spotBidPrice = parseFloat(spotTicker.bidPrice);  // Preço de VENDA do spot (para saída)
        const spotAskPrice = parseFloat(spotTicker.askPrice);  // Preço de COMPRA do spot (para entrada)
        const spotVolume = parseFloat(spotTicker.quoteVolume) || 0;
        const futuresBidPrice = parseFloat(futuresTicker.bid1); // Preço de VENDA do futures (para entrada)
        const futuresAskPrice = parseFloat(futuresTicker.ask1); // Preço de COMPRA do futures (para saída)
        const futuresVolume = parseFloat(futuresTicker.volume24) || 0;

        // Validação: ignorar preços inválidos
        if (!spotBidPrice || !spotAskPrice || !futuresBidPrice || !futuresAskPrice ||
            spotBidPrice <= 0 || spotAskPrice <= 0 || futuresBidPrice <= 0 || futuresAskPrice <= 0) {
          continue;
        }

        // DIREÇÃO 1: LONG SPOT + SHORT FUTURES (Cash and Carry) - ENTRADA
        // Compra Spot (paga ASK) + Vende Futures (recebe BID)
        const spreadGrossLong = ((futuresBidPrice - spotAskPrice) / spotAskPrice) * 100;
        const spreadNetLong = spreadGrossLong - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // DIREÇÃO 2: SHORT SPOT + LONG FUTURES (Reverse Cash and Carry) - SAÍDA
        // Vende Spot (recebe BID) + Compra Futures (paga ASK)
        const spreadGrossShort = ((spotBidPrice - futuresAskPrice) / futuresAskPrice) * 100;
        const spreadNetShort = spreadGrossShort - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // Detectar e registrar cruzamento (apenas spreads válidos 0-10%)
        if (spreadNetShort > 0 && spreadNetShort <= MAX_VALID_SPREAD) {
          await registerCrossing(baseSymbol, spreadNetShort);
          crossingsRegistered++;
        }

        opportunitiesFound++;
        
        const fundingRate = parseFloat(futuresTicker.fundingRate) || 0;

        const opp = {
          pair_symbol: baseSymbol,
          // Preços para SAÍDA (reverse cash and carry)
          spot_bid_price: spotBidPrice,     // Vende Spot - recebe BID
          futures_ask_price: futuresAskPrice, // Compra Futures - paga ASK
          // Preços para ENTRADA (cash and carry) - NOVOS CAMPOS
          spot_ask_price: spotAskPrice,     // Compra Spot - paga ASK
          futures_bid_price: futuresBidPrice, // Vende Futures - recebe BID
          // Volumes
          spot_volume_24h: spotVolume,
          futures_volume_24h: futuresVolume,
          // Spreads
          spread_gross_percent: spreadGrossLong,
          spread_net_percent: spreadNetLong,
          spread_net_percent_entrada: spreadNetLong,
          spread_net_percent_saida: spreadNetShort,
          // Taxas
          spot_taker_fee: SPOT_TAKER_FEE,
          futures_taker_fee: FUTURES_TAKER_FEE,
          funding_rate: fundingRate,
          is_active: true,
          timestamp: new Date().toISOString()
        };
        
        opportunities.push(opp);
      }

      // Salvar no banco de dados
      if (opportunities.length > 0) {
        console.log(`\n💾 Salvando ${opportunities.length} oportunidades no banco...`);
        
        // Desativar oportunidades antigas
        const { error: updateError } = await supabase
          .from('arbitrage_opportunities')
          .update({ is_active: false })
          .eq('is_active', true);

        if (updateError) {
          console.error('Erro ao desativar oportunidades antigas:', updateError);
        }

        // Inserir novas oportunidades
        const { error: insertError } = await supabase
          .from('arbitrage_opportunities')
          .upsert(opportunities, { 
            onConflict: 'pair_symbol',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error('Erro ao inserir oportunidades:', insertError);
        } else {
          console.log(`✅ ${opportunities.length} oportunidades salvas com sucesso`);
        }
      }

      console.log(`\n📊 Resumo do processamento:`);
      console.log(`   - Pares processados: ${pairsProcessed}`);
      console.log(`   - Oportunidades criadas: ${opportunitiesFound}`);
      console.log(`   - Cruzamentos válidos registrados: ${crossingsRegistered}`);
      
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
