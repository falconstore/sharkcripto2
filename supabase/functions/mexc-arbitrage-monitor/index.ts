import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpotBookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

interface SpotTicker {
  symbol: string;
  quoteVolume: string;
}

interface FuturesTicker {
  symbol: string;
  ask1: number;
  amount24: number;
}

interface PairData {
  spotBidPrice: number | null;
  spotVolume24h: number | null;
  futuresAskPrice: number | null;
  futuresVolume24h: number | null;
}

// Taxas da MEXC (em %)
const SPOT_TAKER_FEE = 0.10;
const FUTURES_TAKER_FEE = 0.02;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting MEXC Arbitrage Monitor...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todos os pares USDT disponíveis
    const fetchUSDTPairs = async (): Promise<string[]> => {
      try {
        // API Spot MEXC para obter todos os símbolos
        const spotResponse = await fetch('https://api.mexc.com/api/v3/exchangeInfo');
        const spotData = await spotResponse.json();
        
        const usdtPairs = spotData.symbols
          .filter((s: any) => s.symbol.endsWith('USDT') && s.status === 'ENABLED')
          .map((s: any) => s.symbol)
          .slice(0, 100); // Limitar a 100 pares para evitar sobrecarga
        
        console.log(`Found ${usdtPairs.length} USDT pairs on MEXC`);
        return usdtPairs;
      } catch (error) {
        console.error('Error fetching USDT pairs:', error);
        return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT']; // Fallback
      }
    };

    const usdtPairs = await fetchUSDTPairs();
    console.log('Monitoring pairs:', usdtPairs.join(', '));

    // Armazenar dados por par
    const pairDataMap = new Map<string, PairData>();

    // Função para processar oportunidades
    const processOpportunity = async (pairSymbol: string) => {
      const data = pairDataMap.get(pairSymbol);
      
      if (!data || 
          data.spotBidPrice === null || 
          data.spotVolume24h === null ||
          data.futuresAskPrice === null ||
          data.futuresVolume24h === null) {
        return; // Dados incompletos
      }

      // Filtro de liquidez mínima
      if (data.spotVolume24h < 100000 || data.futuresVolume24h < 100000) {
        return; // Volume muito baixo
      }

      // Calcular spread
      const spotPrice = data.spotBidPrice;
      const futuresPrice = data.futuresAskPrice;
      
      const spreadGross = ((futuresPrice - spotPrice) / spotPrice) * 100;
      const spreadNet = spreadGross - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

      // Apenas oportunidades com spread líquido positivo
      if (spreadNet <= 0) {
        return;
      }

      console.log(`Opportunity found: ${pairSymbol} - ${spreadNet.toFixed(4)}%`);

      // Inserir no banco
      const { error } = await supabase
        .from('arbitrage_opportunities')
        .insert({
          pair_symbol: pairSymbol,
          spot_bid_price: spotPrice,
          spot_volume_24h: data.spotVolume24h,
          futures_ask_price: futuresPrice,
          futures_volume_24h: data.futuresVolume24h,
          spread_gross_percent: spreadGross,
          spread_net_percent: spreadNet,
          spot_taker_fee: SPOT_TAKER_FEE,
          futures_taker_fee: FUTURES_TAKER_FEE,
          is_active: true
        });

      if (error) {
        console.error(`Error inserting opportunity for ${pairSymbol}:`, error);
      }
    };

    // Conectar ao WebSocket do Spot (MEXC)
    const connectSpot = async () => {
      const spotWs = new WebSocket('wss://wbs.mexc.com/ws');

      spotWs.onopen = () => {
        console.log('Spot WebSocket connected');
        
        // Subscrever a todos os pares USDT
        usdtPairs.forEach(pair => {
          // BookTicker para preços
          spotWs.send(JSON.stringify({
            method: 'SUBSCRIPTION',
            params: [`spot@public.bookTicker.v3.api@${pair}`]
          }));
          
          // Ticker para volume
          spotWs.send(JSON.stringify({
            method: 'SUBSCRIPTION',
            params: [`spot@public.ticker.v3.api@${pair}`]
          }));
        });
        
        console.log(`Subscribed to ${usdtPairs.length} spot pairs`);
      };

      spotWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.c === 'spot@public.bookTicker.v3.api') {
            const data: SpotBookTicker = msg.d;
            const symbol = data.symbol;
            
            if (!pairDataMap.has(symbol)) {
              pairDataMap.set(symbol, {
                spotBidPrice: null,
                spotVolume24h: null,
                futuresAskPrice: null,
                futuresVolume24h: null
              });
            }
            
            const pairData = pairDataMap.get(symbol)!;
            pairData.spotBidPrice = parseFloat(data.bidPrice);
            
            processOpportunity(symbol);
          }
          
          if (msg.c === 'spot@public.ticker.v3.api') {
            const data: SpotTicker = msg.d;
            const symbol = data.symbol;
            
            if (!pairDataMap.has(symbol)) {
              pairDataMap.set(symbol, {
                spotBidPrice: null,
                spotVolume24h: null,
                futuresAskPrice: null,
                futuresVolume24h: null
              });
            }
            
            const pairData = pairDataMap.get(symbol)!;
            pairData.spotVolume24h = parseFloat(data.quoteVolume);
            
            processOpportunity(symbol);
          }
        } catch (error) {
          console.error('Error processing spot message:', error);
        }
      };

      spotWs.onerror = (error) => {
        console.error('Spot WebSocket error:', error);
      };

      spotWs.onclose = () => {
        console.log('Spot WebSocket closed, reconnecting in 5s...');
        setTimeout(connectSpot, 5000);
      };
    };

    // Conectar ao WebSocket dos Futuros (MEXC)
    const connectFutures = async () => {
      const futuresWs = new WebSocket('wss://contract.mexc.com/edge');

      futuresWs.onopen = () => {
        console.log('Futures WebSocket connected');
        
        // Converter BTCUSDT -> BTC_USDT para futuros
        const futuresPairs = usdtPairs.map(pair => {
          // Remove USDT e adiciona _USDT
          const base = pair.replace('USDT', '');
          return `${base}_USDT`;
        });
        
        futuresPairs.forEach(pair => {
          futuresWs.send(JSON.stringify({
            method: 'sub.ticker',
            param: {
              symbol: pair
            }
          }));
        });
        
        console.log(`Subscribed to ${futuresPairs.length} futures pairs`);
      };

      futuresWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.channel === 'push.ticker' && msg.data) {
            const data: FuturesTicker = msg.data;
            // Converter BTC_USDT para BTCUSDT
            const symbol = data.symbol.replace('_', '');
            
            if (!pairDataMap.has(symbol)) {
              pairDataMap.set(symbol, {
                spotBidPrice: null,
                spotVolume24h: null,
                futuresAskPrice: null,
                futuresVolume24h: null
              });
            }
            
            const pairData = pairDataMap.get(symbol)!;
            pairData.futuresAskPrice = data.ask1;
            pairData.futuresVolume24h = data.amount24;
            
            processOpportunity(symbol);
          }
        } catch (error) {
          console.error('Error processing futures message:', error);
        }
      };

      futuresWs.onerror = (error) => {
        console.error('Futures WebSocket error:', error);
      };

      futuresWs.onclose = () => {
        console.log('Futures WebSocket closed, reconnecting in 5s...');
        setTimeout(connectFutures, 5000);
      };
    };

    // Iniciar conexões
    connectSpot();
    connectFutures();

    // Esta função roda continuamente
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
    console.error('Error in MEXC monitor:', error);
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