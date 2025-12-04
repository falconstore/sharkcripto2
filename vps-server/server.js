/**
 * 🦈 Shark Crypto Monitor
 * MEXC Arbitrage Monitor with WebSocket + Protocol Buffers
 * 
 * Features:
 * - Real-time spot prices via WebSocket + Protobuf
 * - Real-time futures prices via WebSocket
 * - Arbitrage spread calculation
 * - Supabase integration for data persistence
 * - Automatic reconnection
 */

require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');
const protobuf = require('protobufjs');
const zlib = require('zlib');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ==============================================
// Configuration
// ==============================================

const CONFIG = {
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // MEXC Endpoints
  mexcSpotWs: 'wss://wbs-api.mexc.com/ws',
  mexcFuturesWs: 'wss://contract.mexc.com/edge',
  mexcSpotApi: 'https://api.mexc.com/api/v3',
  mexcFuturesApi: 'https://contract.mexc.com/api/v1',
  
  // Monitor settings
  updateIntervalMs: parseInt(process.env.UPDATE_INTERVAL_MS) || 1000,
  minVolumeUsdt: parseFloat(process.env.MIN_VOLUME_USDT) || 50000,
  crossingThreshold: parseFloat(process.env.CROSSING_THRESHOLD) || 0,
  
  // Fees
  spotTakerFee: parseFloat(process.env.SPOT_TAKER_FEE) || 0.1,
  futuresTakerFee: parseFloat(process.env.FUTURES_TAKER_FEE) || 0.02,
  
  // Reconnection
  reconnectDelayMs: 5000,
  pingIntervalMs: 30000,
};

// ==============================================
// Supabase Client
// ==============================================

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ==============================================
// Data Storage
// ==============================================

const spotData = new Map();      // symbol -> { bid, ask, volume24h, timestamp }
const futuresData = new Map();   // symbol -> { bid, ask, volume24h, fundingRate, timestamp }
const opportunities = new Map(); // symbol -> full opportunity object
const lastCrossings = new Map(); // symbol -> last crossing timestamp

// ==============================================
// Protocol Buffers Setup
// ==============================================

let PushDataV3ApiWrapper;
let PublicLimitDepthsV3Api;

async function loadProtoFiles() {
  try {
    const root = await protobuf.load(path.join(__dirname, 'websocket-proto', 'PushDataV3ApiWrapper.proto'));
    PushDataV3ApiWrapper = root.lookupType('mexc.PushDataV3ApiWrapper');
    PublicLimitDepthsV3Api = root.lookupType('mexc.PublicLimitDepthsV3Api');
    console.log('✅ Protocol Buffers carregados');
    return true;
  } catch (error) {
    console.error('❌ Erro ao carregar proto files:', error.message);
    return false;
  }
}

