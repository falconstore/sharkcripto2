import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import protobuf from "https://esm.sh/protobufjs@7.2.5";

const SPOT_WS_URL = "wss://wbs-api.mexc.com/ws";
const FUTURES_WS_URL = "wss://contract.mexc.com/edge";

// Taxas da MEXC
const SPOT_TAKER_FEE = 0.001; // 0.1%
const FUTURES_TAKER_FEE = 0.0002; // 0.02%

// Definir schema Protobuf para MEXC Spot miniTickers
const miniTickersProto = `
syntax = "proto3";

message MiniTicker {
  string symbol = 1;
  string price = 2;
  string volume = 3;
  string high = 4;
  string low = 5;
  int64 time = 6;
}

message MiniTickers {
  repeated MiniTicker items = 1;
}

message Response {
  MiniTickers publicMiniTickers = 1;
}
`;

// Criar root do protobuf
const root = protobuf.parse(miniTickersProto).root;
const ResponseMessage = root.lookupType("Response");

interface SpotTicker {
  symbol: string;
  price: string;
  volume: string;
  high: string;
  low: string;
}

interface FuturesTicker {
  symbol: string;
  lastPrice: number;
  bid1: number;
  ask1: number;
  volume24: number;
  amount24: number;
  fairPrice: number;
  indexPrice: number;
}

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
  timestamp: string;
}

