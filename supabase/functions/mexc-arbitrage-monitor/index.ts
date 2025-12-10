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

    // OTIMIZAÇÃO 1: Carregar TODOS cooldowns de uma vez (saída + entrada)
    const fetchAllCooldowns = async (): Promise<Map<string, Date>> => {
      try {
        const [{ data: saidaData }, { data: entradaData }] = await Promise.all([
          supabase.from('crossing_cooldowns').select('pair_symbol, last_crossing_at'),
          supabase.from('crossing_cooldowns_entrada').select('pair_symbol, last_crossing_at')
        ]);
        
        const cooldownMap = new Map<string, Date>();
        if (saidaData) {
          for (const row of saidaData) {
            cooldownMap.set(row.pair_symbol, new Date(row.last_crossing_at));
          }
        }
        if (entradaData) {
          for (const row of entradaData) {
            cooldownMap.set(`${row.pair_symbol}_entrada`, new Date(row.last_crossing_at));
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
    const pendingCrossingsEntrada: { pair_symbol: string; spread_net_percent_entrada: number; timestamp: string }[] = [];
    const cooldownsToUpdate: { pair_symbol: string; last_crossing_at: string }[] = [];
    const cooldownsEntradaToUpdate: { pair_symbol: string; last_crossing_at: string }[] = [];
    const spreadHistoryToSave: { pair_symbol: string; spread_entrada: number; spread_saida: number; timestamp: string }[] = [];
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

        // CRUZAMENTO DE SAÍDA: Quando spread de saída fica positivo
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
            cooldownMap.set(baseSymbol, new Date());
          }
        }

        // CRUZAMENTO DE ENTRADA: Quando spread de entrada fica positivo
        if (spreadNetLong >= MIN_VALID_SPREAD && spreadNetLong <= MAX_VALID_SPREAD) {
          const entradaKey = `${baseSymbol}_entrada`;
          if (checkCooldownInMemory(entradaKey, cooldownMap)) {
            pendingCrossingsEntrada.push({
              pair_symbol: baseSymbol,
              spread_net_percent_entrada: spreadNetLong,
              timestamp: now
            });
            cooldownsEntradaToUpdate.push({
              pair_symbol: baseSymbol,
              last_crossing_at: now
            });
            cooldownMap.set(entradaKey, new Date());
          }
        }
      }

      const fundingRate = futuresTicker ? parseFloat(futuresTicker.fundingRate) || 0 : 0;

      // Salvar histórico de spread para TODOS os pares com preços válidos
      if (hasValidSpotPrices && hasValidFuturesPrices) {
        spreadHistoryToSave.push({
          pair_symbol: baseSymbol,
          spread_entrada: spreadNetLong,
          spread_saida: spreadNetShort,
          timestamp: now
        });
      }

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

    // Salvar cruzamentos e cooldowns (oportunidades retornam direto no JSON)
    const dbOperations: Promise<void>[] = [];

    // Cruzamentos de SAÍDA
    const insertCrossings = async () => {
      const { error } = await supabase
        .from('pair_crossings')
        .insert(pendingCrossings);
      if (error) console.error('Erro insert cruzamentos saída:', error.message);
      else console.log(`✅ ${pendingCrossings.length} cruzamentos de SAÍDA registrados`);
    };

    const upsertCooldowns = async () => {
      const { error } = await supabase
        .from('crossing_cooldowns')
        .upsert(cooldownsToUpdate, { onConflict: 'pair_symbol' });
      if (error) console.error('Erro upsert cooldowns saída:', error.message);
    };

    // Cruzamentos de ENTRADA
    const insertCrossingsEntrada = async () => {
      const { error } = await supabase
        .from('pair_crossings_entrada')
        .insert(pendingCrossingsEntrada);
      if (error) console.error('Erro insert cruzamentos entrada:', error.message);
      else console.log(`✅ ${pendingCrossingsEntrada.length} cruzamentos de ENTRADA registrados`);
    };

    const upsertCooldownsEntrada = async () => {
      const { error } = await supabase
        .from('crossing_cooldowns_entrada')
        .upsert(cooldownsEntradaToUpdate, { onConflict: 'pair_symbol' });
      if (error) console.error('Erro upsert cooldowns entrada:', error.message);
    };

    // Inserir cruzamentos de saída
    if (pendingCrossings.length > 0) {
      dbOperations.push(insertCrossings());
    }
    if (cooldownsToUpdate.length > 0) {
      dbOperations.push(upsertCooldowns());
    }

    // Inserir cruzamentos de entrada
    if (pendingCrossingsEntrada.length > 0) {
      dbOperations.push(insertCrossingsEntrada());
    }
    if (cooldownsEntradaToUpdate.length > 0) {
      dbOperations.push(upsertCooldownsEntrada());
    }

    // Função para dividir array em chunks
    const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Inserir histórico de spreads em CHUNKS de 500 (salva TODOS os pares)
    const CHUNK_SIZE = 500;
    const insertSpreadHistory = async () => {
      if (spreadHistoryToSave.length === 0) return;
      
      const chunks = chunkArray(spreadHistoryToSave, CHUNK_SIZE);
      console.log(`📦 Salvando ${spreadHistoryToSave.length} registros em ${chunks.length} chunks de ${CHUNK_SIZE}`);
      
      // Inserir todos os chunks em paralelo
      const results = await Promise.all(
        chunks.map(async (chunk, index) => {
          const { error } = await supabase
            .from('spread_history')
            .insert(chunk);
          if (error) {
            console.error(`❌ Chunk ${index + 1}: ${error.message}`);
            return 0;
          }
          return chunk.length;
        })
      );
      
      const totalSaved = results.reduce((a, b) => a + b, 0);
      console.log(`✅ ${totalSaved} registros de histórico de spread salvos`);
    };

    dbOperations.push(insertSpreadHistory());

    // Aguardar operações de banco
    await Promise.all(dbOperations);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Concluído em ${elapsed}ms | ${opportunities.length} pares | ${pendingCrossings.length} cruzamentos saída | ${pendingCrossingsEntrada.length} cruzamentos entrada | ${spreadHistoryToSave.length} histórico`);

    return new Response(
      JSON.stringify({ 
        message: 'Processado com sucesso',
        status: 'completed',
        opportunities: opportunities,
        stats: {
          pairs: opportunities.length,
          crossings_saida: pendingCrossings.length,
          crossings_entrada: pendingCrossingsEntrada.length,
          spread_history_saved: spreadHistoryToSave.length,
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
