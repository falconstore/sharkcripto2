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

// Spread mínimo para registrar cruzamento (evitar micro-cruzamentos)
const MIN_VALID_SPREAD = 0.05;

// Cooldown em minutos entre cruzamentos da mesma moeda
const CROSSING_COOLDOWN_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MEXC Arbitrage Monitor Starting ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Função para verificar cooldown persistente no banco
    const checkCooldown = async (pairSymbol: string): Promise<boolean> => {
      try {
        const { data } = await supabase
          .from('crossing_cooldowns')
          .select('last_crossing_at')
          .eq('pair_symbol', pairSymbol)
          .maybeSingle();

        if (!data) return true; // Nunca cruzou, pode registrar

        const lastCrossing = new Date(data.last_crossing_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastCrossing.getTime()) / (1000 * 60);

        return diffMinutes >= CROSSING_COOLDOWN_MINUTES;
      } catch (err) {
        console.error(`Erro ao verificar cooldown para ${pairSymbol}:`, err);
        return false; // Em caso de erro, não registrar
      }
    };

    // Função para atualizar cooldown no banco
    const updateCooldown = async (pairSymbol: string) => {
      try {
        await supabase
          .from('crossing_cooldowns')
          .upsert({
            pair_symbol: pairSymbol,
            last_crossing_at: new Date().toISOString(),
          }, { onConflict: 'pair_symbol' });
      } catch (err) {
        console.error(`Erro ao atualizar cooldown para ${pairSymbol}:`, err);
      }
    };

    // Função auxiliar para registrar cruzamento (VALIDADA com cooldown persistente)
    const registerCrossing = async (pairSymbol: string, spreadNetPercentSaida: number) => {
      // VALIDAÇÃO: Só registrar spreads válidos (MIN% a MAX%)
      if (spreadNetPercentSaida < MIN_VALID_SPREAD || spreadNetPercentSaida > MAX_VALID_SPREAD) {
        return false;
      }

      // Verificar cooldown persistente no banco
      const canRegister = await checkCooldown(pairSymbol);
      if (!canRegister) {
        return false;
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
          return false;
        }

        // Atualizar cooldown no banco
        await updateCooldown(pairSymbol);
        console.log(`✅ CRUZAMENTO registrado: ${pairSymbol} - Saída: ${spreadNetPercentSaida.toFixed(2)}%`);
        return true;
      } catch (err) {
        console.error(`Erro ao registrar cruzamento para ${pairSymbol}:`, err);
        return false;
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

      // Permitir continuar mesmo se um dos mercados não tiver dados
      if (spotTickers.size === 0 && futuresTickers.size === 0) {
        console.log('⚠️ No data fetched from both markets, skipping this cycle');
        return [];
      }

      let opportunitiesFound = 0;
      let pairsProcessed = 0;
      let crossingsRegistered = 0;
      const opportunities: any[] = [];

      // CORREÇÃO: Criar união de TODAS as moedas (spot + futures)
      const allSymbols = new Set<string>([
        ...spotTickers.keys(),
        ...futuresTickers.keys()
      ]);

      console.log(`📊 Total de símbolos únicos (união spot+futures): ${allSymbols.size}`);

      // Processar cada par que existe em PELO MENOS um mercado
      for (const baseSymbol of allSymbols) {
        const spotTicker = spotTickers.get(baseSymbol);
        const futuresTicker = futuresTickers.get(baseSymbol);
        
        // Precisa existir em pelo menos um mercado
        if (!spotTicker && !futuresTicker) {
          continue;
        }
        
        pairsProcessed++;

        // Parse preços com fallback para 0 quando não existe no mercado
        const spotBidPrice = spotTicker ? parseFloat(spotTicker.bidPrice) || 0 : 0;
        const spotAskPrice = spotTicker ? parseFloat(spotTicker.askPrice) || 0 : 0;
        const spotVolume = spotTicker ? parseFloat(spotTicker.quoteVolume) || 0 : 0;
        const futuresBidPrice = futuresTicker ? parseFloat(futuresTicker.bid1) || 0 : 0;
        const futuresAskPrice = futuresTicker ? parseFloat(futuresTicker.ask1) || 0 : 0;
        const futuresVolume = futuresTicker ? parseFloat(futuresTicker.volume24) || 0 : 0;

        // Verificar se temos preços válidos para calcular spreads
        const hasValidSpotPrices = spotBidPrice > 0 && spotAskPrice > 0;
        const hasValidFuturesPrices = futuresBidPrice > 0 && futuresAskPrice > 0;

        let spreadGrossLong = 0;
        let spreadNetLong = 0;
        let spreadGrossShort = 0;
        let spreadNetShort = 0;

        // Só calcular spreads se tivermos preços em AMBOS mercados
        if (hasValidSpotPrices && hasValidFuturesPrices) {
          // DIREÇÃO 1: LONG SPOT + SHORT FUTURES (Cash and Carry) - ENTRADA
          spreadGrossLong = ((futuresBidPrice - spotAskPrice) / spotAskPrice) * 100;
          spreadNetLong = spreadGrossLong - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

          // DIREÇÃO 2: SHORT SPOT + LONG FUTURES (Reverse Cash and Carry) - SAÍDA
          // CORRIGIDO: Divide pelo spotBidPrice (igual às calculadoras Shark)
          spreadGrossShort = ((spotBidPrice - futuresAskPrice) / spotBidPrice) * 100;
          spreadNetShort = spreadGrossShort - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

          // Detectar e registrar cruzamento (com cooldown persistente)
          if (spreadNetShort >= MIN_VALID_SPREAD && spreadNetShort <= MAX_VALID_SPREAD) {
            const registered = await registerCrossing(baseSymbol, spreadNetShort);
            if (registered) {
              crossingsRegistered++;
            }
          }
        }

        opportunitiesFound++;
        
        const fundingRate = futuresTicker ? parseFloat(futuresTicker.fundingRate) || 0 : 0;

        const opp = {
          pair_symbol: baseSymbol,
          // Preços para SAÍDA (reverse cash and carry)
          spot_bid_price: spotBidPrice,
          futures_ask_price: futuresAskPrice,
          // Preços para ENTRADA (cash and carry)
          spot_ask_price: spotAskPrice,
          futures_bid_price: futuresBidPrice,
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

      // Salvar no banco de dados usando DELETE + INSERT (mais confiável)
      if (opportunities.length > 0) {
        console.log(`\n💾 Salvando ${opportunities.length} oportunidades no banco...`);
        
        // 1. Deletar todas as oportunidades existentes
        const { error: deleteError } = await supabase
          .from('arbitrage_opportunities')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) {
          console.error('Erro ao deletar oportunidades antigas:', deleteError);
        }

        // 2. Inserir novas oportunidades
        const { error: insertError } = await supabase
          .from('arbitrage_opportunities')
          .insert(opportunities);

        if (insertError) {
          console.error('Erro ao inserir oportunidades:', insertError);
        } else {
          console.log(`✅ ${opportunities.length} oportunidades salvas com sucesso`);
        }
      }

      console.log(`\n📊 Resumo do processamento:`);
      console.log(`   - Símbolos únicos (união): ${allSymbols.size}`);
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
