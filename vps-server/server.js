/**
 * 🦈 Shark Crypto Monitor - VPS Edition
 * MEXC Arbitrage Monitor with WebSocket + Protocol Buffers
 * 
 * This version uses Edge Function API instead of direct database connection
 * for better security with Lovable Cloud.
 * 
 * Uses multiple WebSocket connections (chunked) for stability.
 */

require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');
const protobuf = require('protobufjs');
const zlib = require('zlib');
const path = require('path');

// ==============================================
// Configuration
// ==============================================

const CONFIG = {
  // Lovable Cloud API
  edgeFunctionUrl: process.env.EDGE_FUNCTION_URL || 'https://jschuymzkukzthesevoy.supabase.co/functions/v1/vps-monitor-sync',
  monitorApiKey: process.env.MONITOR_API_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzY2h1eW16a3VrenRoZXNldm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzU3NTAsImV4cCI6MjA3ODQ1MTc1MH0.ebPXVdcAJ3YLZbtB0j_8lZcvj2USBWA-QNhWSP27Ozk',
  
  // MEXC Endpoints
  mexcSpotWs: 'wss://wbs-api.mexc.com/ws',
  mexcFuturesWs: 'wss://contract.mexc.com/edge',
  mexcSpotApi: 'https://api.mexc.com/api/v3',
  mexcFuturesApi: 'https://contract.mexc.com/api/v1',
  
  // Monitor settings
  updateIntervalMs: parseInt(process.env.UPDATE_INTERVAL_MS) || 1000,
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS) || 2000,
  minVolumeUsdt: parseFloat(process.env.MIN_VOLUME_USDT) || 50000,
  crossingThreshold: parseFloat(process.env.CROSSING_THRESHOLD) || 0,
  
  // Fees
  spotTakerFee: parseFloat(process.env.SPOT_TAKER_FEE) || 0.1,
  futuresTakerFee: parseFloat(process.env.FUTURES_TAKER_FEE) || 0.02,
  
  // Reconnection
  reconnectDelayMs: 5000,
  pingIntervalMs: 30000,
  
  // Multiple connections for stability (symbols per connection)
  spotChunkSize: 20,
  futuresChunkSize: 30,
};

// ==============================================
// Data Storage
// ==============================================

const spotData = new Map();      // symbol -> { bid, ask, volume24h, timestamp }
const futuresData = new Map();   // symbol -> { bid, ask, volume24h, fundingRate, timestamp }
const opportunities = new Map(); // symbol -> full opportunity object
const lastCrossings = new Map(); // symbol -> last crossing timestamp
const pendingCrossings = [];     // Queue of crossings to send

// WebSocket connections tracking
const spotConnections = new Map();    // chunkId -> { ws, pingInterval, symbols }
const futuresConnections = new Map(); // chunkId -> { ws, pingInterval, symbols }

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
  return symbol.replace('_USDT', '').replace('USDT', '');
}

// ==============================================
// Edge Function API
// ==============================================

async function callEdgeFunction(action, data) {
  try {
    const response = await axios.post(
      CONFIG.edgeFunctionUrl,
      { action, data },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.supabaseAnonKey,
          'x-monitor-key': CONFIG.monitorApiKey,
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      log('ERROR', `Edge Function error: ${error.response.status}`, error.response.data);
    } else {
      log('ERROR', `Edge Function connection error: ${error.message}`);
    }
    return null;
  }
}

async function syncOpportunities() {
  const opportunitiesList = Array.from(opportunities.values());
  
  if (opportunitiesList.length === 0) return;
  
  const result = await callEdgeFunction('update_opportunities', opportunitiesList);
  
  if (result?.success) {
    log('DEBUG', `Sincronizadas ${opportunitiesList.length} oportunidades`);
  }
}

async function sendPendingCrossings() {
  while (pendingCrossings.length > 0) {
    const crossing = pendingCrossings.shift();
    const result = await callEdgeFunction('record_crossing', crossing);
    
    if (result?.success) {
      log('INFO', `🚀 Cruzamento enviado: ${crossing.pair_symbol} @ ${crossing.spread_net_percent_saida.toFixed(4)}%`);
    } else {
      // Put it back if failed
      pendingCrossings.unshift(crossing);
      break;
    }
  }
}

// ==============================================
// MEXC API Functions
// ==============================================