// ==============================================
// Utility Functions
// ==============================================

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level}] ${message}${dataStr}`);
}

function decompressGzip(data) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function formatSymbol(symbol) {
  // Remove _USDT suffix for display
  return symbol.replace('_USDT', '').replace('USDT', '');
}

// ==============================================
// MEXC API Functions
// ==============================================

async function fetchFuturesSymbols() {
  try {
    const response = await axios.get(`${CONFIG.mexcFuturesApi}/contract/detail`);
    const contracts = response.data.data || [];
    
    // Filter USDT perpetual contracts
    const symbols = contracts
      .filter(c => c.quoteCoin === 'USDT' && c.state === 0)
      .map(c => c.symbol);
    
    log('INFO', `Encontrados ${symbols.length} contratos futuros USDT`);
    return symbols;
  } catch (error) {
    log('ERROR', 'Erro ao buscar símbolos futuros', { error: error.message });
    return [];
  }
}

async function fetchSpotSymbols() {
  try {
    const response = await axios.get(`${CONFIG.mexcSpotApi}/ticker/24hr`);
    const tickers = response.data || [];
    
    // Filter USDT pairs with volume
    const symbols = tickers
      .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) >= CONFIG.minVolumeUsdt)
      .map(t => t.symbol);
    
    log('INFO', `Encontrados ${symbols.length} pares spot USDT com volume > ${CONFIG.minVolumeUsdt}`);
    return symbols;
  } catch (error) {
    log('ERROR', 'Erro ao buscar símbolos spot', { error: error.message });
    return [];
  }
}

async function fetchFundingRates() {
  try {
    const response = await axios.get(`${CONFIG.mexcFuturesApi}/contract/funding_rate`);
    const rates = {};
    
    if (response.data?.data) {
      for (const item of response.data.data) {
        rates[item.symbol] = parseFloat(item.fundingRate) || 0;
      }
    }
    
    return rates;
  } catch (error) {
    log('ERROR', 'Erro ao buscar funding rates', { error: error.message });
    return {};
  }
}

// ==============================================
// WebSocket: MEXC Spot (Protocol Buffers)
// ==============================================

let spotWs = null;
let spotPingInterval = null;

function connectSpotWebSocket(symbols) {
  if (spotWs) {
    spotWs.close();
  }
  
  log('INFO', `Conectando WebSocket Spot com ${symbols.length} símbolos...`);
  
  spotWs = new WebSocket(CONFIG.mexcSpotWs);
  
  spotWs.on('open', () => {
    log('INFO', '✅ WebSocket Spot conectado');
    
    // Subscribe to each symbol using protobuf channel
    for (const symbol of symbols) {
      const subscribeMsg = {
        method: 'SUBSCRIPTION',
        params: [`spot@public.limit.depth.v3.api.pb@${symbol}@5`]
      };
      spotWs.send(JSON.stringify(subscribeMsg));
    }
    
    log('INFO', `Subscrito em ${symbols.length} símbolos spot`);
    
    // Setup ping interval
    spotPingInterval = setInterval(() => {
      if (spotWs.readyState === WebSocket.OPEN) {
        spotWs.send(JSON.stringify({ method: 'PING' }));
      }
    }, CONFIG.pingIntervalMs);
  });
  
  spotWs.on('message', async (data) => {
    try {
      // Check if it's binary (protobuf) or text (JSON)
      if (Buffer.isBuffer(data)) {
        await handleSpotProtobufMessage(data);
      } else {
        const msg = JSON.parse(data.toString());
        if (msg.msg === 'PONG') {
          // Ping response, ignore
        } else if (msg.d) {
          // Fallback JSON format
          handleSpotJsonMessage(msg);
        }
      }
    } catch (error) {
      // Ignore parse errors for now
    }
  });
  
  spotWs.on('close', () => {
    log('WARN', '⚠️ WebSocket Spot desconectado, reconectando...');
    clearInterval(spotPingInterval);
    setTimeout(() => connectSpotWebSocket(symbols), CONFIG.reconnectDelayMs);
  });
  
  spotWs.on('error', (error) => {
    log('ERROR', 'Erro WebSocket Spot', { error: error.message });
  });
}

async function handleSpotProtobufMessage(data) {
  try {
    // Try to decompress if gzipped
    let buffer = data;
    try {
      buffer = await decompressGzip(data);
    } catch {
      // Not compressed, use as is
    }
    
    // Decode protobuf
    const wrapper = PushDataV3ApiWrapper.decode(buffer);
    
    if (wrapper.data) {
      let depthData;
      try {
        depthData = await decompressGzip(wrapper.data);
      } catch {
        depthData = wrapper.data;
      }
      
      const depth = PublicLimitDepthsV3Api.decode(depthData);
      
      if (depth.bids && depth.bids.length > 0 && depth.asks && depth.asks.length > 0) {
        const symbol = wrapper.symbol || wrapper.symbolId;
        
        spotData.set(symbol, {
          bid: parseFloat(depth.bids[0].p),
          ask: parseFloat(depth.asks[0].p),
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    // Silently ignore protobuf parse errors
  }
}

function handleSpotJsonMessage(msg) {
  try {
    if (msg.c && msg.c.includes('limit.depth')) {
      const symbol = msg.s;
      const data = msg.d;
      
      if (data.bids && data.bids.length > 0 && data.asks && data.asks.length > 0) {
        spotData.set(symbol, {
          bid: parseFloat(data.bids[0].p),
          ask: parseFloat(data.asks[0].p),
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    // Ignore
  }
}

// ==============================================
// WebSocket: MEXC Futures
// ==============================================

let futuresWs = null;
let futuresPingInterval = null;

function connectFuturesWebSocket(symbols) {
  if (futuresWs) {
    futuresWs.close();
  }
  
  log('INFO', `Conectando WebSocket Futures com ${symbols.length} símbolos...`);
  
  futuresWs = new WebSocket(CONFIG.mexcFuturesWs);
  
  futuresWs.on('open', () => {
    log('INFO', '✅ WebSocket Futures conectado');
    
    // Subscribe to each symbol
    for (const symbol of symbols) {
      const subscribeMsg = {
        method: 'sub.depth.full',
        param: {
          symbol: symbol,
          limit: 5
        }
      };
      futuresWs.send(JSON.stringify(subscribeMsg));
    }
    
    log('INFO', `Subscrito em ${symbols.length} símbolos futures`);
    
    // Setup ping interval
    futuresPingInterval = setInterval(() => {
      if (futuresWs.readyState === WebSocket.OPEN) {
        futuresWs.send(JSON.stringify({ method: 'ping' }));
      }
    }, CONFIG.pingIntervalMs);
  });
  
  futuresWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.channel === 'push.depth.full') {
        const symbol = msg.symbol;
        const depthData = msg.data;
        
        if (depthData.bids && depthData.bids.length > 0 && depthData.asks && depthData.asks.length > 0) {
          futuresData.set(symbol, {
            bid: parseFloat(depthData.bids[0][0]),
            ask: parseFloat(depthData.asks[0][0]),
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      // Ignore parse errors
    }
  });
  
  futuresWs.on('close', () => {
    log('WARN', '⚠️ WebSocket Futures desconectado, reconectando...');
    clearInterval(futuresPingInterval);
    setTimeout(() => connectFuturesWebSocket(symbols), CONFIG.reconnectDelayMs);
  });
  
  futuresWs.on('error', (error) => {
    log('ERROR', 'Erro WebSocket Futures', { error: error.message });
  });
}

// ==============================================
// Arbitrage Calculation
// ==============================================

function calculateArbitrage(symbol, spot, futures, fundingRate = 0) {
  if (!spot || !futures) return null;
  
  const spotBid = spot.bid;
  const spotAsk = spot.ask;
  const futuresBid = futures.bid;
  const futuresAsk = futures.ask;
  
  if (!spotBid || !spotAsk || !futuresBid || !futuresAsk) return null;
  
  // Spread Bruto de Saída: (Spot Bid - Futures Ask) / Futures Ask
  const spreadGrossSaida = ((spotBid - futuresAsk) / futuresAsk) * 100;
  
  // Spread Bruto de Entrada: (Futures Bid - Spot Ask) / Spot Ask
  const spreadGrossEntrada = ((futuresBid - spotAsk) / spotAsk) * 100;
  
  // Total fees
  const totalFees = CONFIG.spotTakerFee + CONFIG.futuresTakerFee;
  
  // Spread Líquido (descontando taxas)
  const spreadNetSaida = spreadGrossSaida - totalFees;
  const spreadNetEntrada = spreadGrossEntrada - totalFees;
  
  // Funding rate adjustment (if applicable)
  const fundingRatePercent = fundingRate * 100;
  
  return {
    pair_symbol: formatSymbol(symbol),
    spot_bid_price: spotBid,
    spot_ask_price: spotAsk,
    futures_bid_price: futuresBid,
    futures_ask_price: futuresAsk,
    spot_volume_24h: spot.volume24h || 0,
    futures_volume_24h: futures.volume24h || 0,
    spread_gross_percent: spreadGrossEntrada,
    spread_net_percent: spreadNetEntrada,
    spread_net_percent_entrada: spreadNetEntrada,
    spread_net_percent_saida: spreadNetSaida,
    spot_taker_fee: CONFIG.spotTakerFee,
    futures_taker_fee: CONFIG.futuresTakerFee,
    funding_rate: fundingRate,
    is_active: true,
    timestamp: new Date().toISOString()
  };
}

// ==============================================
// Supabase Integration
// ==============================================

async function updateSupabase() {
  const opportunitiesList = Array.from(opportunities.values());
  
  if (opportunitiesList.length === 0) return;
  
  try {
    // Upsert opportunities
    const { error } = await supabase
      .from('arbitrage_opportunities')
      .upsert(opportunitiesList, {
        onConflict: 'pair_symbol',
        ignoreDuplicates: false
      });
    
    if (error) {
      log('ERROR', 'Erro ao atualizar Supabase', { error: error.message });
    } else {
      log('DEBUG', `Atualizadas ${opportunitiesList.length} oportunidades no Supabase`);
    }
  } catch (error) {
    log('ERROR', 'Erro de conexão Supabase', { error: error.message });
  }
}

async function recordCrossing(opportunity) {
  const symbol = opportunity.pair_symbol;
  const now = Date.now();
  
  // Check if we already recorded a crossing recently (within 5 seconds)
  const lastCrossing = lastCrossings.get(symbol);
  if (lastCrossing && (now - lastCrossing) < 5000) {
    return;
  }
  
  // Check if spread crossed the threshold
  if (opportunity.spread_net_percent_saida > CONFIG.crossingThreshold) {
    lastCrossings.set(symbol, now);
    
    try {
      const { error } = await supabase
        .from('pair_crossings')
        .insert({
          pair_symbol: symbol,
          spread_net_percent_saida: opportunity.spread_net_percent_saida,
          timestamp: new Date().toISOString()
        });
      
      if (error) {
        log('ERROR', 'Erro ao registrar cruzamento', { error: error.message });
      } else {
        log('INFO', `🚀 Cruzamento registrado: ${symbol} @ ${opportunity.spread_net_percent_saida.toFixed(4)}%`);
      }
    } catch (error) {
      log('ERROR', 'Erro de conexão ao registrar cruzamento', { error: error.message });
    }
  }
}

// ==============================================
// Main Processing Loop
// ==============================================

let fundingRates = {};

async function processData() {
  let processedCount = 0;
  
  // Process all symbols that have both spot and futures data
  for (const [symbol, spot] of spotData.entries()) {
    // Convert spot symbol (BTCUSDT) to futures symbol (BTC_USDT)
    const futuresSymbol = symbol.replace('USDT', '_USDT');
    const futures = futuresData.get(futuresSymbol);
    
    if (!futures) continue;
    
    // Check data freshness (max 10 seconds old)
    const now = Date.now();
    if (now - spot.timestamp > 10000 || now - futures.timestamp > 10000) {
      continue;
    }
    
    // Calculate arbitrage
    const fundingRate = fundingRates[futuresSymbol] || 0;
    const opportunity = calculateArbitrage(symbol, spot, futures, fundingRate);
    
    if (opportunity) {
      opportunities.set(symbol, opportunity);
      processedCount++;
      
      // Check for crossings
      await recordCrossing(opportunity);
    }
  }
  
  if (processedCount > 0) {
    await updateSupabase();
  }
}

// ==============================================
// Initialization
// ==============================================

async function initialize() {
  log('INFO', '🦈 Shark Crypto Monitor iniciando...');
  
  // Validate configuration
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    log('ERROR', '❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios!');
    process.exit(1);
  }
  
  // Load protocol buffers
  const protoLoaded = await loadProtoFiles();
  if (!protoLoaded) {
    log('WARN', '⚠️ Protocol Buffers não carregados, usando fallback JSON');
  }
  
  // Fetch initial data
  log('INFO', 'Buscando símbolos disponíveis...');
  
  const [spotSymbols, futuresSymbols] = await Promise.all([
    fetchSpotSymbols(),
    fetchFuturesSymbols()
  ]);
  
  // Find common symbols
  const spotSet = new Set(spotSymbols);
  const commonSymbols = futuresSymbols.filter(s => {
    const spotSymbol = s.replace('_USDT', 'USDT');
    return spotSet.has(spotSymbol);
  });
  
  log('INFO', `Encontrados ${commonSymbols.length} pares em comum`);
  
  if (commonSymbols.length === 0) {
    log('ERROR', '❌ Nenhum par encontrado para monitorar');
    process.exit(1);
  }
  
  // Fetch funding rates
  fundingRates = await fetchFundingRates();
  log('INFO', `Carregadas ${Object.keys(fundingRates).length} funding rates`);
  
  // Connect WebSockets
  const spotSymbolsToSubscribe = commonSymbols.map(s => s.replace('_USDT', 'USDT'));
  connectSpotWebSocket(spotSymbolsToSubscribe);
  connectFuturesWebSocket(commonSymbols);
  
  // Start processing loop
  setInterval(processData, CONFIG.updateIntervalMs);
  
  // Refresh funding rates every 5 minutes
  setInterval(async () => {
    fundingRates = await fetchFundingRates();
  }, 5 * 60 * 1000);
  
  // Log stats every minute
  setInterval(() => {
    log('INFO', `📊 Stats: ${spotData.size} spot, ${futuresData.size} futures, ${opportunities.size} oportunidades`);
  }, 60 * 1000);
  
  log('INFO', '✅ Monitor iniciado com sucesso!');
}

// ==============================================
// Graceful Shutdown
// ==============================================

process.on('SIGINT', () => {
  log('INFO', '🛑 Encerrando monitor...');
  
  if (spotWs) spotWs.close();
  if (futuresWs) futuresWs.close();
  clearInterval(spotPingInterval);
  clearInterval(futuresPingInterval);
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', '🛑 Encerrando monitor (SIGTERM)...');
  
  if (spotWs) spotWs.close();
  if (futuresWs) futuresWs.close();
  
  process.exit(0);
});

// Start the monitor
initialize().catch((error) => {
  log('ERROR', 'Erro fatal na inicialização', { error: error.message });
  process.exit(1);
});