serve(async (req) => {
  // Handle WebSocket upgrade
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log("=== Client WebSocket Connected ===");

  let spotWs: WebSocket | null = null;
  let futuresWs: WebSocket | null = null;
  let spotData: Map<string, SpotTicker> = new Map();
  let futuresData: Map<string, FuturesTicker> = new Map();
  let isConnecting = false;
  let reconnectTimeout: number | null = null;

  const processAndSendOpportunities = () => {
    if (spotData.size === 0 || futuresData.size === 0) {
      console.log(`⏳ Aguardando dados - Spot: ${spotData.size}, Futures: ${futuresData.size}`);
      return;
    }

    const opportunities: Opportunity[] = [];
    let processed = 0;
    let withValidPrices = 0;

    // Processar cada par spot
    for (const [symbol, spot] of spotData.entries()) {
      processed++;
      
      // Converter símbolo spot para formato futures (ex: BTCUSDT -> BTC_USDT)
      const futuresSymbol = symbol.replace(/USDT$/, '_USDT');
      const futures = futuresData.get(futuresSymbol);

      if (!futures) continue;

      const spotBidPrice = parseFloat(spot.price);
      const spotVolume24h = parseFloat(spot.volume);
      const futuresBidPrice = futures.bid1;
      const futuresAskPrice = futures.ask1;
      const futuresVolume24h = futures.amount24;

      // Validar preços
      if (!spotBidPrice || !futuresBidPrice || !futuresAskPrice || 
          spotBidPrice <= 0 || futuresBidPrice <= 0 || futuresAskPrice <= 0) {
        continue;
      }

      withValidPrices++;

      // LONG (Entrada): Comprar Spot + Vender Futures
      // Compra spot no ask, vende futures no bid
      const entrySpotAskPrice = spotBidPrice * 1.001; // Aproximação do ask
      const entryFuturesBidPrice = futuresBidPrice;
      
      const entryCostPerUnit = entrySpotAskPrice * (1 + SPOT_TAKER_FEE);
      const entryRevenuePerUnit = entryFuturesBidPrice * (1 - FUTURES_TAKER_FEE);
      const entryProfitPerUnit = entryRevenuePerUnit - entryCostPerUnit;
      const spreadNetPercentEntrada = (entryProfitPerUnit / entryCostPerUnit) * 100;

      // SHORT (Saída): Vender Spot + Comprar Futures
      // Vende spot no bid, compra futures no ask
      const exitSpotBidPrice = spotBidPrice;
      const exitFuturesAskPrice = futuresAskPrice;
      
      const exitRevenuePerUnit = exitSpotBidPrice * (1 - SPOT_TAKER_FEE);
      const exitCostPerUnit = exitFuturesAskPrice * (1 + FUTURES_TAKER_FEE);
      const exitProfitPerUnit = exitRevenuePerUnit - exitCostPerUnit;
      const spreadNetPercentSaida = (exitProfitPerUnit / exitCostPerUnit) * 100;

      // Spread bruto e líquido (para compatibilidade)
      const spreadGrossPercent = ((futuresBidPrice - spotBidPrice) / spotBidPrice) * 100;
      const spreadNetPercent = spreadNetPercentEntrada;

      opportunities.push({
        pair_symbol: symbol,
        spot_bid_price: spotBidPrice,
        spot_volume_24h: spotVolume24h,
        futures_ask_price: futuresAskPrice,
        futures_volume_24h: futuresVolume24h,
        spread_gross_percent: spreadGrossPercent,
        spread_net_percent: spreadNetPercent,
        spread_net_percent_entrada: spreadNetPercentEntrada,
        spread_net_percent_saida: spreadNetPercentSaida,
        spot_taker_fee: SPOT_TAKER_FEE,
        futures_taker_fee: FUTURES_TAKER_FEE,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📊 Processados: ${processed} | Válidos: ${withValidPrices} | Oportunidades: ${opportunities.length}`);

    // Enviar para o cliente
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'opportunities',
        data: opportunities,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const connectSpotWebSocket = () => {
    console.log("🔌 Conectando ao WebSocket Spot da MEXC...");
    
    spotWs = new WebSocket(SPOT_WS_URL);

    spotWs.onopen = () => {
      console.log("✅ WebSocket Spot conectado!");
      
      // Subscrever ao canal de miniTickers (todos os pares)
      const subscribeMsg = {
        method: "SUBSCRIPTION",
        params: ["spot@public.miniTickers.v3.api.pb@UTC+8"]
      };
      spotWs?.send(JSON.stringify(subscribeMsg));
      console.log("📡 Subscrito ao canal de miniTickers");

      // Configurar ping para manter conexão viva
      const pingInterval = setInterval(() => {
        if (spotWs?.readyState === WebSocket.OPEN) {
          spotWs.send(JSON.stringify({ method: "PING" }));
        } else {
          clearInterval(pingInterval);
        }
      }, 20000); // Ping a cada 20 segundos
    };

    spotWs.onmessage = async (event) => {
      try {
        // Verificar se é uma mensagem texto (JSON) ou binária (Protobuf)
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          // Ignorar mensagens de confirmação e PONG
          if (data.code !== undefined || data.msg === "PONG") {
            return;
          }
          return;
        }

        // Processar dados binários (Protobuf)
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Decodificar Protobuf
          const message = ResponseMessage.decode(uint8Array);
          const data = ResponseMessage.toObject(message, {
            longs: String,
            enums: String,
            bytes: String,
          });

          // Processar miniTickers
          if (data.publicMiniTickers?.items) {
            const items = data.publicMiniTickers.items;
            items.forEach((ticker: any) => {
              if (ticker.symbol.endsWith('USDT')) {
                spotData.set(ticker.symbol, {
                  symbol: ticker.symbol,
                  price: ticker.price,
                  volume: ticker.volume,
                  high: ticker.high,
                  low: ticker.low,
                });
              }
            });
            
            console.log(`📈 Spot atualizado: ${spotData.size} pares`);
            processAndSendOpportunities();
          }
        }
      } catch (error) {
        console.error("❌ Erro ao processar mensagem Spot:", error);
      }
    };

    spotWs.onerror = (error) => {
      console.error("❌ Erro no WebSocket Spot:", error);
    };

    spotWs.onclose = () => {
      console.log("🔌 WebSocket Spot desconectado");
      spotWs = null;
      
      // Reconectar após 5 segundos
      if (!isConnecting) {
        console.log("♻️ Reconectando Spot em 5s...");
        setTimeout(connectSpotWebSocket, 5000);
      }
    };
  };

  const connectFuturesWebSocket = () => {
    console.log("🔌 Conectando ao WebSocket Futures da MEXC...");
    
    futuresWs = new WebSocket(FUTURES_WS_URL);

    futuresWs.onopen = () => {
      console.log("✅ WebSocket Futures conectado!");
      
      // Subscrever a todos os tickers
      const subscribeMsg = {
        method: "sub.tickers"
      };
      futuresWs?.send(JSON.stringify(subscribeMsg));
      console.log("📡 Subscrito ao canal de tickers (Futures)");

      // Configurar ping para manter conexão viva
      const pingInterval = setInterval(() => {
        if (futuresWs?.readyState === WebSocket.OPEN) {
          futuresWs.send(JSON.stringify({ method: "ping" }));
        } else {
          clearInterval(pingInterval);
        }
      }, 20000); // Ping a cada 20 segundos
    };

    futuresWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Ignorar mensagens de pong
        if (data.channel === "pong") {
          return;
        }

        // Processar tickers
        if (data.channel === "push.tickers" && data.data) {
          const tickers = Array.isArray(data.data) ? data.data : [data.data];
          
          tickers.forEach((ticker: any) => {
            if (ticker.symbol.endsWith('_USDT')) {
              futuresData.set(ticker.symbol, {
                symbol: ticker.symbol,
                lastPrice: ticker.lastPrice,
                bid1: ticker.bid1 || ticker.lastPrice,
                ask1: ticker.ask1 || ticker.lastPrice,
                volume24: ticker.volume24 || 0,
                amount24: ticker.amount24 || 0,
                fairPrice: ticker.fairPrice || ticker.lastPrice,
                indexPrice: ticker.indexPrice || ticker.lastPrice,
              });
            }
          });
          
          console.log(`📉 Futures atualizado: ${futuresData.size} contratos`);
          processAndSendOpportunities();
        }
      } catch (error) {
        console.error("❌ Erro ao processar mensagem Futures:", error);
      }
    };

    futuresWs.onerror = (error) => {
      console.error("❌ Erro no WebSocket Futures:", error);
    };

    futuresWs.onclose = () => {
      console.log("🔌 WebSocket Futures desconectado");
      futuresWs = null;
      
      // Reconectar após 5 segundos
      if (!isConnecting) {
        console.log("♻️ Reconectando Futures em 5s...");
        setTimeout(connectFuturesWebSocket, 5000);
      }
    };
  };

  // Conectar aos WebSockets da MEXC
  connectSpotWebSocket();
  connectFuturesWebSocket();

  // Lidar com desconexão do cliente
  socket.onclose = () => {
    console.log("🔌 Cliente desconectado");
    isConnecting = true;
    
    if (spotWs) {
      spotWs.close();
      spotWs = null;
    }
    
    if (futuresWs) {
      futuresWs.close();
      futuresWs = null;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  };

  socket.onerror = (error) => {
    console.error("❌ Erro no WebSocket do cliente:", error);
  };

  return response;
});