async function fetchFuturesSymbols() {
  try {
    const response = await axios.get(`${CONFIG.mexcFuturesApi}/contract/detail`);
    const contracts = response.data.data || [];
    
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
// WebSocket: MEXC Spot (Multiple Connections)
// ==============================================

async function handleSpotProtobufMessage(data) {
  try {
    const msg = PushDataV3ApiWrapper.decode(data);
    
    // Extrair símbolo
    const symbol = msg.symbol || msg.symbolId;
    if (!symbol) return;
    
    // Acessar publicLimitDepths DIRETAMENTE (estrutura real da MEXC)
    const asks = msg.publicLimitDepths?.asks;
    const bids = msg.publicLimitDepths?.bids;
    
    if (asks?.length > 0 && bids?.length > 0) {
      const askPrice = parseFloat(asks[0].price);
      const bidPrice = parseFloat(bids[0].price);
      
      if (!isNaN(askPrice) && !isNaN(bidPrice)) {
        spotData.set(symbol, {
          bid: bidPrice,
          ask: askPrice,
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    // Silently ignore parse errors
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

function connectSpotChunks(symbols) {
  const totalChunks = Math.ceil(symbols.length / CONFIG.spotChunkSize);
  log('INFO', `🔌 Iniciando ${totalChunks} conexões Spot (${symbols.length} símbolos / ${CONFIG.spotChunkSize} por conexão)`);
  
  for (let i = 0; i < symbols.length; i += CONFIG.spotChunkSize) {
    const chunk = symbols.slice(i, i + CONFIG.spotChunkSize);
    const chunkId = Math.floor(i / CONFIG.spotChunkSize);
    connectSpotChunk(chunk, chunkId);
  }
}

function connectSpotChunk(symbols, chunkId) {
  // Close existing connection if any
  const existing = spotConnections.get(chunkId);
  if (existing) {
    clearInterval(existing.pingInterval);
    if (existing.ws.readyState === WebSocket.OPEN) {
      existing.ws.close();
    }
  }
  
  const ws = new WebSocket(CONFIG.mexcSpotWs);
  
  ws.on('open', () => {
    log('INFO', `[SPOT #${chunkId + 1}] ✅ Conectado com ${symbols.length} símbolos`);
    
    // Subscribe to all symbols in this chunk
    symbols.forEach(symbol => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIPTION',
        params: [`spot@public.limit.depth.v3.api.pb@${symbol}@5`]
      }));
    });
    
    // Setup ping for this connection
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: 'PING' }));
      }
    }, CONFIG.pingIntervalMs);
    
    spotConnections.set(chunkId, { ws, pingInterval, symbols });
  });
  
  ws.on('message', async (data, isBinary) => {
    // Ignora mensagens não binárias (ACK de subscribe, PONG)
    if (!isBinary) {
      try {
        const text = data.toString();
        // Log ACKs apenas no primeiro chunk para debug
        if (chunkId === 0 && text.includes('SUBSCRIPTION')) {
          log('DEBUG', `[SPOT #1] ACK recebido`);
        }
      } catch {}
      return;
    }
    
    // Processar dados binários (protobuf)
    try {
      await handleSpotProtobufMessage(data);
    } catch (error) {
      // Ignore parse errors
    }
  });
  
  ws.on('close', () => {
    log('WARN', `[SPOT #${chunkId + 1}] ⚠️ Desconectado, reconectando chunk...`);
    const conn = spotConnections.get(chunkId);
    if (conn) clearInterval(conn.pingInterval);
    setTimeout(() => connectSpotChunk(symbols, chunkId), CONFIG.reconnectDelayMs);
  });
  
  ws.on('error', (error) => {
    log('ERROR', `[SPOT #${chunkId + 1}] Erro`, { error: error.message });
  });
}

// ==============================================
// WebSocket: MEXC Futures (Multiple Connections)
// ==============================================

function connectFuturesChunks(symbols) {
  const totalChunks = Math.ceil(symbols.length / CONFIG.futuresChunkSize);
  log('INFO', `🔌 Iniciando ${totalChunks} conexões Futures (${symbols.length} símbolos / ${CONFIG.futuresChunkSize} por conexão)`);
  
  for (let i = 0; i < symbols.length; i += CONFIG.futuresChunkSize) {
    const chunk = symbols.slice(i, i + CONFIG.futuresChunkSize);
    const chunkId = Math.floor(i / CONFIG.futuresChunkSize);
    connectFuturesChunk(chunk, chunkId);
  }
}

