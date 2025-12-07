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

// Taxas zeradas - operação sem comissões
const SPOT_TAKER_FEE = 0;
const FUTURES_TAKER_FEE = 0;

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
    const startTime = Date.now();
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
          console.error('Spot API error:', response.status);
          return new Map();
        }
        
        const data: SpotTicker[] = await response.json();
        const usdtPairs = new Map<string, SpotTicker>();
        
        for (const ticker of data) {
          if (ticker.symbol.endsWith('USDT')) {
            usdtPairs.set(normalizeSymbol(ticker.symbol), ticker);
          }
        }
        
        return usdtPairs;
      } catch (error) {
        console.error('Error fetching spot:', error);
        return new Map();
      }
    };

    // Função para buscar tickers de Futuros
    const fetchFuturesTickers = async (): Promise<Map<string, FuturesTicker>> => {
      try {
        const response = await fetch('https://contract.mexc.com/api/v1/contract/ticker');
        if (!response.ok) {
          console.error('Futures API error:', response.status);
          return new Map();
        }
        
        const data: { data: FuturesTicker[] } = await response.json();
        const usdtPairs = new Map<string, FuturesTicker>();
        
        if (data.data && Array.isArray(data.data)) {
          for (const ticker of data.data) {
            if (ticker.symbol.endsWith('_USDT')) {
              usdtPairs.set(normalizeSymbol(ticker.symbol), ticker);
            }
          }
        }
        
        return usdtPairs;
      } catch (error) {
        console.error('Error fetching futures:', error);
        return new Map();
      }
    };

    // OTIMIZAÇÃO 1: Carregar TODOS cooldowns de uma vez
    const fetchAllCooldowns = async (): Promise<Map<string, Date>> => {
      try {
        const { data } = await supabase
          .from('crossing_cooldowns')
          .select('pair_symbol, last_crossing_at');
        
        const cooldownMap = new Map<string, Date>();
        if (data) {
          for (const row of data) {
            cooldownMap.set(row.pair_symbol, new Date(row.last_crossing_at));
          }
        }
        return cooldownMap;
      } catch (err) {
        console.error('Erro ao carregar cooldowns:', err);
        return new Map();
      }
    };

    // Verificar cooldown em memória (sem query)
    const checkCooldownInMemory = (pairSymbol: string, cooldownMap: Map<string, Date>): boolean => {
      const lastCrossing = cooldownMap.get(pairSymbol);
      if (!lastCrossing) return true; // Nunca cruzou, pode registrar
      
      const now = new Date();
      const diffMinutes = (now.getTime() - lastCrossing.getTime()) / (1000 * 60);
      return diffMinutes >= CROSSING_COOLDOWN_MINUTES;
    };

    // OTIMIZAÇÃO 2: Buscar dados em paralelo (APIs + cooldowns)
    const [spotTickers, futuresTickers, cooldownMap] = await Promise.all([
      fetchSpotTickers(),
      fetchFuturesTickers(),
      fetchAllCooldowns()
    ]);

    console.log(`📊 Spot: ${spotTickers.size}, Futures: ${futuresTickers.size}, Cooldowns: ${cooldownMap.size}`);

    if (spotTickers.size === 0 && futuresTickers.size === 0) {
      return new Response(
        JSON.stringify({ message: 'No data from APIs', status: 'skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar união de todas as moedas
    const allSymbols = new Set<string>([
      ...spotTickers.keys(),
      ...futuresTickers.keys()
    ]);

    const opportunities: any[] = [];
    const pendingCrossings: { pair_symbol: string; spread_net_percent_saida: number; timestamp: string }[] = [];
    const cooldownsToUpdate: { pair_symbol: string; last_crossing_at: string }[] = [];
    const now = new Date().toISOString();

    // OTIMIZAÇÃO 3: Processar tudo em memória (sem awaits no loop)
    for (const baseSymbol of allSymbols) {
      const spotTicker = spotTickers.get(baseSymbol);
      const futuresTicker = futuresTickers.get(baseSymbol);
      
      if (!spotTicker && !futuresTicker) continue;

      // Parse preços
      const spotBidPrice = spotTicker ? parseFloat(spotTicker.bidPrice) || 0 : 0;
      const spotAskPrice = spotTicker ? parseFloat(spotTicker.askPrice) || 0 : 0;
      const spotVolume = spotTicker ? parseFloat(spotTicker.quoteVolume) || 0 : 0;
      const futuresBidPrice = futuresTicker ? parseFloat(futuresTicker.bid1) || 0 : 0;
      const futuresAskPrice = futuresTicker ? parseFloat(futuresTicker.ask1) || 0 : 0;
      const futuresVolume = futuresTicker ? parseFloat(futuresTicker.volume24) || 0 : 0;

      const hasValidSpotPrices = spotBidPrice > 0 && spotAskPrice > 0;
      const hasValidFuturesPrices = futuresBidPrice > 0 && futuresAskPrice > 0;

      let spreadGrossLong = 0;
      let spreadNetLong = 0;
      let spreadGrossShort = 0;
      let spreadNetShort = 0;

      if (hasValidSpotPrices && hasValidFuturesPrices) {
        // ENTRADA: LONG SPOT + SHORT FUTURES
        spreadGrossLong = ((futuresBidPrice - spotAskPrice) / spotAskPrice) * 100;
        spreadNetLong = spreadGrossLong - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // SAÍDA: SHORT SPOT + LONG FUTURES
        spreadGrossShort = ((spotBidPrice - futuresAskPrice) / spotBidPrice) * 100;
        spreadNetShort = spreadGrossShort - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

        // OTIMIZAÇÃO: Verificar cooldown em memória (sem query)
        if (spreadNetShort >= MIN_VALID_SPREAD && spreadNetShort <= MAX_VALID_SPREAD) {
          if (checkCooldownInMemory(baseSymbol, cooldownMap)) {
            pendingCrossings.push({
              pair_symbol: baseSymbol,
              spread_net_percent_saida: spreadNetShort,
              timestamp: now
            });
            cooldownsToUpdate.push({
              pair_symbol: baseSymbol,
              last_crossing_at: now
            });
            // Atualizar mapa local para evitar duplicatas no mesmo ciclo
            cooldownMap.set(baseSymbol, new Date());
          }
        }
      }

      const fundingRate = futuresTicker ? parseFloat(futuresTicker.fundingRate) || 0 : 0;

      opportunities.push({
        pair_symbol: baseSymbol,
        spot_bid_price: spotBidPrice,
        futures_ask_price: futuresAskPrice,
        spot_ask_price: spotAskPrice,
        futures_bid_price: futuresBidPrice,
        spot_volume_24h: spotVolume,
        futures_volume_24h: futuresVolume,
        spread_gross_percent: spreadGrossLong,
        spread_net_percent: spreadNetLong,
        spread_net_percent_entrada: spreadNetLong,
        spread_net_percent_saida: spreadNetShort,
        spot_taker_fee: SPOT_TAKER_FEE,
        futures_taker_fee: FUTURES_TAKER_FEE,
        funding_rate: fundingRate,
        is_active: true,
        timestamp: now
      });
    }

    // OTIMIZAÇÃO 4: Executar operações de banco em paralelo
    const dbOperations: Promise<void>[] = [];

    // Helper para converter PostgrestFilterBuilder em Promise
    const upsertOpportunities = async (chunk: any[]) => {
      const { error } = await supabase
        .from('arbitrage_opportunities')
        .upsert(chunk, { onConflict: 'pair_symbol', ignoreDuplicates: false });
      if (error) console.error('Erro upsert oportunidades:', error.message);
    };

    const insertCrossings = async () => {
      const { error } = await supabase
        .from('pair_crossings')
        .insert(pendingCrossings);
      if (error) console.error('Erro insert cruzamentos:', error.message);
      else console.log(`✅ ${pendingCrossings.length} cruzamentos registrados`);
    };

    const upsertCooldowns = async () => {
      const { error } = await supabase
        .from('crossing_cooldowns')
        .upsert(cooldownsToUpdate, { onConflict: 'pair_symbol' });
      if (error) console.error('Erro upsert cooldowns:', error.message);
    };

    // 4a. UPSERT oportunidades em chunks
    if (opportunities.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < opportunities.length; i += chunkSize) {
        const chunk = opportunities.slice(i, i + chunkSize);
        dbOperations.push(upsertOpportunities(chunk));
      }
    }

    // 4b. Inserir cruzamentos em batch
    if (pendingCrossings.length > 0) {
      dbOperations.push(insertCrossings());
    }

    // 4c. Atualizar cooldowns em batch
    if (cooldownsToUpdate.length > 0) {
      dbOperations.push(upsertCooldowns());
    }

    // Aguardar todas as operações de banco
    await Promise.all(dbOperations);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Concluído em ${elapsed}ms | ${opportunities.length} pares | ${pendingCrossings.length} cruzamentos`);

    return new Response(
      JSON.stringify({ 
        message: 'Processado com sucesso',
        status: 'completed',
        stats: {
          pairs: opportunities.length,
          crossings: pendingCrossings.length,
          elapsed_ms: elapsed
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