function connectFuturesChunk(symbols, chunkId) {
  // Close existing connection if any
  const existing = futuresConnections.get(chunkId);
  if (existing) {
    clearInterval(existing.pingInterval);
    if (existing.ws.readyState === WebSocket.OPEN) {
      existing.ws.close();
    }
  }
  
  const ws = new WebSocket(CONFIG.mexcFuturesWs);
  
  ws.on('open', () => {
    log('INFO', `[FUTURES #${chunkId + 1}] ✅ Conectado com ${symbols.length} símbolos`);
    
    // Subscribe to all symbols in this chunk
    symbols.forEach(symbol => {
      ws.send(JSON.stringify({
        method: 'sub.depth.full',
        param: {
          symbol: symbol,
          limit: 5
        }
      }));
    });
    
    // Setup ping for this connection
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, CONFIG.pingIntervalMs);
    
    futuresConnections.set(chunkId, { ws, pingInterval, symbols });
  });
  
  ws.on('message', (data) => {
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
      // Ignore
    }
  });
  
  ws.on('close', () => {
    log('WARN', `[FUTURES #${chunkId + 1}] ⚠️ Desconectado, reconectando chunk...`);
    const conn = futuresConnections.get(chunkId);
    if (conn) clearInterval(conn.pingInterval);
    setTimeout(() => connectFuturesChunk(symbols, chunkId), CONFIG.reconnectDelayMs);
  });
  
  ws.on('error', (error) => {
    log('ERROR', `[FUTURES #${chunkId + 1}] Erro`, { error: error.message });
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
  
  const spreadGrossSaida = ((spotBid - futuresAsk) / futuresAsk) * 100;
  const spreadGrossEntrada = ((futuresBid - spotAsk) / spotAsk) * 100;
  const totalFees = CONFIG.spotTakerFee + CONFIG.futuresTakerFee;
  const spreadNetSaida = spreadGrossSaida - totalFees;
  const spreadNetEntrada = spreadGrossEntrada - totalFees;
  
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
// Crossing Detection
// ==============================================

function checkCrossing(opportunity) {
  const symbol = opportunity.pair_symbol;
  const now = Date.now();
  
  const lastCrossing = lastCrossings.get(symbol);
  if (lastCrossing && (now - lastCrossing) < 5000) {
    return;
  }
  
  if (opportunity.spread_net_percent_saida > CONFIG.crossingThreshold) {
    lastCrossings.set(symbol, now);
    
    pendingCrossings.push({
      pair_symbol: symbol,
      spread_net_percent_saida: opportunity.spread_net_percent_saida
    });
  }
}

// ==============================================
// Main Processing Loop
// ==============================================

let fundingRates = {};

function processData() {
  let processedCount = 0;
  
  for (const [symbol, spot] of spotData.entries()) {
    const futuresSymbol = symbol.replace('USDT', '_USDT');
    const futures = futuresData.get(futuresSymbol);
    
    if (!futures) continue;
    
    const now = Date.now();
    if (now - spot.timestamp > 10000 || now - futures.timestamp > 10000) {
      continue;
    }
    
    const fundingRate = fundingRates[futuresSymbol] || 0;
    const opportunity = calculateArbitrage(symbol, spot, futures, fundingRate);
    
    if (opportunity) {
      opportunities.set(symbol, opportunity);
      processedCount++;
      checkCrossing(opportunity);
    }
  }
}

// ==============================================
// Initialization
// ==============================================

async function initialize() {
  log('INFO', '🦈 Shark Crypto Monitor (VPS Edition) iniciando...');
  log('INFO', `📡 Edge Function URL: ${CONFIG.edgeFunctionUrl}`);
  
  // Validate configuration
  if (!CONFIG.monitorApiKey) {
    log('ERROR', '❌ MONITOR_API_KEY é obrigatório!');
    process.exit(1);
  }
  
  // Test Edge Function connection
  log('INFO', 'Testando conexão com Edge Function...');
  const healthCheck = await callEdgeFunction('health_check', {});
  
  if (!healthCheck?.success) {
    log('ERROR', '❌ Falha ao conectar com Edge Function. Verifique MONITOR_API_KEY.');
    process.exit(1);
  }
  
  log('INFO', '✅ Conexão com Edge Function OK');
  
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
  
  // Connect WebSockets (multiple connections per market)
  const spotSymbolsToSubscribe = commonSymbols.map(s => s.replace('_USDT', 'USDT'));
  connectSpotChunks(spotSymbolsToSubscribe);
  connectFuturesChunks(commonSymbols);
  
  // Start processing loop
  setInterval(processData, CONFIG.updateIntervalMs);
  
  // Start sync loop (send to Edge Function)
  setInterval(async () => {
    await syncOpportunities();
    await sendPendingCrossings();
  }, CONFIG.syncIntervalMs);
  
  // Refresh funding rates every 5 minutes
  setInterval(async () => {
    fundingRates = await fetchFundingRates();
  }, 5 * 60 * 1000);
  
  // Log stats every minute
  setInterval(() => {
    const spotConns = spotConnections.size;
    const futuresConns = futuresConnections.size;
    log('INFO', `📊 Stats: ${spotData.size} spot, ${futuresData.size} futures, ${opportunities.size} oportunidades | Conexões: ${spotConns} spot, ${futuresConns} futures`);
  }, 60 * 1000);
  
  log('INFO', '✅ Monitor iniciado com sucesso!');
}

// ==============================================
// Graceful Shutdown
// ==============================================

function closeAllConnections() {
  // Close all spot connections
  for (const [chunkId, conn] of spotConnections.entries()) {
    clearInterval(conn.pingInterval);
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close();
    }
  }
  spotConnections.clear();
  
  // Close all futures connections
  for (const [chunkId, conn] of futuresConnections.entries()) {
    clearInterval(conn.pingInterval);
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close();
    }
  }
  futuresConnections.clear();
}

process.on('SIGINT', () => {
  log('INFO', '🛑 Encerrando monitor...');
  closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', '🛑 Encerrando monitor (SIGTERM)...');
  closeAllConnections();
  process.exit(0);
});

// Start the monitor
initialize().catch((error) => {
  log('ERROR', 'Erro fatal na inicialização', { error: error.message });
  process.exit(1);
});
